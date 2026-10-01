import { describe, expect, it } from 'vitest';
import adobe from '../../fixtures/value/complete/ADBE.US.json';
import hvid from '../../fixtures/value/complete/HVID.CO.json';
import japan from '../../fixtures/value/complete/6048.JP.json';
import { normalizeEodhd, refreshEodhdBalance } from '@/lib/value/normalize-eodhd';
import { deriveYears } from '@/lib/value/derive';
import { nwc } from '@/lib/value/metrics';
import { run as moat } from '@/lib/value/tests/moat';
import type { Year } from '@/lib/value/types';

describe('recorded completeness fixtures', () => {
 it('keeps Adobe return median and all plotted years finite', () => {
  const t = moat({ years: adobe.fundamentals.years as Year[], kind:'operating' });
  expect(t.metrics.roicMedian).not.toBeNull();
  expect(t.series.roic.filter(([,v])=>v!==null)).toHaveLength(10);
 });
 it('derives NWC from recorded JP current balance totals when payables are absent', () => {
  const y = {...japan.fundamentals.years.at(-1), shortTermDebt:71593000} as Year;
  expect(nwc(y)).toBe(y.currentAssets!-y.cash!-(y.currentLiabilities!-71593000));
 });
 it('derives gross profit, diluted shares, retained earnings and zero restructuring from a complete income statement', () => {
  const raw=structuredClone(adobe.raw) as any;
  const end=Object.keys(raw.Financials.Income_Statement.yearly).sort().at(-1)!;
  const inc=raw.Financials.Income_Statement.yearly[end];
  const balance=raw.Financials.Balance_Sheet.yearly[end];
  inc.grossProfit=null;inc.dilutedEPS=Number(inc.netIncome)/100;balance.commonStockSharesOutstanding=null;balance.retainedEarnings=null;
  const f=normalizeEodhd(raw,'ADBE.US').fundamentals;
  const y=deriveYears(f.years).at(-1)!;
  expect(y.grossProfit).toBe(Number(inc.totalRevenue)-Number(inc.costOfRevenue));
  expect(y.dilutedShares).toBe(100);
  expect(y.retainedEarningsChange).toBe(y.netIncome!-y.dividendsPaid!);
  expect(y.nonRecurring).toBe(0);
  expect(y.provenance?.grossProfit).toBeDefined();
 });
 it('does not turn a missing cash-flow statement into zero SBC or buybacks', () => {
  const y=deriveYears(hvid.fundamentals.years as Year[]).at(-1)!;
  expect(y.ocf).toBeNull();expect(y.sbc).toBeNull();expect(y.buybacks).toBeNull();
 });
 it('derives cash-flow addbacks, repurchases and operating income from recorded statement lines', () => {
  const raw=structuredClone(adobe.raw) as any;
  const end=Object.keys(raw.Financials.Income_Statement.yearly).sort().at(-1)!;
  const inc=raw.Financials.Income_Statement.yearly[end],cf=raw.Financials.Cash_Flow.yearly[end];
  inc.operatingIncome=null;cf.stockBasedCompensation=null;cf.shareBasedCompensation=123;cf.salePurchaseOfStock=null;cf.repurchaseOfCapitalStock=-456;
  const y=normalizeEodhd(raw,'ADBE.US').fundamentals.years.at(-1)!;
  expect(y.sbc).toBe(123);expect(y.buybacks).toBe(456);
  expect(y.operatingIncome).toBe(Number(inc.grossProfit)-Number(inc.totalOperatingExpenses));
 });
});

import sec from '../../fixtures/value/complete/adobe-companyfacts.json';
import { yearsFromCompanyFacts, yearsFromYahoo, fillYears, emptyYear } from '@/lib/value/completeness/second-sources';
import balanceRepair from '../../fixtures/value/complete/balance-reconciliation.json';
import minority from '../../fixtures/value/complete/008060-minority.json';
import auq from '../../fixtures/value/complete/AUQ-balance.json';
it('restores reported equity including share-based reserves from AuQ filed statements',()=>{
 const years=fillYears(auq.primary as Year[],auq.secondary.map(y=>({...emptyYear(y.end,y.currency),...y})) as Year[]);
 expect(years.map(y=>y.equity)).toEqual([-950568,-80884]);
 for(const y of years){
  expect(y.totalAssets).toBe(y.totalLiabilities!+y.equity!);
  expect(y.provenance?.equity.source).toContain('.pdf#page=');
 }
});
it('replaces opaque cached wrong-period values with the exact EDINET filing facts',()=>{
 const y=fillYears(balanceRepair.primary as Year[],balanceRepair.secondary as Year[])[0];
 expect(y.totalAssets).toBe(483322000000);
 expect(y.totalAssets).toBe(y.liabilitiesAndStockholdersEquity);
 expect(y.provenance?.totalAssets?.source).toContain('edinet');
});
it('repairs an inconsistent reported balance only from a complete, reconciling secondary balance',()=>{
 const primary=structuredClone(balanceRepair.primary) as Year[];
 for(const p of Object.values(primary[0].provenance??{}))p.method='reported';
 const y=fillYears(primary,balanceRepair.secondary as Year[])[0];
 expect(y.totalAssets).toBe(483322000000);
 expect(Math.abs(y.totalAssets!-y.totalLiabilities!-y.equity!-(y.minorityInterest??0))/y.totalAssets!).toBeLessThan(.01);
 const repaired=fillYears([{...y,liabilitiesAndStockholdersEquity:null}],primary)[0];
 expect(repaired.totalAssets).toBe(483322000000);
 expect(repaired.liabilitiesAndStockholdersEquity).toBeNull();
});
it('reads reported noncontrolling interests rather than inventing a balancing residual',()=>{
 const y=yearsFromYahoo(minority,'KRW','Yahoo').at(-1)!;
 expect(y.minorityInterest).toBe(863181533360);
 expect(y.provenance?.minorityInterest?.method).toBe('reported');
});
it('prefers diluted EPS over basic EPS when deriving share counts',()=>{
 const y={...adobe.fundamentals.years.at(-1),netIncome:1000,dilutedShares:null,dilutedEps:5,basicEps:10} as Year;
 expect(deriveYears([y])[0].dilutedShares).toBe(200);
});
it('SEC annual facts select restated annual periods, exclude quarters and retain source tags',()=>{
 const years=yearsFromCompanyFacts(sec,'USD','SEC Adobe');
 const y=years.find(y=>y.end==='2025-11-28')!;
 expect(y.netIncome).toBe(7130000000);
 expect(y.provenance?.netIncome.field).toBe('NetIncomeLoss');
 expect(years.every(y=>y.end.length===10)).toBe(true);
});
it('does not merge a secondary currency or a different fiscal period into an existing year',()=>{
 const primary=japan.fundamentals.years as Year[], y=primary.at(-1)!;
 expect(fillYears(primary,[{...y,currency:'USD',payables:123}]).at(-1)?.payables).toBeNull();
 expect(fillYears(primary,[{...y,end:'2024-12-31',payables:123}]).at(-1)?.payables).toBeNull();
});
it('Yahoo accepts annual observations and rejects quarterly and mismatched currencies',()=>{
 const raw={timeseries:{result:[{annualOperatingCashFlow:[{asOfDate:'2025-12-31',periodType:'12M',currencyCode:'USD',reportedValue:{raw:123}},{asOfDate:'2024-12-31',periodType:'3M',currencyCode:'USD',reportedValue:{raw:4}},{asOfDate:'2023-12-31',periodType:'12M',currencyCode:'JPY',reportedValue:{raw:999}}]}]}};
 expect(yearsFromYahoo(raw,'USD','Yahoo').map(y=>y.ocf)).toEqual([123]);
});

import { makeYears } from './synthetic';
import { runNumericTests } from '@/lib/value/tests';
it('core cash conversion decides economics without optional incremental capital or NWC',()=>{
 const t=runNumericTests({kind:'operating',years:makeYears({overrides:{receivables:null,payables:null,shortTermDebt:null,equity:null}})}).economics;
 expect(t.numeric).toBe('pass');expect(t.reasons.some(r=>r.includes('not enough'))).toBe(false);
});
it('management uses per-share earnings growth when price endpoints cannot settle the dollar test',()=>{
 const years=makeYears({overrides:(y,i)=>({marketCap:null,netIncome:100+i*20,acquisitions:null,buybacks:null})});
 const t=runNumericTests({kind:'operating',years}).management;
 expect(t.numeric).toBe('pass');expect(t.metrics.perShareValueGrowth).toBeGreaterThan(0);
});
it('missing core cash conversion remains privately undecided',()=>{
 const t=runNumericTests({kind:'operating',years:makeYears({overrides:{da:null,ocf:null,capex:null}})}).economics;
 expect(t.numeric).toBe('unclear');
});
it('seven complete annual periods can decide the quality tests',()=>{
 const tests=runNumericTests({kind:'operating',years:makeYears({n:7,overrides:(y,i)=>({netIncome:100+i*10})})});
 expect(tests.moat.numeric).toBe('pass');expect(tests.understandable.insufficientHistory).toBeUndefined();
});

import { publicAnalysis, gapWording } from '@/lib/value/public-analysis';
import { isDecided, shortHistory } from '@/lib/value/publication-eligibility';
import { buildOutput } from '@/lib/value/build-output';
import type { Analysis } from '@/lib/value/types';
function analysisFixture(n=11):Analysis {
 const tests=runNumericTests({years:makeYears({n}),kind:'operating'});
 return {id:'TEST.US',company:{id:'TEST.US',name:'Test',country:'US',exchange:'US',currency:'USD',kind:'operating',listings:['TEST.US'],marketCapUsd:1000} as any,asOf:'2026-09-30',historyCoverage:{years:n,first:2013,last:2013+n-1,source:'fixture'},status:'scored',report:{id:'TEST.US',kind:'10-K',url:null,filed:null,period:null,sections:[]},tests:Object.fromEntries(Object.entries(tests).map(([k,t])=>[k,{...t,result:t.numeric,jev:[]}])) as unknown as Analysis['tests'],valuation:null,valuationReason:'Valuation unavailable',versions:{pipeline:'12',questions:'1'}};
}
it('does not publish an unresolved core metric to any index or dossier',()=>{
 const a=analysisFixture();a.tests.economics.result='unclear';
 expect(isDecided(a)).toBe(false);
 const {files}=buildOutput({analyses:[a],holdersByTicker:{},investorNames:{},fx:{}});
 expect(Object.keys(files).some(k=>k.startsWith('dossiers/'))).toBe(false);
 expect(files['index/default.json']).toEqual([]);
});
it('short history keeps a direct-only neutral dossier without per-test gap strings',()=>{
 const a=analysisFixture(4);expect(shortHistory(a)).toBe(true);
 const {files}=buildOutput({analyses:[a],holdersByTicker:{},investorNames:{},fx:{}});
 expect(files['index/default.json']).toEqual([]);expect(files['top.json']).toEqual([]);
 const dossiers=Object.entries(files).filter(([k])=>k.startsWith('dossiers/'));
 expect(dossiers).toHaveLength(1);expect(gapWording.test(JSON.stringify(dossiers))).toBe(false);
});
it('published supporting measures omit nulls and private gap wording',()=>{
 const a=analysisFixture();a.tests.moat.metrics.grossMarginDrop=null;a.tests.moat.reasons.push('not enough data for gross margins');
 const p=publicAnalysis(a);expect('grossMarginDrop' in p.tests.moat.metrics).toBe(false);expect(gapWording.test(JSON.stringify(p))).toBe(false);
});

import { ownerEarnings } from '@/lib/value/owner-earnings';
it('uses conservative cash-flow owner earnings when depreciation detail is missing',()=>{
 const y={...adobe.fundamentals.years.at(-1),da:null,sbc:100,ocf:1000,capex:200,leaseCash:0,minorityInterest:0,totalNetIncome:null} as Year;
 expect(ownerEarnings(y)).toBe(700);
 expect(ownerEarnings({...y,ocf:null})).toBeNull();
});
it('uses recorded share-count change and average price only as a last-resort repurchase estimate',()=>{
 const ys=(adobe.fundamentals.years.slice(-2) as Year[]).map(y=>({...y,buybacks:null,statementCoverage:{cashFlow:false},averageSharePrice:100}));
 const out=deriveYears(ys), expected=Math.max(0,ys[0].dilutedShares!-ys[1].dilutedShares!)*100;
 expect(out[1].buybacks).toBe(expected);expect(out[1].provenance?.buybacks.method).toBe('estimate');
});
it('never infers a zero restructuring charge from an absent income statement',()=>{
 const y={...adobe.fundamentals.years.at(-1),revenue:null,netIncome:null,operatingIncome:null,nonRecurring:null,statementCoverage:{income:false}} as Year;
 expect(deriveYears([y])[0].nonRecurring).toBeNull();
});

import { investedCapital, roic, roiic } from '@/lib/value/metrics';
it('keeps operating intangibles in Adobe capital and adds leases only once',()=>{
 const y={...adobe.fundamentals.years.at(-1),debtIncludesLeases:false} as Year;
 expect(investedCapital(y)).toBe(y.equity!+y.totalDebt!+(y.leaseLiabilities??0)-y.cash!-y.goodwill!);
 expect(investedCapital({...y,debtIncludesLeases:true})).toBe(investedCapital(y)!-(y.leaseLiabilities??0));
 expect(roic({...y,equity:1,totalDebt:0,cash:0,goodwill:0,leaseLiabilities:0})).toBeGreaterThan(100);
 expect(roic({...y,equity:-1,totalDebt:0,cash:0,goodwill:0,leaseLiabilities:0})).toBe(1.000001);
});
it('decides nonpositive net income without inventing a cash conversion ratio',()=>{
 const tests=runNumericTests({kind:'operating',years:makeYears({overrides:{netIncome:-100,ocf:-100}})});
 expect(tests.economics.numeric).toBe('fail');expect(tests.economics.metrics.oeToNi).toBeNull();
 expect(tests.economics.metrics.ownerEarningsTotal).not.toBeNull();
});
it('SEC total debt adds short borrowing to aggregate long debt without duplicating current maturities',()=>{
 const raw=structuredClone(sec) as any, ns=raw.facts['us-gaap'];
 const fact={end:'2025-11-28',filed:'2026-01-15',form:'10-K',val:100};
 ns.LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities={units:{USD:[]}};
 ns.LongTermDebtCurrentAndNoncurrent={units:{USD:[fact]}};
 ns.ShortTermBorrowings={units:{USD:[{...fact,val:20}]}};
 ns.LongTermDebtCurrent={units:{USD:[{...fact,val:10}]}};
 const y=yearsFromCompanyFacts(raw,'USD','SEC').find(y=>y.end===fact.end)!;
 expect(y.totalDebt).toBe(120);expect(y.shortTermDebt).toBe(30);
});
it('Yahoo net business disposals are not acquisition spending',()=>{
 const raw={timeseries:{result:[{annualNetBusinessPurchaseAndSale:[{asOfDate:'2025-12-31',periodType:'12M',currencyCode:'USD',reportedValue:{raw:123}},{asOfDate:'2024-12-31',periodType:'12M',currencyCode:'USD',reportedValue:{raw:-80}}]}]}};
 expect(yearsFromYahoo(raw,'USD','Yahoo').map(y=>y.acquisitions)).toEqual([80,0]);
});
it('derives absent capital spending and acquisition proxies only from complete statements',()=>{
 const years=(adobe.fundamentals.years.slice(-2) as Year[]).map(y=>({...y,capex:null,acquisitions:null,goodwill:null,intangibles:null,statementCoverage:{cashFlow:true,balance:true}}));
 const out=deriveYears(years);
 expect(out[1].capex).toBe(0);expect(out[1].acquisitions).toBe(0);expect(out[1].acquisitionsProxy).toBe(true);
 expect(deriveYears(years.map(y=>({...y,statementCoverage:{}})))[1].capex).toBeNull();
});
it('discovers the reporting currency for a new SEC issuer from its annual facts',()=>{
 const years=yearsFromCompanyFacts(sec,'','SEC Adobe');
 expect(years.at(-1)?.currency).toBe('USD');expect(years.at(-1)?.netIncome).not.toBeNull();
});
it('discovers reporting currency independently of an uncached listing currency',()=>{
 const raw={timeseries:{result:[{annualTotalRevenue:[{asOfDate:'2025-12-31',periodType:'12M',currencyCode:'CNY',reportedValue:{raw:123}}]}]}};
 expect(yearsFromYahoo(raw,'','Yahoo').at(-1)).toMatchObject({currency:'CNY',revenue:123});
});
it('reported secondary facts replace inferred absence zeroes while preserving primary reported values',()=>{
 const raw=structuredClone(sec) as any;
 raw.facts['us-gaap'].RestructuringCharges={units:{USD:[{start:'2024-11-30',end:'2025-11-28',form:'10-K',filed:'2026-01-15',val:123}]}};
 raw.facts['us-gaap'].LongTermDebtCurrentAndNoncurrent={units:{USD:[{end:'2025-11-28',form:'10-K',filed:'2026-01-15',val:100}]}};
 const secondary=yearsFromCompanyFacts(raw,'USD','SEC Adobe');
 const original=secondary.find(y=>y.end==='2025-11-28')!;
 const primary={...original,nonRecurring:0,netIncome:456,provenance:{...original.provenance,nonRecurring:{source:'statements',field:'nonRecurring',method:'absent-in-complete-statement' as const}}};
 const merged=fillYears([primary],secondary).find(y=>y.end===primary.end)!;
 expect(merged.nonRecurring).toBe(123);expect(merged.provenance?.nonRecurring.source).toBe('SEC Adobe#2026-01-15');
 expect(merged.netIncome).toBe(456);
 const missingDebt={...primary,totalDebt:0,debtIncludesLeases:true,provenance:{...primary.provenance,totalDebt:{source:'statements',field:'totalDebt',method:'absent-in-complete-statement' as const}}};
 const debt=fillYears([missingDebt],secondary).find(y=>y.end===primary.end)!;
 expect(debt.totalDebt).toBe(original.totalDebt);expect(debt.debtIncludesLeases).toBe(false);
});
it('recomputes retained-earnings derivation after an explicit dividend replaces an inferred zero',()=>{
 const base={...adobe.fundamentals.years.at(-1),retainedEarnings:null,dividendsPaid:null,statementCoverage:{cashFlow:true}} as Year;
 const primary=deriveYears([base]);
 primary[0].provenance!.retainedEarningsChange.source='https://disclosure2.edinet-fsa.go.jp/recorded-filing';
 const secondary={...primary[0],dividendsPaid:100,provenance:{dividendsPaid:{source:'secondary filing',field:'PaymentsOfDividends',method:'reported' as const}}};
 const merged=fillYears(primary,[secondary])[0];
 expect(merged.dividendsPaid).toBe(100);expect(merged.retainedEarningsChange).toBe(merged.netIncome!-100);
});
it('decides incremental returns when recorded capital spending releases capital',()=>{
 const years=(adobe.fundamentals.years.slice(-7) as Year[]).map((y,i)=>({...y,operatingIncome:100+i*25,capex:0,da:100,receivables:100,inventory:0,payables:100,preTaxIncome:100,taxExpense:20}));
 expect(roiic(years)).toBe(1.000001);
 expect(roiic(years.map((y,i)=>({...y,operatingIncome:200-i*10})))).toBe(0);
});
it('preserves reported secondary debt and leases when cached EODHD has no such line',()=>{
 const raw=structuredClone(adobe.raw) as any;
 const end=Object.keys(raw.Financials.Balance_Sheet.yearly).sort().at(-1)!;
 const balance=raw.Financials.Balance_Sheet.yearly[end];
 for(const key of ['shortLongTermDebtTotal','longTermDebtTotal','longTermDebt','shortTermDebt','shortLongTermDebt','capitalLeaseObligations','leaseLiabilities','totalLeaseLiabilities','currentLeaseLiabilities','nonCurrentLeaseLiabilities'])balance[key]=null;
 const fresh=normalizeEodhd(raw,'ADBE.US').fundamentals.years.find(y=>y.end===end)!;
 const held={...fresh,totalDebt:123,leaseLiabilities:456,leaseDepreciationIncluded:true,debtIncludesLeases:false,provenance:{...fresh.provenance,totalDebt:{source:'SEC filing',field:'Borrowings',method:'reported' as const}}};
 const refreshed=refreshEodhdBalance(held,fresh,raw,'US');
 expect(refreshed.totalDebt).toBe(123);expect(refreshed.leaseLiabilities).toBe(456);expect(refreshed.debtIncludesLeases).toBe(false);
 expect(refreshed.leaseDepreciationIncluded).toBe(true);expect(refreshed.provenance?.totalDebt.source).toBe('SEC filing');
});
