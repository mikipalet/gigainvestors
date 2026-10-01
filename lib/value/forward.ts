import {modelReturn} from './return-model';
import { METHOD_VERSION } from './method-version';
import { bestWesternListing } from './western';
import type { Company, IndexRow, PriceMap } from './types';

export type ForwardScope = 'western' | 'all';
/** A dividend-reinvested index in a fixed, documented basis, never a rolling adjusted close. */
export interface TotalReturnLevel { value: number; basis: string }
export interface ForwardObservation {
  name: string;
  currency: string;
  quoteIdentity: Pick<Company, 'code' | 'exchange' | 'country' | 'source'>;
  price: number | null;
  priceDate: string | null;
  seed: boolean;
  /** Cumulative shares received per original share, through priceDate. */
  splitFactor: number;
  buyPrice: number | null;
  expectedReturn: number | null;
  methodVersion: string;
  totalReturn?: TotalReturnLevel;
}
export interface ForwardSnapshot {
  date: string;
  methodVersion: string;
  picks: Record<ForwardScope, string[]>;
  universe: Record<ForwardScope, string[]>;
  observations: Record<string, ForwardObservation>;
}
export interface ForwardPortfolio {
  priceReturn: number | null;
  dividendReturn: number | null;
  benchmarkPriceReturn: number | null;
  benchmarkDividendReturn: number | null;
  missingIds: string[];
}
export interface ForwardPick {
  id: string;
  name: string;
  firstDate: string;
  methodVersion: string;
  western: boolean;
  priceReturn: number | null;
  dividendReturn: number | null;
  priceDate: string | null;
}
export interface ForwardRecord {
  start: string | null;
  asOf: string | null;
  days: number;
  snapshots: number;
  all: ForwardPortfolio;
  western: ForwardPortfolio;
  picks: ForwardPick[];
}
export type ForwardSummary = Omit<ForwardRecord, 'picks'>;
const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
export function validForwardDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
}

export function buildForwardSnapshot({date, universe, rows, prices, previous = [], splitFactors = {}, totalReturns = {}}: {
  date: string; universe: Company[]; rows: IndexRow[]; prices: PriceMap;
  previous?: ForwardSnapshot[]; splitFactors?: Record<string, number>; totalReturns?: Record<string, TotalReturnLevel>;
}): ForwardSnapshot {
  if (!validForwardDate(date)) throw new Error('Invalid forward snapshot date');
  const members = new Map(universe.map(c => [c.id,c]));
  const byId = new Map(rows.map(r => [r.id,r]));
  const all = [...members.keys()].sort();
  const western = all.filter(id => bestWesternListing(members.get(id)!) !== null);
  const picks = all.filter(id => byId.get(id)?.b === true);
  // Continue marking exited benchmark members and former picks; never erase them.
  const prior = Object.assign({}, ...previous.map(s => s.observations)) as Record<string, ForwardObservation>;
  const observations: ForwardSnapshot['observations'] = {};
  for (const id of [...new Set([...all,...Object.keys(prior)])].sort()) {
    const company = members.get(id), row = byId.get(id), quote = prices[id];
    const valid = quote && positive(quote[0]) && validForwardDate(quote[1]) && quote[1] <= date;
    const price = valid ? quote[0] : null;
    const input = row?.buyReturnInputs;
    const expected = input?.model && price ? modelReturn(input.model,price) : null;
    const buyPrice = row?.v && row.m !== undefined ? row.v[1] * (1-row.m) : null;
    const totalReturn = totalReturns[id];
    observations[id] = {
      name: company?.nameEn ?? company?.name ?? prior[id].name,
      currency: company?.currency ?? prior[id].currency,
      quoteIdentity: company ? {code:company.code??id.slice(0,id.lastIndexOf('.')),exchange:company.exchange,country:company.country,source:company.source??'eodhd'} : prior[id].quoteIdentity,
      price, priceDate: valid ? quote[1] : null, seed: quote?.[2] === 'seed',
      splitFactor: splitFactors[id] ?? prior[id]?.splitFactor ?? 1,
      buyPrice: positive(buyPrice) ? buyPrice : null,
      expectedReturn: expected !== null && Number.isFinite(expected) ? expected : null,
      methodVersion: row?.methodVersion ?? METHOD_VERSION,
      ...(valid && positive(totalReturn?.value) && totalReturn.basis ? {totalReturn} : {}),
    };
  }
  return {date,methodVersion:METHOD_VERSION,picks:{all:picks,western:picks.filter(id=>western.includes(id))},universe:{all,western},observations};
}

function gain(a: ForwardObservation | undefined, b: ForwardObservation | undefined, dividends: boolean): number | null {
  if (!a || !b || a.seed || b.seed || a.currency !== b.currency || !a.priceDate || !b.priceDate || b.priceDate < a.priceDate) return null;
  if (dividends) {
    if (!positive(a.totalReturn?.value) || !positive(b.totalReturn?.value) || a.totalReturn!.basis !== b.totalReturn!.basis) return null;
    return b.totalReturn!.value / a.totalReturn!.value - 1;
  }
  if (!positive(a.price) || !positive(b.price) || !positive(a.splitFactor) || !positive(b.splitFactor)) return null;
  return b.price * b.splitFactor / (a.price * a.splitFactor) - 1;
}
function portfolio(snapshots: ForwardSnapshot[], scope: ForwardScope): ForwardPortfolio {
  let price: number | null = 1, dividends: number | null = 1, benchmark: number | null = 1, benchmarkDividends: number | null = 1;
  const holdings = new Set<string>(), missing = new Set<string>();
  const step = (wealth: number | null, ids: string[], from: ForwardSnapshot, to: ForwardSnapshot, withDividends: boolean) => {
    const gains = ids.map(id => {
      const result = gain(from.observations[id],to.observations[id],withDividends);
      if (result === null && !withDividends) missing.add(id);
      return result;
    });
    if (wealth === null || gains.some(g => g === null)) return null;
    // No selections means uninvested cash earning zero, not an invented pick.
    return wealth * (1 + (gains.length ? (gains as number[]).reduce((sum,g)=>sum+g,0)/gains.length : 0));
  };
  if (snapshots[0]) {
    const first=snapshots[0];
    price=step(price,first.picks[scope],first,first,false);
    dividends=step(dividends,first.picks[scope],first,first,true);
    benchmark=step(benchmark,first.universe[scope],first,first,false);
    benchmarkDividends=step(benchmarkDividends,first.universe[scope],first,first,true);
  }
  for (let i=1;i<snapshots.length;i++) {
    const from=snapshots[i-1], to=snapshots[i];
    from.picks[scope].forEach(id=>holdings.add(id));
    price=step(price,[...holdings],from,to,false);
    dividends=step(dividends,[...holdings],from,to,true);
    benchmark=step(benchmark,from.universe[scope],from,to,false);
    benchmarkDividends=step(benchmarkDividends,from.universe[scope],from,to,true);
  }
  const result=(wealth:number|null)=>wealth===null?null:wealth-1;
  return {priceReturn:result(price),dividendReturn:result(dividends),benchmarkPriceReturn:result(benchmark),benchmarkDividendReturn:result(benchmarkDividends),missingIds:[...missing].sort()};
}
export function computeForwardRecord(input: ForwardSnapshot[]): ForwardRecord {
  const snapshots=[...input].sort((a,b)=>a.date.localeCompare(b.date));
  if (snapshots.some(s=>!validForwardDate(s.date))) throw new Error('Invalid forward snapshot date');
  if (new Set(snapshots.map(s=>s.date)).size !== snapshots.length) throw new Error('Duplicate forward snapshot date');
  const first=snapshots[0], last=snapshots.at(-1);
  const picked=new Map<string,ForwardPick>();
  for (const snapshot of snapshots) for (const id of snapshot.picks.all) {
    if (picked.has(id)) continue;
    const start=snapshot.observations[id], end=last?.observations[id];
    picked.set(id,{id,name:start?.name??id,firstDate:snapshot.date,methodVersion:start?.methodVersion??snapshot.methodVersion,
      western:snapshot.picks.western.includes(id),priceReturn:gain(start,end,false),dividendReturn:gain(start,end,true),priceDate:end?.priceDate??null});
  }
  return {start:first?.date??null,asOf:last?.date??null,days:first&&last?(Date.parse(last.date)-Date.parse(first.date))/86400000:0,
    snapshots:snapshots.length,all:portfolio(snapshots,'all'),western:portfolio(snapshots,'western'),picks:[...picked.values()]};
}
export const forwardPercent = (value: number | null) => value === null ? 'unavailable' : `${value >= 0 ? '+' : ''}${(value*100).toFixed(1)}%`;
export function forwardHeadline(record: ForwardSummary | null | undefined, scope: ForwardScope): string | null {
  if (!record || record.days < 30) return null;
  const p=record[scope];
  return `Forward record · ${record.days} days · ${scope==='western'?'Western markets':'All markets'} · ${forwardPercent(p.priceReturn)} vs ${forwardPercent(p.benchmarkPriceReturn)} equal-weight index universe · price only`;
}
