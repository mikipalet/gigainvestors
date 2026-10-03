import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as edinet from "../../../lib/value/japan/edinet";
import japan from "../../../scripts/value/stages/japan";
import { appendJsonl, readCorpusJson, readJsonl, writeCorpusJson } from "../../../lib/value/corpus";
import type { Company, Fundamentals, ReportMeta } from "../../../lib/value/types";
import {checkIntegrity} from '../../../lib/value/integrity';
const fixture=path.resolve('tests/fixtures/value/edinet');
const data=JSON.parse(readFileSync(path.join(fixture,'documents-2025-06-18.json'),'utf8'));
const doc=edinet.annualReportDocuments(data).find(d=>d.secCode==='80580')!;
let dir:string;
beforeEach(()=>{dir=mkdtempSync(path.join(tmpdir(),'japan-stage-'));vi.stubEnv('VALUE_CORPUS_DIR',dir);vi.stubEnv('EDINET_API_KEY','offline-key');vi.stubGlobal('fetch',()=>{throw new Error('network forbidden')});vi.spyOn(console,'log').mockImplementation(()=>{});});
afterEach(()=>{rmSync(dir,{recursive:true,force:true});vi.restoreAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('writes gated fundamentals, EDINET sections and primary identity; resumes without downloads',async()=>{
  vi.spyOn(edinet,'annualReports').mockResolvedValue([doc]);
  const download=vi.spyOn(edinet,'downloadCsv').mockResolvedValue(readdirSync(path.join(fixture,'mitsubishi-csv')).map(file=>readFileSync(path.join(fixture,'mitsubishi-csv',file),'utf16le')));
  appendJsonl('universe.jsonl',{id:'MSBHF.US',code:'MSBHF',exchange:'US',country:'US',name:'Mitsubishi Corporation',currency:'USD',listings:['MSBHF.US'],source:'eodhd',marketCapUsd:1e9});
  await japan({});
  const universe=readJsonl<Company>('universe.jsonl');expect(universe).toHaveLength(1);expect(universe[0]).toMatchObject({id:'8058.JP',currency:'JPY',source:'edinet',listings:['8058.JP','MSBHF.US']});
  expect(readCorpusJson<Fundamentals>('fundamentals/8058.JP.json')?.integrity).toMatchObject({ok:false,reasons:['fewer than 7 annual periods']});
  expect(readCorpusJson<ReportMeta>('reports/8058.JP/meta.json')).toMatchObject({kind:'EDINET',filed:'2025-06-18',period:'2025-03-31'});
  download.mockRejectedValue(new Error('cached documents must not download'));
  await japan({});expect(readJsonl('universe.jsonl')).toEqual(universe);
  expect(readCorpusJson('raw/edinet/merged-listings.json')).toEqual([{from:'MSBHF.US',to:'8058.JP'}]);
});
it('does not cache API error payloads or leak the API key in errors',async()=>{
  vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({metadata:{status:'403'}})));
  await expect(edinet.listDocuments('2025-06-18')).rejects.toThrow('invalid response');
  vi.stubGlobal('fetch',async()=>{throw new Error('offline-key')});
  await expect(edinet.listDocuments('2025-06-18')).rejects.toThrow('EDINET documents.json: request failed');
});
it('retains EDINET companies and ADR aliases through a later EODHD universe refresh',async()=>{
  const { retainJapaneseCompanies } = await import('../../../lib/value/japan/companies');
  const home={id:'8058.JP',code:'8058',exchange:'JP',country:'JP',currency:'JPY',name:'三菱商事',listings:['8058.JP','MSBHF.US'],source:'edinet'} as Company;
  appendJsonl('universe.jsonl',home);
  writeCorpusJson('raw/edinet/issuers/8058.JP.json',{issuer:{company:home,englishName:'Mitsubishi Corporation'}});
  const refreshed={...home,id:'MSBHF.US',code:'MSBHF',exchange:'US',currency:'USD',name:'Mitsubishi Corporation',listings:['MSBHF.US'],source:'eodhd'} as Company;
  expect(retainJapaneseCompanies([refreshed])).toEqual([home]);
});

function summaryCsv(end: string, revenue: number): string {
  const rows = [
    ['j:CurrentFiscalYearEndDateDEI', 'FilingDateInstant', '', end],
    ['j:DescriptionOfBusinessTextBlock', 'CurrentYearDuration', '', `Business ${end}`],
    ...[0,1,2,3,4].map(offset => ['j:NetSalesSummaryOfBusinessResults', offset ? `Prior${offset}YearDuration` : 'CurrentYearDuration', 'JPY', String(revenue + offset)]),
  ];
  return ['要素ID\tコンテキストID\t単位\t値', ...rows.map(row => row.join('\t'))].join('\n');
}
it('backfills an inclusive range from daily caches, retaining newer facts and report sections on overlap and replay', async()=>{
  const older = {...doc, docID:'S100OLD', submitDateTime:'2022-06-30 09:00', periodEnd:'2022-03-31'};
  const excluded = {...doc, docID:'S100NO', docTypeCode:'130'};
  writeCorpusJson('raw/edinet/days/2022-06-29.json',{metadata:{status:'200'},results:[]});
  writeCorpusJson('raw/edinet/days/2022-06-30.json',{metadata:{status:'200'},results:[older,excluded]});
  writeCorpusJson('raw/edinet/days/2025-06-18.json',{metadata:{status:'200'},results:[doc]});
  vi.spyOn(edinet,'downloadCsv').mockImplementation(async id => {
    if (id === older.docID) return [summaryCsv('2022-03-31',200)];
    if (id === doc.docID) return [summaryCsv('2025-03-31',100)];
    throw new Error('Unexpected document');
  });
  await japan({from:'2022-06-29',to:'2022-06-30'});
  const fundamentals=readCorpusJson<Fundamentals>('fundamentals/8058.JP.json')!;
  expect(fundamentals.years.map(y=>y.fy)).toEqual([2018,2019,2020,2021,2022,2023,2024,2025]);
  expect(fundamentals.years.find(y=>y.fy===2021)?.revenue).toBe(104);
  expect(fundamentals.integrity.ok).toBe(true);
  expect(readCorpusJson<ReportMeta>('reports/8058.JP/meta.json')?.filed).toBe('2025-06-18');
  expect(readFileSync(path.join(dir,'reports/8058.JP/business.txt'),'utf8')).toBe('Business 2025-03-31');
  expect(readCorpusJson('raw/edinet/summary.json')).toMatchObject({from:'2022-06-29',to:'2022-06-30',annualReports:1});
  await japan({from:'2025-06-18',to:'2025-06-18',force:true});
  expect(readCorpusJson<Fundamentals>('fundamentals/8058.JP.json')?.years).toEqual(fundamentals.years);
  vi.spyOn(edinet,'downloadCsv').mockRejectedValue(new Error('Replay must use issuer checkpoint'));
  await japan({from:'2022-06-29',to:'2022-06-30'});
  expect(readCorpusJson<Fundamentals>('fundamentals/8058.JP.json')?.years).toEqual(fundamentals.years);
});
it.each([
  {from:'2022-02-30',to:'2022-06-30'},
  {from:'2022-07-01',to:'2022-06-30'},
  {from:'2022-01-01'},
  {to:'2022-06-30'},
])('rejects invalid or incomplete filing ranges before network access: %j',async options=>{
  await expect(japan(options)).rejects.toThrow(/range|date/i);
});

it('corroborates splits on a working copy while retaining unadjusted source years', async () => {
  vi.spyOn(edinet, 'annualReports').mockResolvedValue([doc]);
  const rows = ['要素ID\tコンテキストID\t単位\t値', 'j:CurrentFiscalYearEndDateDEI\tFilingDateInstant\t\t2025-03-31'];
  for (let offset = 0; offset < 5; offset++) {
    const context = offset ? `Prior${offset}YearDuration` : 'CurrentYearDuration';
    for (const [field, value] of [['NetIncomeLossSummaryOfBusinessResults', 200], ['NetAssetsSummaryOfBusinessResults', 1000], ['NumberOfIssuedSharesSummaryOfBusinessResults', offset < 2 ? 500 : 100]])
      rows.push(`j:${field}\t${context}\tJPY\t${value}`);
  }
  vi.spyOn(edinet, 'downloadCsv').mockResolvedValue([rows.join('\n')]);
  writeCorpusJson('prices-history/8058.JP.json', [['2023-12', 100], ['2024-01', 20]]);
  await japan({});
  const f = readCorpusJson<Fundamentals>('fundamentals/8058.JP.json')!;
  expect(f.years).toHaveLength(5);
  expect(f.years.map(y => y.dilutedShares)).toEqual([100, 100, 100, 500, 500]);
  expect(f.integrity.notes).toEqual(['split 5:1 in 2024 adjusted']);
  const working = structuredClone(f);
  checkIntegrity(working,{source:'edinet',priceHistory:[['2023-12',100],['2024-01',20]]});
  expect(working.years.map(y => y.dilutedShares)).toEqual([500, 500, 500, 500, 500]);
  const raw = readCorpusJson<{years: Fundamentals['years']}>('raw/edinet/issuers/8058.JP.json')!;
  expect(raw.years.map(y => y.dilutedShares)).toEqual([100, 100, 100, 500, 500]);
  await japan({force:true});
  expect(readCorpusJson<Fundamentals>('fundamentals/8058.JP.json')?.years).toEqual(f.years);
});
