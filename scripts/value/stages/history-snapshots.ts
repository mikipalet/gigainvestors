import { existsSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { corpusPath, readCorpusJson } from '../../../lib/value/corpus';
import { loadCompanies } from '../../../lib/value/companies';
import { createUsdRate } from '../../../lib/value/fx';
import { sameCurrency } from '../../../lib/value/currency';
import { readPrices } from '../../../lib/value/price-files';
import { readPriceHistory } from '../../../lib/value/price-history';
import { annualReportDocuments, type DocumentDay } from '../../../lib/value/japan/edinet';
import { snapshotForYear, summarizeSnapshots, HISTORY_ASSUMPTIONS, HISTORY_CAVEATS } from '../../../lib/value/snapshots';
import { writeNewJson } from '../../../lib/value/enrichment';
import type { Fundamentals, HistoryIndex, SnapshotRow, ReportMeta, PriceMap } from '../../../lib/value/types';

type RawFilings = { Financials?: Record<string,{ yearly?: Record<string,{ filing_date?: string }> }> };
export function filingDates(raw: RawFilings | null, report: ReportMeta | null, edinet: Record<string,string> = {}): Record<string,string> {
  const result = {...edinet};
  for (const table of Object.values(raw?.Financials ?? {})) for (const [period,row] of Object.entries(table.yearly ?? {})) {
    const date = row.filing_date?.slice(0,10);
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= period && (!result[period] || date < result[period])) result[period] = date;
  }
  if (report?.period && report.filed && report.filed >= report.period && (!result[report.period] || report.filed < result[report.period])) result[report.period] = report.filed;
  return result;
}
function edinetFilings(): Record<string,Record<string,string>> {
  const directory = corpusPath('raw/edinet/days');
  const results: Record<string,Record<string,string>> = {};
  if (!existsSync(directory)) return results;
  for (const file of readdirSync(directory).filter(f=>f.endsWith('.json')).sort()) {
    const day = readCorpusJson<DocumentDay>(`raw/edinet/days/${file}`);
    if (!day?.results) continue;
    for (const doc of annualReportDocuments(day)) {
      const periods = results[doc.edinetCode] ??= {};
      const date = doc.submitDateTime.slice(0,10);
      if (doc.periodEnd && date >= doc.periodEnd && (!periods[doc.periodEnd] || date < periods[doc.periodEnd])) periods[doc.periodEnd] = date;
    }
  }
  return results;
}
export function latestHistoryFiles(): Record<string,unknown> {
  const root = corpusPath('history-v7');
  if (!existsSync(root)) return {};
  for (const run of readdirSync(root).sort().reverse()) {
    if (!/^[\w-]+$/.test(run)) continue;
    const index = readCorpusJson<HistoryIndex>(`history-v7/${run}/index.json`);
    if (!index || index.scope === 'selection') continue; // index is the commit marker, written after every year.
    const files: Record<string,unknown> = {'history/index.json':index};
    for (const year of index.years) {
      if (!Number.isInteger(year) || year < 2016 || year > 9999) throw new Error('Invalid history year');
      const rows = readCorpusJson<SnapshotRow[]>(`history-v7/${run}/${year}.json`);
      if (!rows) throw new Error(`Incomplete history run ${run}`);
      files[`history/${year}.json`] = rows;
    }
    return files;
  }
  return {};
}

/** Read-only inputs. Every run gets a NEW directory; index.json marks completion. */
export default async function historySnapshots(options: { only?:string[]; limit?:number } = {}) {
  const companies = loadCompanies(options), asOf = new Date().toISOString().slice(0,10);
  const root = `history-v7/${new Date().toISOString().replace(/[^\dT]/g,'')}-${randomUUID().slice(0,8)}`;
  const bonds = readCorpusJson<Record<string,{yield:number|null}>>('bonds.json') ?? {};
  const rates: Record<string,number> = {};
  const fxDir = corpusPath('raw/eodhd/universe');
  if (existsSync(fxDir)) for (const file of readdirSync(fxDir).filter(f=>/^fx-[A-Z]{3}\.json$/.test(f))) {
    const rate = readCorpusJson<{data:Array<{close:number}>}>(`raw/eodhd/universe/${file}`)?.data?.[0]?.close;
    if (rate && Number.isFinite(rate) && rate > 0) rates[file.slice(3,6)] = rate;
  }
  const usdRate = createUsdRate({ rates }), filings = edinetFilings();
  const quotes: PriceMap = {};
  for (const prices of [readPrices(corpusPath('publish-repo/prices')),readPrices(corpusPath('prices'))]) for (const [id,quote] of Object.entries(prices)) {
    if (quote[2] !== 'seed' && quote[0]>0 && Number.isFinite(quote[0]) && quote[1] <= asOf && (!quotes[id] || quote[1] > quotes[id][1])) quotes[id] = quote;
  }
  const years: Record<number,SnapshotRow[]> = {};
  let processed=0, fundamentalsCount=0;
  const coverage = { filingDates:0, fallbackDates:0, withReturn:0, withValue:0, failed:[] as string[] };
  for (const company of companies) {
    try {
      const f = readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`);
      if (!f?.years?.length) continue;
      fundamentalsCount++;
      const prices = readPriceHistory(company.id) ?? [];
      const raw = readCorpusJson<RawFilings>(`raw/eodhd/${company.id}.json`);
      const filedByPeriod = filingDates(raw,readCorpusJson<ReportMeta>(`reports/${company.id}/meta.json`),company.edinetCode ? filings[company.edinetCode] : undefined);
      const latestMonth = [...prices].filter(([m])=>m<asOf.slice(0,7)).sort(([a],[b])=>a.localeCompare(b)).at(-1);
      const latestPrice: [number,string] | null = quotes[company.id] ? [quotes[company.id][0],quotes[company.id][1]]
        : latestMonth ? [latestMonth[1],new Date(Date.UTC(Number(latestMonth[0].slice(0,4)),Number(latestMonth[0].slice(5,7)),0)).toISOString().slice(0,10)] : null;
      for (const fy of [...new Set(f.years.map(y=>y.fy))].filter(fy=>fy>=2016 && fy<=Number(asOf.slice(0,4))).sort()) {
        const target = f.years.find(y=>y.fy===fy)!;
        const reporting = target.currency ?? f.currency;
        const from=usdRate(reporting), to=usdRate(company.currency);
        const fxRate=sameCurrency(reporting,company.currency)?1:from!==null&&to!==null?from/to:null;
        const row = snapshotForYear({company,fundamentals:f,fy,prices,latestPrice,filedByPeriod,bondYield:bonds[company.country]?.yield??bonds.US?.yield??null,fxRate,asOf});
        if (!row) continue;
        (years[fy]??=[]).push(row);
        if (filedByPeriod[target.end]) coverage.filingDates++; else coverage.fallbackDates++;
        if (row[2]!==null) coverage.withValue++;
        if (row[4]!==null) coverage.withReturn++;
      }
    } catch (error) {
      coverage.failed.push(company.id);
      console.warn(`history: skipped ${company.id}: ${error instanceof Error ? error.message : 'unreadable input'}`);
    } finally { if (++processed % 2000 === 0) console.log(`history: ${processed}/${companies.length}`); }
  }
  const index: HistoryIndex = {scope:options.only || options.limit ? 'selection' : 'universe',years:Object.keys(years).map(Number).sort((a,b)=>a-b),perYear:{},asOf,assumptions:HISTORY_ASSUMPTIONS,caveats:HISTORY_CAVEATS};
  const sizes: Record<number,{bytes:number;gzipBytes:number;returns:number}> = {};
  for (const year of index.years) {
    const rows=years[year].sort((a,b)=>a[0].localeCompare(b[0]));
    index.perYear[year]=summarizeSnapshots(rows);
    const text=JSON.stringify(rows)+'\n';
    sizes[year]={bytes:Buffer.byteLength(text),gzipBytes:gzipSync(text).byteLength,returns:rows.filter(r=>r[4]!==null).length};
    writeNewJson(`${root}/${year}.json`,rows);
  }
  const report={root,companies:companies.length,fundamentals:fundamentalsCount,coverage,sizes};
  writeNewJson(`${root}/report.json`,report);
  writeNewJson(`${root}/index.json`,index);
  console.log(`history: ${JSON.stringify({ ...report,perYear:index.perYear })}`);
  return {index,report};
}
