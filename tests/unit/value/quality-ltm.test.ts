import {describe,it,expect} from 'vitest';
import {qualityQuarters,qualityLtmAt,qualityYears} from '@/lib/value/quality-ltm';
import {runNumericTests} from '@/lib/value/tests';
import {tileMetric} from '@/lib/value/tile-metric';
import {deriveYears} from '@/lib/value/derive';
import {snapshotForQuarter} from '@/lib/value/quarterly-snapshots';
import type {Year} from '@/lib/value/types';

const annual=(fy:number):Year=>({fy,end:`${fy}-12-31`,currency:'USD',revenue:400,netIncome:40,operatingIncome:80,grossProfit:200,preTaxIncome:80,taxExpense:16,dilutedShares:10,equity:200,totalDebt:20,cash:30,goodwill:0,intangibles:0,totalAssets:300,totalLiabilities:100,ocf:60,capex:10,da:10,sbc:4,nonRecurring:0,receivables:20,inventory:10,payables:10,dividendsPaid:10,buybacks:0,issuance:0,acquisitions:0,interestExpense:0,ppe:50,currentAssets:50,currentLiabilities:20,marketCap:400});
function fixture(){
 const Financials:any={Income_Statement:{yearly:{},quarterly:{}},Balance_Sheet:{yearly:{},quarterly:{}},Cash_Flow:{yearly:{},quarterly:{}}};
 for(const end of ['2024-03-31','2024-06-30','2024-09-30','2024-12-31','2025-03-31','2025-06-30']){
  const common={currency_symbol:'USD',filing_date:new Date(Date.parse(end)+40*86400000).toISOString().slice(0,10)};
  Financials.Income_Statement.quarterly[end]={...common,totalRevenue:100,netIncome:10,operatingIncome:20,grossProfit:50,incomeBeforeTax:20,incomeTaxExpense:4,weightedAverageShsOutDil:10};
  Financials.Balance_Sheet.quarterly[end]={...common,totalStockholderEquity:250,totalAssets:350,totalLiab:100,shortLongTermDebtTotal:20,cash:30,goodWill:0,intangibleAssets:0,commonStockSharesOutstanding:10};
  Financials.Cash_Flow.quarterly[end]={...common,totalCashFromOperatingActivities:15,capitalExpenditures:-2.5,depreciation:2.5,stockBasedCompensation:1};
 }
 Financials.Income_Statement.yearly['2024-12-31']={totalRevenue:400};
 // The fiscal-end balance must reconcile to the audited stock, not four summed stocks.
 Object.assign(Financials.Balance_Sheet.quarterly['2024-12-31'],{totalStockholderEquity:200,totalAssets:300});
 return {Financials};
}
const years=()=>Array.from({length:11},(_,i)=>annual(2014+i));
describe('rolling quality LTM',()=>{
 it('sums four flows, uses the latest balance, and never inherits missing annual fields',()=>{
  const ltm=qualityLtmAt(qualityQuarters(fixture()),years(),'2025-08-31')!;
  expect(ltm).toMatchObject({end:'2025-06-30',fy:2025,revenue:400,equity:250,netIncome:40,nonRecurring:null,acquisitions:null});
  expect(ltm.provisional?.label).toBe('LTM to Jun 2025');
 });
 it('filters all statements by filing date, including a delayed balance sheet',()=>{
  const raw=fixture();raw.Financials.Balance_Sheet.quarterly['2025-06-30'].filing_date='2025-09-01';
  expect(qualityLtmAt(qualityQuarters(raw),years(),'2025-08-31')?.end).toBe('2025-03-31');
  expect(qualityLtmAt(qualityQuarters(raw),years(),'2025-09-01')?.end).toBe('2025-03-31');
 });
 it('rejects a gap, a currency mismatch, and incompatible units',()=>{
  for(const change of [(r:any)=>delete r.Financials.Income_Statement.quarterly['2024-12-31'],(r:any)=>r.Financials.Cash_Flow.quarterly['2024-12-31'].currency_symbol='JPY',(r:any)=>r.Financials.Income_Statement.quarterly['2024-12-31'].totalRevenue=100000]){
   const raw=fixture();change(raw);expect(qualityLtmAt(qualityQuarters(raw),years(),'2025-08-31')).toBeNull();
  }
 });
 it('does not reuse fiscal-year LTM after the annual report replaces it',()=>{
  expect(qualityLtmAt(qualityQuarters(fixture()),years(),'2025-03-01')).toBeNull();
  expect(qualityLtmAt(qualityQuarters(fixture()),[...years(),{...annual(2025),end:'2025-06-30'}],'2025-08-31')).toBeNull();
 });
 it('shifts only tests whose required fields exist and preserves annual inputs',()=>{
  const ys=years(),ltm=qualityLtmAt(qualityQuarters(fixture()),ys,'2025-08-31')!;
  const base=runNumericTests({years:ys,kind:'operating'});
  const result=runNumericTests({years:ys,kind:'operating',qualityLtm:ltm});
  expect(result.understandable.provisional?.end).toBe('2025-06-30');
  expect(result.understandable.series.revenue.at(-1)).toEqual([2025,400]);
  expect(result.accounting).toEqual(base.accounting);
  expect(result.management).toEqual(base.management);
  expect(ys).toEqual(years());
  expect(qualityYears(ys,ltm,'accounting','operating')).toBe(ys);
 });
 it('rejects half-year-only statements even when filler quarters are supplied',()=>{
  const raw=fixture();
  for(const y of [2023,2024]){
   raw.Financials.Income_Statement.yearly[`${y}-12-31`]={totalRevenue:400};
   for(const end of [`${y}-06-30`,`${y}-12-31`])raw.Financials.Income_Statement.quarterly[end]={...raw.Financials.Income_Statement.quarterly['2024-06-30'],totalRevenue:200};
  }
  expect(qualityQuarters(raw)).toEqual([]);
 });
 it('rejects unresolved split/share basis changes',()=>{
  const raw=fixture();raw.Financials.Income_Statement.quarterly['2025-06-30'].weightedAverageShsOutDil=100;
  expect(qualityLtmAt(qualityQuarters(raw),years(),'2025-08-31')).toBeNull();
 });
 it('reconciles even a small known split to the same adjusted annual share basis',()=>{
  const raw=fixture();raw.Financials.Income_Statement.quarterly['2025-06-30'].weightedAverageShsOutDil=11;
  const qs=qualityQuarters(raw),splits=[{date:'2025-05-01',factor:1.1}];
  expect(qualityLtmAt(qs,years(),'2025-08-31',splits)).toBeNull();
  const adjusted=years().map(y=>({...y,dilutedShares:11}));
  expect(qualityLtmAt(qs,adjusted,'2025-08-31',splits)?.dilutedShares).toBe(11);
 });
 it('can shift all five tests when every required line is actually reported',()=>{
  const ys=years(),provisional=qualityLtmAt(qualityQuarters(fixture()),ys,'2025-08-31')!.provisional;
  const ltm={...annual(2025),end:'2025-06-30',provisional};
  const tests=runNumericTests({years:ys,kind:'operating',qualityLtm:ltm});
  expect(Object.values(tests).every(t=>t.provisional?.end===ltm.end)).toBe(true);
 });
 it('keeps financial common-earnings and operating lease costs on their annual basis when quarterly fields are absent',()=>{
  const ys=years(),ltm={...annual(2025),end:'2025-06-30',provisional:qualityLtmAt(qualityQuarters(fixture()),ys,'2025-08-31')!.provisional};
  expect(qualityYears(ys.map(y=>({...y,commonNetIncome:35})),ltm,'understandable','bank')).toHaveLength(11);
  expect(qualityYears(ys.map(y=>({...y,leaseDepreciationIncluded:true,leaseLiabilities:100})),ltm,'economics','operating')).toHaveLength(11);
 });
 it('keeps economics annual when quarterly minorities require absent consolidated earnings',()=>{
  const ys=years(),ltm={...annual(2025),end:'2025-06-30',minorityInterest:100,totalNetIncome:null,provisional:qualityLtmAt(qualityQuarters(fixture()),ys,'2025-08-31')!.provisional};
  expect(qualityYears(ys,ltm,'economics','operating')).toBe(ys);
 });
 it('keeps common earnings as the bank profit chart numerator',()=>{
  const ys=years().map(y=>({...y,commonNetIncome:35}));
  const ltm={...annual(2025),end:'2025-06-30',commonNetIncome:-2,provisional:qualityLtmAt(qualityQuarters(fixture()),ys,'2025-08-31')!.provisional};
  expect(runNumericTests({years:ys,kind:'bank',qualityLtm:ltm}).understandable.series.netIncome.at(-1)).toEqual([2025,-2]);
 });
 it('never derives zero, acquisition proxies, or annual judgement into provisional rows',()=>{
  const ltm=qualityLtmAt(qualityQuarters(fixture()),years(),'2025-08-31')!;
  expect(deriveYears([...years(),ltm]).at(-1)).toEqual(ltm);
  expect(ltm.statementCoverage).toBeUndefined();expect(ltm.maintenanceCapexJudgement).toBeUndefined();
 });
 it('cash conversion charts use the test-specific window even when another test stays annual',()=>{
  const ys=years(),provisional=qualityLtmAt(qualityQuarters(fixture()),ys,'2025-08-31')!.provisional;
  const ltm={...annual(2025),end:'2025-06-30',provisional,netIncome:20};
  const t=runNumericTests({years:ys,kind:'operating',qualityLtm:ltm}).economics;
  const chart=tileMetric({...t,result:t.numeric,jev:[]},'operating',ys.map(y=>[y.fy,y.netIncome]));
  expect(chart.series.at(-1)?.[0]).toBe(2025);
  expect(chart.series.at(-1)?.[1]).toBe(t.series.ownerEarnings.at(-1)![1]!/20);
 });
 it('does not shorten an annual-only cash chart when predictable profits gains an LTM point',()=>{
  const t=runNumericTests({years:years(),kind:'operating'}).economics;
  delete t.series.netIncome; // Older frozen annual payload.
  const chart=tileMetric({...t,result:t.numeric,jev:[]},'operating',[...years().map(y=>[y.fy,y.netIncome] as [number,number|null]),[2025,40]]);
  expect(chart.series.map(([fy])=>fy)).toEqual([2020,2021,2022,2023,2024]);
 });
 it('replays the same LTM at a past cutoff and ignores later filed quarters',()=>{
  const f={id:'TEST.US',currency:'USD',years:years(),qualityQuarters:qualityQuarters(fixture()),fetchedAt:'2026-01-01',integrity:{ok:true,reasons:[]}};
  const args={fundamentals:f,company:{name:'Test company',id:'TEST.US',country:'US',currency:'USD',kind:'operating',source:'eodhd'} as any,quarter:'2025Q3',prices:[['2025-09',40]] as [string,number][],latestPrice:null,bondYield:.04,fxRate:1,asOf:'2026-10-04'};
  const result=snapshotForQuarter(args)!;
  expect(result.numeric.understandable.provisional?.end).toBe('2025-06-30');
  f.qualityQuarters.push({...f.qualityQuarters.at(-1)!,filed:'2025-10-01',year:{...f.qualityQuarters.at(-1)!.year,end:'2025-09-30',netIncome:-9999}});
  expect(snapshotForQuarter(args)!.numeric).toEqual(result.numeric);
 });
});

it('confirms LTM-only verdict changes twice and keeps the displayed numbers on the confirmed observation',()=>{
 const ys=years(),base=qualityLtmAt(qualityQuarters(fixture()),ys,'2025-08-31')!;
 const obs=(end:string,operatingIncome:number)=>({...base,end,operatingIncome,provisional:{...base.provisional!,end,label:'LTM to '+end}});
 const a=obs('2025-03-31',-200),b=obs('2025-06-30',-200),c=obs('2025-09-30',80),d=obs('2025-12-31',80);
 const run=(rows:Year[])=>runNumericTests({years:ys,kind:'operating',qualityLtm:rows.at(-1),qualityLtmHistory:rows}).understandable;
 expect(run([a]).numeric).toBe('pass');expect(run([a]).provisional).toBeUndefined();
 expect(run([a,b]).numeric).toBe('fail');expect(run([a,b]).provisional?.end).toBe(b.end);
 expect(run([a,b,c]).numeric).toBe('fail');expect(run([a,b,c]).provisional?.end).toBe(b.end);
 expect(run([a,b,c,d]).numeric).toBe('pass');expect(run([a,b,c,d]).provisional?.end).toBe(d.end);
});
