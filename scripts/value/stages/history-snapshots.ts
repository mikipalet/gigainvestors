import {refreshReturn,type ReturnPrices} from '../../../lib/value/since-return';
import {cachedQualityQuarters} from '../../../lib/value/cached-quality-quarters';
import {completeCachedSplits} from '../../../lib/value/completeness/cached-years';
import {reconcilePriceSplits} from '../../../lib/value/price-history';
import { alignHistoryShares } from '../../../lib/value/history-split-basis';
import { availableOn,eodInterims,secInterims,secAnnualFilings } from '../../../lib/value/quarterly-inputs';
import { snapshotForQuarter,QUARTER_ASSUMPTIONS } from '../../../lib/value/quarterly-snapshots';
import type { CompanyFacts } from '../../../lib/value/completeness/second-sources';
import type { JudgementRecord } from '../../../lib/value/judgement/types';
import { statfsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { existsSync,readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { loadCompanies,mergeCompany } from '../../../lib/value/companies';
import { corpusPath,readCorpusJson } from '../../../lib/value/corpus';
import { sameCurrency } from '../../../lib/value/currency';
import { writeNewJson } from '../../../lib/value/enrichment';
import { createUsdRate } from '../../../lib/value/fx';
import { annualReportDocuments,type DocumentDay } from '../../../lib/value/japan/edinet';
import { readPrices } from '../../../lib/value/price-files';
import { readPriceHistory } from '../../../lib/value/price-history';
import { HISTORY_ASSUMPTIONS,HISTORY_CAVEATS,summarizeSnapshots } from '../../../lib/value/snapshots';
import { calendarQuarters,quarterEnd } from '../../../lib/value/time-travel';
import type { Fundamentals,HistoryIndex,IndexRow,PriceMap,ReportMeta,SnapshotRow } from '../../../lib/value/types';
import { bestWesternListing } from "../../../lib/value/western";
import { westernHistory } from "../../../lib/value/western-history";

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
export function latestHistoryFiles(companies: import('../../../lib/value/types').Company[] = []): Record<string,unknown> {
  const root = corpusPath('history-v7');
  if (!existsSync(root)) return {};
  // Once quarterly history exists, an annual-only run must never downgrade it.
  const runs = readdirSync(root).sort().reverse().filter(run => /^[\w-]+$/.test(run))
    .map(run => ({run,index:readCorpusJson<HistoryIndex>(`history-v7/${run}/index.json`)}))
    .filter((entry): entry is {run:string;index:HistoryIndex} => !!entry.index && entry.index.scope !== 'selection');
  const quarterly = runs.filter(({index}) => index.quarters?.length);
  for (const {run,index} of quarterly.length ? quarterly : runs) {
    // Keep historical identities even when they are no longer eligible today.
    const returnPrices=new Map<string,ReturnPrices|undefined>();
    const filteredIndex: HistoryIndex = {...index, perYear:{},perQuarter:index.quarters?{}:undefined};
    const files: Record<string,unknown> = {'history/index.json':filteredIndex};
    for (const year of index.quarters??index.years) {
      if (!/^\d{4}(Q[1-4])?$/.test(String(year))) throw new Error('Invalid history year');
      const rows = readCorpusJson<SnapshotRow[]>(`history-v7/${run}/${year}.json`);
      if (!rows) throw new Error(`Incomplete history run ${run}`);
      const members = rows.map(row=>{
        if(!returnPrices.has(row[0]))returnPrices.set(row[0],readCorpusJson<ReturnPrices>(`history-return-prices/${row[0]}.json`)??undefined);
        return refreshReturn(row,String(year),returnPrices.get(row[0]));
      });
      files[`history/${year}.json`] = members;
      if(String(year).includes('Q')){filteredIndex.perQuarter![year]=summarizeSnapshots(members);if(String(year).endsWith('Q4')){filteredIndex.perYear[String(year).slice(0,4)]=summarizeSnapshots(members);files[`history/${String(year).slice(0,4)}.json`]=members;}}else filteredIndex.perYear[year] = summarizeSnapshots(members);
    }
    filteredIndex.asOf=new Date().toISOString().slice(0,10);
    const historyIds=[...new Set((index.quarters??index.years).flatMap(year=>(files[`history/${year}.json`] as SnapshotRow[]).map(row=>row[0])))];
    const identities=new Map(loadCompanies({only:historyIds}).map(c=>[c.id,c]));
    for(const company of companies)identities.set(company.id,mergeCompany(identities.get(company.id)??company,company));
    companies=[...identities.values()];
    files["history/index.json"] = westernHistory(filteredIndex, Object.fromEntries((index.quarters??index.years).map(year => [year, files[`history/${year}.json`] as SnapshotRow[]])), new Set(companies.filter(c=>bestWesternListing(c)!==null).map(c=>c.id)));
    const ids=new Set((index.quarters??index.years).flatMap(year=>(files[`history/${year}.json`] as SnapshotRow[]).map(row=>row[0])));
    files['history/companies.json']=companies.filter(c=>ids.has(c.id)).map(c=>({id:c.id,n:c.nameEn??c.name,nameEn:c.nameEn,nameLocal:c.nameLocal,c:c.country,s:c.sector,k:c.kind,mc:c.marketCapUsd,cur:c.currency,v:null,t:'UUUUU',g:[],h:0,st:'i',w:bestWesternListing(c),lg:c.logo??undefined,exchange:c.exchange} satisfies IndexRow));
    return files;
  }
  return {};
}

/** Read-only inputs. Every run gets a NEW directory; index.json marks completion. */
export default async function historySnapshots(options: { only?:string[]; limit?:number; memoryOnly?:boolean; asOf?:string } = {}) {
  const companies = loadCompanies(options).filter(c=>options.only||options.limit||(c.indexes===undefined||c.indexes.length)), asOf = options.asOf??new Date().toISOString().slice(0,10);
  const quarters=calendarQuarters(asOf);
  const space=statfsSync('/');if(space.bavail*space.bsize<5e9)throw Error('Disk guard: less than 5GB free');
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
  const frames: Record<string,SnapshotRow[]> = Object.fromEntries(quarters.map(q=>[q,[]]));
  const audit:Record<string,unknown>={};
  let processed=0, fundamentalsCount=0;
  const coverage = { filingDates:0, fallbackDates:0, withReturn:0, withValue:0, failed:[] as string[] };
  for (const company of companies) {
    try {
      let f = readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`);
      if (!f?.years?.length) continue;
      fundamentalsCount++;
      let prices = readCorpusJson<import('../../../lib/value/types').PriceHistory>(`prices-history-long/${company.id}.json`) ?? readPriceHistory(company.id) ?? [];
      f.splits=completeCachedSplits(company.id,f.splits,readCorpusJson);
      f=alignHistoryShares(f,prices);
      prices=reconcilePriceSplits(prices,f);
      const raw = readCorpusJson<RawFilings>(`raw/eodhd/${company.id}.json`);
      const filedByPeriod = filingDates(raw,readCorpusJson<ReportMeta>(`reports/${company.id}/meta.json`),company.edinetCode ? filings[company.edinetCode] : undefined);
      const latestMonth = [...prices].filter(([m])=>m<asOf.slice(0,7)).sort(([a],[b])=>a.localeCompare(b)).at(-1);
      const latestPrice: [number,string] | null = quotes[company.id] ? [quotes[company.id][0],quotes[company.id][1]]
        : latestMonth ? [latestMonth[1],new Date(Date.UTC(Number(latestMonth[0].slice(0,4)),Number(latestMonth[0].slice(5,7)),0)).toISOString().slice(0,10)] : null;
      f.qualityQuarters=cachedQualityQuarters(company.id,readCorpusJson);
      const interims=eodInterims(raw);
      const sec=readCorpusJson<CompanyFacts>(`raw/sec-companyfacts/${company.id}.json`);
      if(sec){const dates=secAnnualFilings(sec);for(const year of f.years){
        if(filedByPeriod[year.end]&&filedByPeriod[year.end]>year.end)continue;
        const filed=Object.entries(dates).filter(([end])=>end.slice(0,7)===year.end.slice(0,7)).map(([,date])=>date).sort()[0];
        if(filed)filedByPeriod[year.end]=filed;
      }}
      const judgement=readCorpusJson<JudgementRecord>(`judgement/${company.id}.json`);
      for (const quarter of quarters) {
        const cutoff=quarterEnd(quarter);
        const target=f.years.filter(y=>availableOn(y.end,filedByPeriod[y.end])<cutoff).sort((a,b)=>a.end.localeCompare(b.end)).at(-1);
        if(!target)continue;
        const reporting=target.currency??f.currency,from=usdRate(reporting),to=usdRate(company.currency);
        const fxRate=sameCurrency(reporting,company.currency)?1:from!==null&&to!==null?from/to:null;
        const secRows=sec?secInterims(sec,reporting,cutoff):[];
        const filedInterims=[...new Map([...interims,...secRows].map(p=>[p.end.slice(0,7),p])).values()];
        const result=snapshotForQuarter({company,fundamentals:f,quarter,prices,latestPrice,filedByPeriod,interims:filedInterims,judgement,bondYield:bonds[company.country]?.yield??null,fxRate,asOf});
        if (!result) continue;
        const {row}=result;frames[quarter].push(row);
        if (filedByPeriod[target.end]) coverage.filingDates++; else coverage.fallbackDates++;
        if (row[2]!==null) coverage.withValue++;
        if (row[4]!==null) coverage.withReturn++;
        if(['KO.US','AAPL.US','GOOGL.US','WKL.AS','7203.JP'].includes(company.id)&&['2008Q4','2016Q1','2020Q1','2022Q4'].includes(quarter))audit[`${company.id}/${quarter}`]={...result,ttm:result.ttm?{end:result.ttm.end,netIncome:result.ttm.netIncome,da:result.ttm.da,capex:result.ttm.capex,sbc:result.ttm.sbc,dilutedShares:result.ttm.dilutedShares}:null};
      }
    } catch (error) {
      coverage.failed.push(company.id);
      console.warn(`history: skipped ${company.id}: ${error instanceof Error ? error.message : 'unreadable input'}`);
    } finally { if (++processed % 100 === 0) console.log(`history: ${processed}/${companies.length}`); }
  }
  const index: HistoryIndex = {scope:options.only || options.limit ? 'selection' : 'universe',quarters,years:quarters.filter(q=>q.endsWith('Q4')).map(q=>Number(q.slice(0,4))),perYear:{},perQuarter:{},asOf,assumptions:[...QUARTER_ASSUMPTIONS,...HISTORY_ASSUMPTIONS.slice(-2)],caveats:HISTORY_CAVEATS};
  const sizes: Record<string,{bytes:number;gzipBytes:number;returns:number}> = {};
  const years:Record<number,SnapshotRow[]>={};
  for (const quarter of quarters) {
    const rows=frames[quarter].sort((a,b)=>a[0].localeCompare(b[0]));
    index.perQuarter![quarter]=summarizeSnapshots(rows);
    if(quarter.endsWith('Q4')){const year=Number(quarter.slice(0,4));years[year]=rows;index.perYear[year]=index.perQuarter![quarter];}
    const text=JSON.stringify(rows)+'\n';
    sizes[quarter]={bytes:Buffer.byteLength(text),gzipBytes:gzipSync(text).byteLength,returns:rows.filter(r=>r[4]!==null).length};
    if(!options.memoryOnly)writeNewJson(`${root}/${quarter}.json`,rows);
  }
  const report={root,companies:companies.length,fundamentals:fundamentalsCount,coverage,sizes,audit,candidateCounts:Object.fromEntries(Object.entries(frames).map(([q,rows])=>[q,rows.length]))};
  if(!options.memoryOnly)writeNewJson(`${root}/report.json`,report);
  index.western = westernHistory(index, frames, new Set(companies.filter(c=>bestWesternListing(c)!==null).map(c=>c.id))).western;
  if(!options.memoryOnly)writeNewJson(`${root}/index.json`,index);
  console.log(`history: ${JSON.stringify({root,companies:companies.length,quarters:quarters.length,coverage})}`);
  return {index,report,years,frames};
}
