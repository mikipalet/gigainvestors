import { sameCurrency } from "./currency";
import { readCorpusJson, writeCorpusJson } from "./corpus";
import { EodhdBudgetError } from "./budget";
import { eodhd } from "./eodhd";
import { createUsdRate } from "./fx";

// EODHD's GBOND symbols are not all ISO2: CH10Y is NOT the Swiss series.
// https://eodhd.com/financial-apis-blog/government-bonds-data-in-economic-api
const EODHD_BOND_CODES: Readonly<Record<string, string>> = { GB: "UK", CH: "SW", CL: "CH" };
const VERSION = 3;
export interface BondObservation {
  version: number; date: string; yield: number | null; source: string; symbol: string;
  observedAt: string | null; rawYield: number | null; median: number | null;
  secondSource: number | null; flags: string[];
}
type Row = { date: string; close: number };
// Broad validation bands, not forecasts or rate floors. Units are fractions.
// CH's tighter band catches the known 6.06% wrong-series value.
const BANDS: Readonly<Record<string, readonly [number, number]>> = {
  CH: [-.015, .04], JP: [-.01, .06], CN: [0, .08], TW: [0, .08],
  BR: [0, .25], MX: [0, .20], ZA: [0, .25], ID: [0, .20],
  EG: [0, .40], NG: [0, .40], GH: [0, .40], PK: [0, .35], AR: [0, 1],
  KE: [0, .40], UG: [0, .40], ZM: [0, .40], TZ: [0, .40], MW: [0, .40], LK: [0, .35],
};
// Emergency policy assumption, NOT a live quote: owner decision 2026-09-30,
// Swiss 10y roughly 1%. Used only if neither live data nor its median is sane.
// Reference: https://data.snb.ch/en (10y Confederation bond yield).
const DEFAULTS: Readonly<Record<string, number>> = { CH: .01 };
const pending = new Map<string, Promise<BondObservation>>();
const day = () => new Date().toISOString().slice(0, 10);
const plausible = (n: unknown, country: string): n is number => {
  const [low, high] = BANDS[country] ?? [-.015, .15];
  return typeof n === 'number' && Number.isFinite(n) && n >= low && n <= high;
};
const age = (date: string, today: string) => (Date.parse(today) - Date.parse(date)) / 86_400_000;

async function yahooTreasury(today: string): Promise<number | null> {
  try {
    const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX?range=5d&interval=1d', {
      headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const raw = await response.json();
    const meta = raw?.chart?.result?.[0]?.meta;
    if (raw?.chart?.error || typeof meta?.regularMarketTime !== 'number' || !Number.isFinite(meta.regularMarketTime)) return null;
    const days = age(new Date(meta.regularMarketTime * 1000).toISOString().slice(0, 10), today);
    const value = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice / 100 : null;
    return days >= 0 && days <= 7 && plausible(value, 'US') ? value : null;
  } catch { return null; }
}

/** ECB monthly ten-year convergence series. Never substitute another country's
 * rate; accept only the latest completed month within a two-month release lag. */
export function parseEcbYield(csv:string,country:string,today:string):{yield:number;observedAt:string}|null {
 const rows=csv.trim().split(/\r?\n/).map(line=>line.match(/(?:"[^"]*(?:""[^"]*)*"|[^,]+|(?<=,)(?=,))/g)?.map(s=>s.replace(/^"|"$/g,''))??[]);
 const header=rows.shift()??[],at=(r:string[],key:string)=>r[header.indexOf(key)];
 const candidates=rows.flatMap(r=>{
  if(at(r,'KEY')!==`IRS.M.${country}.L.L40.CI.0000.EUR.N.Z`||at(r,'FREQ')!=='M'||at(r,'REF_AREA')!==country||at(r,'MATURITY_CAT')!=='CI'||at(r,'CURRENCY_TRANS')!=='EUR'||at(r,'UNIT')!=='PC'||at(r,'UNIT_MULT')!=='0')return [];
  const period=at(r,'TIME_PERIOD');if(!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(period))return [];
  const end=new Date(Date.UTC(Number(period.slice(0,4)),Number(period.slice(5,7)),0)).toISOString().slice(0,10);
  const value=Number(at(r,'OBS_VALUE'))/100;
  return age(end,today)>=0&&age(end,today)<=62&&plausible(value,country)?[{yield:value,observedAt:end}]:[];
 });
 return candidates.sort((a,b)=>b.observedAt.localeCompare(a.observedAt))[0]??null;
}
async function ecbYield(country:string,today:string){
 if(country!=='IE')return null;
 try{
  const r=await fetch(`https://data-api.ecb.europa.eu/service/data/IRS/M.${country}.L.L40.CI.0000.EUR.N.Z?lastNObservations=3&format=csvdata`,{signal:AbortSignal.timeout(15000)});
  return r.ok?parseEcbYield(await r.text(),country,today):null;
 }catch{return null;}
}

/** Daily per-country files avoid read/modify/write races between analysis workers. */
export async function bondObservation(country: string): Promise<BondObservation> {
  if (!/^[A-Z]{2}$/.test(country)) throw new Error('Invalid bond country');
  const date = day(), file = `bonds/${country}.json`;
  const cached = readCorpusJson<BondObservation>(file);
  if (cached && ((cached.version===VERSION&&cached.date===date) || process.env.VALUE_NO_EODHD==='1'&&cached.version>=2&&(cached.yield===null||plausible(cached.yield,country)))) return cached;
  const key = `${process.env.VALUE_CORPUS_DIR ?? ''}:${date}:${country}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    const symbol = `${EODHD_BOND_CODES[country] ?? country}10Y.GBOND`;
    const flags: string[] = [];
    if (EODHD_BOND_CODES[country]) flags.push(`symbol-map:${country}->${EODHD_BOND_CODES[country]}`);
    let rows: Row[] = [];
    try {
      const from = new Date(Date.parse(date) - 30 * 86_400_000).toISOString().slice(0, 10);
      const raw = await eodhd<unknown>(`eod/${symbol}`, { from, to: date, order: 'd' });
      if (Array.isArray(raw)) rows = raw.filter((r): r is Row => r && typeof r.date === 'string'
        && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && age(r.date, date) >= 0 && age(r.date, date) <= 30
        && typeof r.close === 'number' && Number.isFinite(r.close)).sort((a,b)=>b.date.localeCompare(a.date));
    } catch (error) {
      if (error instanceof EodhdBudgetError) throw error;
      flags.push('eodhd-unavailable');
    }
    const latest = rows[0], rawYield = latest ? latest.close / 100 : null;
    const values = [...new Map(rows.map(r=>[r.date, r.close / 100])).values()].sort((a,b)=>a-b);
    const middle = Math.floor(values.length / 2);
    const median = values.length >= 5 ? (values[middle] + values[Math.floor((values.length - 1) / 2)]) / 2 : null;
    const fresh = latest && age(latest.date, date) <= 7;
    if (!fresh) flags.push('missing-or-stale-series');
    if (!plausible(rawYield, country)) flags.push('outside-plausible-band');
    if (median === null) flags.push('insufficient-median-history');
    // A 1pp absolute move or >50% relative move (whichever is larger) is suspicious.
    const spike = median !== null && rawYield !== null && Math.abs(rawYield - median) > Math.max(.01, Math.abs(median) * .5);
    if (spike) flags.push('median-outlier');
    let value = fresh && plausible(rawYield, country) && !spike ? rawYield : null;
    let source = 'EODHD latest';
    if (value === null && fresh && plausible(median, country)) { value = median; source = 'EODHD 30-day median'; }
    const secondSource = country === 'US' ? await yahooTreasury(date) : null;
    if (country === 'US') {
      if (secondSource === null) flags.push('second-source-unavailable');
      else if (value === null || Math.abs(value - secondSource) > .005) {
        flags.push('second-source-disagreement'); value = secondSource; source = 'Yahoo ^TNX';
      } else flags.push('second-source-confirmed');
    }
    const official=value===null?await ecbYield(country,date):null;
    if(official){value=official.yield;source='ECB monthly 10-year convergence yield';flags.push('official-monthly-fallback');}
    if (value === null && DEFAULTS[country] !== undefined) {
      value = DEFAULTS[country]; source = 'country default (2026-09-30)'; flags.push('country-default');
    }
    if (value === null) { source = 'unavailable'; flags.push('no-local-yield'); }
    const result: BondObservation = { version: VERSION, date, yield: value, source, symbol,
      observedAt: source === 'EODHD latest' || source === 'EODHD 30-day median' ? latest?.date ?? null : official?.observedAt ?? null,
      rawYield, median, secondSource, flags };
    writeCorpusJson(file, result);
    if (flags.some(f=>!f.startsWith('symbol-map:') && f !== 'second-source-confirmed')) console.warn(`yields: ${country} ${JSON.stringify(result)}`);
    return result;
  })();
  pending.set(key, request);
  try { return await request; } finally { pending.delete(key); }
}

export async function bondYield(country: string): Promise<number | null> {
  return /^[A-Z]{2}$/.test(country) ? (await bondObservation(country)).yield : null;
}

export async function tradingRate({ reporting, trading, usdRate = createUsdRate() }: { reporting: string; trading: string; usdRate?: ReturnType<typeof createUsdRate> }): Promise<number | null> {
  if (sameCurrency(reporting, trading)) return 1;
  const [from, to] = await Promise.all([usdRate(reporting), usdRate(trading)]);
  return from === null || to === null ? null : from / to;
}
