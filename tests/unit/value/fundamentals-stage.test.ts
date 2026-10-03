import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { appendJsonl, readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { callsUsedToday, eodhd, getFundamentals } from "../../../lib/value/eodhd";
import stage, { orderFundamentals, needsMemberFundamentals, MEMBER_FRESHNESS_MS } from "../../../scripts/value/stages/fundamentals";
import { fetchYahooFundamentals, normalizeYahooFundamentals } from "../../../lib/value/fundamentals-yahoo";
import { readFileSync } from "node:fs";
import type { Company } from "../../../lib/value/types";

vi.mock("../../../lib/value/eodhd", () => ({ callsUsedToday: vi.fn(), getFundamentals: vi.fn(), eodhd: vi.fn() }));
vi.mock("../../../lib/value/fundamentals-yahoo", async importOriginal => ({...await importOriginal<typeof import("../../../lib/value/fundamentals-yahoo")>(), fetchYahooFundamentals: vi.fn()}));
let directory: string;
beforeEach(() => {
  const root = join(homedir(), "value-corpus");
  mkdirSync(root, { recursive: true });
  directory = mkdtempSync(join(root, "fundamentals-fixes-test-"));
  vi.stubEnv("VALUE_CORPUS_DIR", directory);
  vi.mocked(callsUsedToday).mockResolvedValue(100);
  vi.mocked(getFundamentals).mockResolvedValue({});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { rmSync(directory, { recursive: true, force: true }); vi.resetAllMocks(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it("orders never-fetched companies in universe order, then oldest fetchedAt, stably", () => {
  const companies = ["NEW-LARGE", "RECENT", "OLD", "NEW-SMALL", "OLD-TIE"].map((id) => ({ id }) as Company);
  const fetched = new Map([["RECENT", "2026-09-28T00:00:00Z"], ["OLD", "2026-09-01T00:00:00Z"], ["OLD-TIE", "2026-09-01T00:00:00Z"]]);
  expect(orderFundamentals(companies, fetched).map((c) => c.id)).toEqual(["NEW-LARGE", "NEW-SMALL", "OLD", "OLD-TIE", "RECENT"]);
  expect(companies[1].id).toBe("RECENT");
});

it("preserves known metadata and bank kind when patches are null or undefined", async () => {
  appendJsonl("universe.jsonl", { id: "BANK.US", kind: "operating", isin: "universe-isin", currency: "USD" });
  const known = { isin: "known-isin", cik: "known-cik", lei: "known-lei", description: "known description", kind: "bank", marketCapUsd: 50 };
  writeCorpusJson("companies/BANK.US.json", known);
  vi.mocked(getFundamentals).mockResolvedValue({ General: { ISIN: null, CIK: null, LEI: undefined, Description: null, Sector: null } });
  await stage({});
  expect(readCorpusJson("companies/BANK.US.json")).toMatchObject(known);
});

it("refreshes cap in USD without using PrimaryTicker or changing listing identity", async () => {
  appendJsonl("universe.jsonl", { id: "TEST.AS", currency: "EUR", listings: ["TEST.AS"], marketCapUsd: 1 });
  vi.mocked(getFundamentals).mockResolvedValue({ General: { CurrencyCode: "EUR", PrimaryTicker: "OTHER.US" }, Highlights: { MarketCapitalization: 100 } });
  vi.mocked(eodhd).mockResolvedValue([{ close: 1.2 }]);
  await stage({});
  expect(readCorpusJson("companies/TEST.AS.json")).toMatchObject({ id: "TEST.AS", listings: ["TEST.AS"], marketCapUsd: 120 });
  expect(eodhd).toHaveBeenCalledWith("eod/EURUSD.FOREX", { order: "d", limit: "1" });
});

it("applies limit after rolling ordering and refetches recent companies", async () => {
  for (const id of ["RECENT.US", "OLD.US", "NEW.US"]) appendJsonl("universe.jsonl", { id });
  writeCorpusJson("fundamentals/RECENT.US.json", { fetchedAt: "2026-09-29T00:00:00Z" });
  writeCorpusJson("fundamentals/OLD.US.json", { fetchedAt: "2026-09-01T00:00:00Z" });
  await stage({ limit: 2 });
  expect(vi.mocked(getFundamentals).mock.calls.map(([id]) => id)).toEqual(["NEW.US", "OLD.US"]);
  await stage({ only: ["RECENT.US"], force: true });
  expect(getFundamentals).toHaveBeenLastCalledWith("RECENT.US");
});

it("counts ten calls locally and stops at the daily budget", async () => {
  for (const id of ["A.US", "B.US", "C.US"]) appendJsonl("universe.jsonl", { id });
  vi.mocked(callsUsedToday).mockResolvedValue(99_990);
  await stage({});
  expect(getFundamentals).toHaveBeenCalledTimes(1);
  expect(callsUsedToday).toHaveBeenCalledTimes(1);
  expect(console.log).toHaveBeenCalledWith("daily EODHD budget reached, resume tomorrow");
});

it("resyncs usage after 200 companies and obeys the updated budget", async () => {
  for (let i = 0; i < 201; i++) appendJsonl("universe.jsonl", { id: `TEST${i}.US` });
  vi.mocked(callsUsedToday).mockResolvedValueOnce(100).mockResolvedValueOnce(100_000);
  await stage({});
  expect(getFundamentals).toHaveBeenCalledTimes(200);
  expect(callsUsedToday).toHaveBeenCalledTimes(2);
});

it('puts overdue index members ahead of fresh members and Western nonmembers, including supplemental identities', async () => {
  for (const id of ['BIG.US', 'FRESH.US', 'OLD.US']) appendJsonl('universe.jsonl', {id, name:id, code:id.split('.')[0], exchange:'US', listings:[id], marketCapUsd:100});
  writeCorpusJson('index-membership/latest.json', {memberships:{'NEW.HK':['Hang Seng'],'OLD.US':['S&P 500'],'FRESH.US':['S&P 500']}, supplementalCompanies:[{id:'NEW.HK',name:'New',code:'NEW',exchange:'HK',listings:['NEW.HK'],marketCapUsd:1,source:'eodhd'}]});
  writeCorpusJson('fundamentals/FRESH.US.json', {fetchedAt:new Date().toISOString(),years:[{}]});
  writeCorpusJson('fundamentals/OLD.US.json', {fetchedAt:'2020-01-01',years:[{}]});
  await stage({membersFirst:true,limit:2});
  expect(vi.mocked(getFundamentals).mock.calls.map(([id])=>id)).toEqual(['NEW.HK','OLD.US']);
});

it('continues the member backlog after a failed company', async () => {
  for (const id of ['BAD.US','GOOD.US']) appendJsonl('universe.jsonl', {id});
  writeCorpusJson('index-membership/latest.json',{memberships:{'BAD.US':['S&P 500'],'GOOD.US':['S&P 500']}});
  vi.mocked(getFundamentals).mockRejectedValueOnce(new Error('EODHD HTTP 404')).mockResolvedValueOnce({});
  await stage({membersFirst:true});
  expect(getFundamentals).toHaveBeenLastCalledWith('GOOD.US');
});
it('refreshes missing native-source index members without refreshing fresh native filings',async()=>{
 for(const id of ['MISSING.MI','FRESH.MI'])appendJsonl('universe.jsonl',{id,source:'esef'});
 writeCorpusJson('index-membership/latest.json',{memberships:{'MISSING.MI':['FTSE MIB'],'FRESH.MI':['FTSE MIB']}});
 writeCorpusJson('fundamentals/FRESH.MI.json',{fetchedAt:new Date().toISOString(),years:[{}]});
 await stage({membersFirst:true});
 expect(vi.mocked(getFundamentals).mock.calls.map(([id])=>id)).toEqual(['MISSING.MI']);
});
it('treats missing dates and empty financials as due and uses a strict 90-day boundary',()=>{
 const now=Date.now();
 expect(needsMemberFundamentals(null,now)).toBe(true);
 expect(needsMemberFundamentals({fetchedAt:'invalid',years:[{}] as never},now)).toBe(true);
 expect(needsMemberFundamentals({fetchedAt:new Date(now).toISOString(),years:[]},now)).toBe(true);
 expect(needsMemberFundamentals({fetchedAt:new Date(now-MEMBER_FRESHNESS_MS).toISOString(),years:[{}] as never},now)).toBe(false);
 expect(needsMemberFundamentals({fetchedAt:new Date(now-MEMBER_FRESHNESS_MS-1).toISOString(),years:[{}] as never},now)).toBe(true);
});

it.each(['RELIANCE.NSE','RELIANCE.NZ'])('stores Yahoo annual fallback for %s with source evidence',async id=>{
 const company={id,code:'RELIANCE',exchange:id.split('.')[1],country:'IN',currency:'INR',source:'eodhd',marketCapUsd:100};
 appendJsonl('universe.jsonl',company);
 vi.mocked(getFundamentals).mockRejectedValue(new Error('EODHD HTTP 404'));
 const raw=JSON.parse(readFileSync('tests/fixtures/value/ops/yahoo-reliance-annual.json','utf8'));
 for(const s of raw.timeseries.result)s.meta.symbol=[id.endsWith('.NSE')?'RELIANCE.NS':id];
 vi.mocked(fetchYahooFundamentals).mockResolvedValue(raw);
 await stage({});
 expect(readCorpusJson(`fundamentals/${id}.json`)).toMatchObject({id,currency:'INR',integrity:{ok:false}});
 expect(readCorpusJson(`raw/yahoo-fundamentals/${id}.json`)).toEqual(raw);
 expect(readCorpusJson(`raw/eodhd/${id}.json`)).toBeNull();
 expect(readCorpusJson(`companies/${id}.json`)).toMatchObject({marketCapUsd:100});
 if(id.endsWith('.NSE'))expect(getFundamentals).not.toHaveBeenCalled();
});
it('does not turn provider authentication failures into Yahoo fallback',async()=>{
 appendJsonl('universe.jsonl',{id:'BAD.US'});
 vi.mocked(getFundamentals).mockRejectedValue(new Error('EODHD HTTP 401'));
 await stage({});expect(fetchYahooFundamentals).not.toHaveBeenCalled();
 expect(readCorpusJson('fundamentals/BAD.US.json')).toBeNull();
});
it('preserves official India history when a routine Yahoo refresh returns only four years',async()=>{
 const company={id:'RELIANCE.NSE',code:'RELIANCE',exchange:'NSE',country:'IN',currency:'INR',source:'eodhd',marketCapUsd:100} as Company;
 appendJsonl('universe.jsonl',company);
 const raw=JSON.parse(readFileSync('tests/fixtures/value/ops/yahoo-reliance-annual.json','utf8'));
 const prior=normalizeYahooFundamentals(raw,company);
 const oldest=prior.years[0];
 prior.years=[...Array.from({length:oldest.fy-2014},(_,i)=>({...oldest,fy:2014+i,end:`${2014+i}-03-31`})),...prior.years].map(y=>({...y,goodwill:999,provenance:{...y.provenance,revenue:{source:'https://nsearchives.nseindia.com/corporate/xbrl/recorded.xml',field:'RevenueFromOperations',method:'reported' as const}}}));
 writeCorpusJson('fundamentals/RELIANCE.NSE.json',prior);
 vi.mocked(fetchYahooFundamentals).mockResolvedValue(raw);
 await stage({only:['RELIANCE.NSE'],force:true});
 const saved=readCorpusJson<typeof prior>('fundamentals/RELIANCE.NSE.json')!;
 expect(saved.years[0].fy).toBe(2014);
 expect(saved.years.every(y=>y.goodwill===999)).toBe(true);
 expect(saved.integrity.ok).toBe(true);
});

it.each(['LULU.US','BCP.LS'])('retains same-period prior facts and immutable provenance on a lossy %s refresh', async id => {
  appendJsonl('universe.jsonl',{id,exchange:id.split('.')[1],currency:'USD',marketCapUsd:100});
  const prior={id,currency:'USD',fetchedAt:'2026-09-01',integrity:{ok:true,reasons:[]},splits:[{date:'2020-01-01',factor:2}],years:[
    {fy:2023,end:'2023-12-31',currency:'USD',netIncome:20,ocf:30},
    {fy:2024,end:'2024-12-31',currency:'USD',netIncome:30,ocf:40,dividendsPaid:5,provenance:{ocf:{source:'https://issuer.example/annual-2024',field:'cash from operations',method:'reported'}}},
  ]};
  writeCorpusJson(`fundamentals/${id}.json`,prior);
  vi.mocked(getFundamentals).mockResolvedValue({Financials:{
    Income_Statement:{yearly:{'2024-12-31':{currency_symbol:'USD',netIncome:31}}},
    Cash_Flow:{yearly:{'2024-12-31':{totalCashFromOperatingActivities:null,dividendsPaid:0}}},
  }});
  await stage({only:[id]});
  const saved=readCorpusJson<any>(`fundamentals/${id}.json`)!;
  expect(saved.years.some((y: any) => y.end === prior.years[0].end)).toBe(true);
  const y=saved.years.find((y: any) => y.end === prior.years[1].end);
  expect(y).toMatchObject({netIncome:31,ocf:40,dividendsPaid:0});
  expect(y.provenance.ocf).toMatchObject({...prior.years[1].provenance!.ocf,retainedFrom:{fetchedAt:prior.fetchedAt}});
  expect(readCorpusJson(y.provenance.ocf.retainedFrom.snapshot)).toEqual(prior);
  expect(saved.splits).toEqual(prior.splits);
});

it('rejects an incompatible reporting currency refresh before replacing source records',async()=>{
  appendJsonl('universe.jsonl',{id:'FX.US',currency:'USD',marketCapUsd:100});
  const prior={id:'FX.US',currency:'USD',years:[{fy:2024,end:'2024-12-31',currency:'USD',netIncome:10}],fetchedAt:'2026-09-01'};
  writeCorpusJson('fundamentals/FX.US.json',prior);
  writeCorpusJson('raw/eodhd/FX.US.json',{original:true});
  vi.mocked(getFundamentals).mockResolvedValue({Financials:{Income_Statement:{yearly:{'2024-12-31':{currency_symbol:'EUR',netIncome:9}}}}});
  await stage({only:['FX.US']});
  expect(readCorpusJson('fundamentals/FX.US.json')).toEqual(prior);
  expect(readCorpusJson('raw/eodhd/FX.US.json')).toEqual({original:true});
});

it('retains an existing company history when a refresh returns no statements',async()=>{
  appendJsonl('universe.jsonl',{id:'EMPTY.US',currency:'USD',marketCapUsd:100});
  const prior={id:'EMPTY.US',currency:'USD',years:[{fy:2024,end:'2024-12-31',currency:'USD',netIncome:10}],fetchedAt:'2026-09-01'};
  writeCorpusJson('fundamentals/EMPTY.US.json',prior);
  await stage({only:['EMPTY.US']});
  expect(readCorpusJson<any>('fundamentals/EMPTY.US.json')!.years[0]).toMatchObject(prior.years[0]);
});
it('stores retained source history even when a refreshed share jump fails integrity',async()=>{
 const id='JUMP.US';appendJsonl('universe.jsonl',{id,currency:'USD',marketCapUsd:100});
 const years=Array.from({length:8},(_,i)=>({fy:2017+i,end:`${2017+i}-12-31`,currency:'USD',netIncome:10,totalAssets:100,equity:50,dilutedShares:10,ocf:20}));
 writeCorpusJson(`fundamentals/${id}.json`,{id,currency:'USD',fetchedAt:'2026-09-01',years,integrity:{ok:true,reasons:[]}});
 vi.mocked(getFundamentals).mockResolvedValue({Financials:{Income_Statement:{yearly:{'2024-12-31':{currency_symbol:'USD',netIncome:10,weightedAverageShsOutDil:1000}}}}});
 await stage({only:[id]});
 const saved=readCorpusJson<any>(`fundamentals/${id}.json`);
 expect(saved.years).toHaveLength(8);expect(saved.years[0].ocf).toBe(20);
 expect(saved.integrity.ok).toBe(false);
});
