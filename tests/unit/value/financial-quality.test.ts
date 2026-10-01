import { expect, it } from 'vitest';
import { runNumericTests } from '@/lib/value/tests';
import { normalizeEodhd } from '@/lib/value/normalize-eodhd';
import type { Year } from '@/lib/value/types';
const years = (): Year[] => Array.from({length:11},(_,i)=>({fy:2000+i,end:`${2000+i}-12-31`,equity:100*1.1**i,goodwill:0,intangibles:0,netIncome:15*1.1**i,dividendsPaid:6*1.1**i,dilutedShares:10,totalAssets:1000,ocf:-100,operatingIncome:null,capex:null,revenue:null} as Year));
const run=(ys=years(),kind:'bank'|'insurer'='bank')=>runNumericTests({years:ys,kind});
it('judges a bank on profitable earnings, tangible returns and book compounding despite negative operating cash flow',()=>{
 const t=run(); expect(Object.values(t).map(t=>t.numeric)).toEqual(['pass','pass','pass','pass','pass']);
 expect(t.economics.metrics.bookReturnCagr).toBeGreaterThan(.1);
 expect(t.understandable.metrics.positiveIncomeYears).toBe(10);
});
it('allows one weak return year but rejects two',()=>{
 const ys=years();ys[2].netIncome=0;expect(run(ys).moat.numeric).toBe('pass');
 ys[3].netIncome=0;expect(run(ys).moat.numeric).toBe('fail');expect(run(ys).understandable.numeric).toBe('fail');
});
it('rejects destroyed tangible capital instead of calling its return unlimited',()=>{
 const ys=years();ys[10].goodwill=10000;expect(run(ys).moat.numeric).toBe('fail');
});
it('does not manufacture ten-year growth from a nine-year interval or missing dividends',()=>{
 expect(run(years().slice(1)).economics.numeric).toBe('unclear');
 const ys=years();ys[2].dividendsPaid=null;expect(run(ys).economics.numeric).toBe('unclear');
});
it('rejects ordinary dilution and reports crisis recapitalisations separately',()=>{
 const ys=years().map((y,i)=>({...y,dilutedShares:10*1.04**i}));expect(run(ys).management.numeric).toBe('fail');
});
it('uses reported underwriting results, efficiency and accounting warnings when present',()=>{
 const ys=years().map(y=>({...y,combinedRatio:1.05,efficiencyRatio:.7,restated:true}));
 expect(run(ys,'insurer').moat.numeric).toBe('fail');expect(run(ys).moat.numeric).toBe('fail');expect(run(ys).accounting.numeric).toBe('fail');
});
it('rejects persistent excess loan growth and peer credit losses',()=>{
 const ys=years().map((y,i)=>({...y,loans:100*1.2**i,deposits:100*1.04**i,creditLossProvision:5*1.2**i,peerCreditLossRate:.01}));
 expect(run(ys).accounting.numeric).toBe('fail');
});
it('normalizes common capital and optional sector lines without turning absent lines into zero',()=>{
 const {fundamentals:f}=normalizeEodhd({Financials:{Income_Statement:{yearly:{'2020-12-31':{netIncome:20,netIncomeApplicableToCommonShares:18,provisionForLoanLosses:3}}},Balance_Sheet:{yearly:{'2020-12-31':{totalStockholderEquity:100,preferredStockTotalEquity:10,totalDeposits:500}}}}},'X.US');
 expect(f.years[0]).toMatchObject({commonNetIncome:18,preferredEquity:10,deposits:500,creditLossProvision:3});
 expect(f.years[0].combinedRatio).toBeNull();
});

it('selects annual SEC facts in the reporting currency and before the historical cutoff', async()=>{
 const {supplementFinancialFacts}=await import('@/lib/value/financial-facts');
 const y={...years()[10],currency:'USD'};
 const f={facts:{'us-gaap':{Deposits:{units:{USD:[{end:y.end,val:500,filed:'2011-02-20',form:'10-K'},{end:y.end,val:999,filed:'2012-02-20',form:'10-K'}],EUR:[{end:y.end,val:9999,filed:'2011-02-20',form:'10-K'}]}},ProvisionForLoanAndLeaseLosses:{units:{USD:[{start:'2010-10-01',end:y.end,val:999,filed:'2011-02-20',form:'10-K'},{start:'2010-01-01',end:y.end,val:5,filed:'2011-02-20',form:'10-K'}]}}}}};
 expect(supplementFinancialFacts([y],f,'2011-03-01')[0]).toMatchObject({deposits:500,creditLossProvision:5});
});
it('counts insolvent historical years as weak returns and cannot hide them as missing observations',()=>{
 const ys=years();ys[2].goodwill=1000;ys[3].goodwill=1000;expect(run(ys).moat.numeric).toBe('fail');
});
it('uses the life-insurer ROE bar and does not impose the bank worst-year bar',()=>{
 const ys=years();ys[2].netIncome=-1;ys[3].netIncome=-1;
 expect(run(ys,'insurer').understandable.numeric).toBe('pass');expect(run(ys,'insurer').moat.numeric).toBe('pass');
});
it('uses P&C tangible-return fallback until incomplete underwriting data can decide the question',()=>{
 const ys=years().map((y,i)=>({...y,combinedRatio:i<7?.95:i===7?1.01:null}));
 const t=runNumericTests({years:ys,kind:'insurer',industry:'Insurance - Property & Casualty'});
 expect(t.moat.numeric).toBe('pass');expect(t.moat.reasons.join(' ')).toContain('core fallback');
});
it('excludes the issuer from same-country same-industry peer medians',async()=>{
 const {withFinancialPeers}=await import('@/lib/value/financial-facts');
 const rows=Array.from({length:6},(_,i)=>({company:{id:String(i),country:'US',industry:'Regional'},years:[{...years()[10],loans:100,creditLossProvision:i===0?100:1}]}));
 const result=withFinancialPeers(rows);expect(result[0].years[0].peerCreditLossRate).toBe(.01);
 expect(withFinancialPeers(rows.slice(1))[0].years[0].peerCreditLossRate).toBeUndefined();
});
it('keeps nonbanks out and recognizes deposit-taking capital-markets firms', async()=>{
 const {kindFor}=await import('@/lib/value/universe');
 expect(kindFor({id:'MCO.US',sector:'Financial Services',industry:'Financial Data & Stock Exchanges'})).toBe('operating');
 expect(kindFor({sector:'Financial Services',industry:'Insurance Brokers'})).toBe('operating');
 expect(kindFor({sector:'Financial Services',industry:'Capital Markets',lending:{receivables:0,totalAssets:1000,deposits:50}})).toBe('bank');
});
it('exposes financial evidence with correct chart units while retaining the question keys',async()=>{
 const {tileMetric,tileSentence}=await import('@/lib/value/tile-metric');
 const ts=run();const outcome={...ts.economics,result:ts.economics.numeric,jev:[]};
 const m=tileMetric(outcome,'bank');expect(m.id).toBe('bookReturnCagr');expect(m.series[0][1]).toBeCloseTo(.166);
 expect(tileSentence(outcome,m,'bank')).toContain('Book value plus dividends');
 expect(tileMetric({...ts.understandable,result:'pass',jev:[]},'bank').chartFormat).toBe('money');
 expect(tileMetric({...ts.management,result:'pass',jev:[]},'bank').chartFormat).toBe('index');
});
it('does not treat a normal banking charter as contradicting understandable earnings',async()=>{
 const {combine}=await import('@/lib/value/jev/combine');
 const jev=[{q:'government_dependence',kind:'noul' as const,value:1,probability:1,trusted:true,label:'Licence',section:'description' as const,evidence:null}];
 expect(combine({numeric:'pass',jev,kind:'bank'})).toBe('pass');expect(combine({numeric:'pass',jev,kind:'operating'})).toBe('unclear');
});

import historical from '../../fixtures/value/financial-quality.json';
it.each(historical)('replays real restated statement prefixes: $id $date',r=>{
 const input=r.financialInputs;
 const tests=runNumericTests({years:input.years as Year[],kind:input.kind as 'bank'|'insurer',industry:input.industry});
 expect(Object.values(tests).map(t=>t.numeric[0].toUpperCase()).join('')).toBe(r.t5);
});
