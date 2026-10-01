import { expect, it } from 'vitest';
import type {Year} from '@/lib/value/types';
import { run as management } from '@/lib/value/tests/management';
import { outcome, accruals } from '@/lib/value/metrics';
import { runNumericTests } from '@/lib/value/tests';
import { emptyYear, fillYears, yearsFromCompanyFacts } from '@/lib/value/completeness/second-sources';
import { normalizeEodhd } from '@/lib/value/normalize-eodhd';
import { checkIntegrity } from '@/lib/value/integrity';
import { navHistory } from '@/lib/value/investment-nav';

const years = ():Year[] => Array.from({length:11},(_,i)=>({...emptyYear(`${2015+i}-12-31`,'USD'),
 revenue:100+i*10, operatingIncome:30+i*3, netIncome:20+i*2, equity:-20,
 totalDebt:100, cash:10, goodwill:0,intangibles:0,totalAssets:200, dilutedShares:10,
 ocf:30+i*3,capex:5,da:5,ppe:20,dividendsPaid:0,buybacks:0,sbc:0,
}));
it('reads annual foreign-issuer statements furnished on Form 6-K without admitting interim reports',()=>{
 const facts={facts:{ifrs:{ProfitLoss:{units:{DKK:[
  {start:'2021-01-01',end:'2021-12-31',val:300,form:'6-K',fp:'FY'},
  {start:'2022-01-01',end:'2022-06-30',val:120,form:'6-K',fp:'Q2'},
 ]}},Assets:{units:{DKK:[
  {end:'2021-12-31',val:1000,form:'6-K',fp:'FY'},
  {end:'2022-06-30',val:1100,form:'6-K',fp:'Q2'},
 ]}}}}};
 const ys=yearsFromCompanyFacts(facts,'','https://data.sec.gov/test');
 expect(ys).toHaveLength(1);expect(ys[0]).toMatchObject({end:'2021-12-31',currency:'DKK',netIncome:300,totalAssets:1000});
});
it('coalesces corroborated duplicate fiscal periods already present in a cached source',()=>{
 const p={...emptyYear('2025-12-31','USD'),netIncome:100};
 const s={...emptyYear('2026-01-03','USD'),fy:2025,netIncome:100,ocf:120,capex:10};
 const result=fillYears([p,s],[]);
 expect(result).toHaveLength(1);expect(result[0].ocf).toBe(120);
 expect(fillYears([p,{...s,netIncome:999}],[])).toHaveLength(2);
});

it('uses the longest available consecutive per-share window ending in the latest year',()=>{
 const ys=years();ys[0].dilutedShares=null;
 const t=management({years:ys,kind:'operating'});
 expect(t.numeric).toBe('pass');expect(t.metrics.perShareStart).toBeCloseTo(2.4);
});
it('does not skip an interior missing per-share observation to claim a growth window',()=>{
 const ys=years();ys[6].dilutedShares=null;
 expect(management({years:ys,kind:'operating'}).numeric).toBe('unclear');
});
it('informational text cannot change numeric decisions',()=>{
 for(const reasons of [[],['informational','Common-capital detail unavailable (parent-total proxy)']]){
  expect(outcome({key:'management',metrics:{},series:{},checks:[{core:true,pass:true,data:'growth',reason:'decline'}],reasons}).numeric).toBe('pass');
 }
});
it('evaluates cash conversion and asset-based accruals with negative equity',()=>{
 const ys=years(),t=runNumericTests({years:ys,kind:'operating'});
 expect(t.economics.numeric).toBe('pass');expect(t.accounting.numeric).toBe('pass');
 expect(accruals(ys.at(-1)!)).toBeCloseTo(-.1);
});
it('matches an actual week-based annual cash-flow date to the provider month-end date',()=>{
 const p={...emptyYear('2025-08-31','USD'),netIncome:100};
 const s={...emptyYear('2025-08-30','USD'),netIncome:100,ocf:130,capex:30};
 expect(fillYears([p],[s])).toHaveLength(1);
 expect(fillYears([p],[s])[0].ocf).toBe(130);
});
it('does not combine annual statements with conflicting income when dates differ',()=>{
 const p={...emptyYear('2025-08-31','USD'),netIncome:100};
 const s={...emptyYear('2025-08-30','USD'),netIncome:200,ocf:130};
 expect(fillYears([p],[s])[0].ocf).toBeNull();
});
it('uses explicitly reported EBIT when operating income is absent',()=>{
 const raw={Financials:{Income_Statement:{yearly:{'2025-12-31':{totalRevenue:100,ebit:20}}}}};
 const y=normalizeEodhd(raw,'X.US').fundamentals.years[0];
 expect(y.operatingIncome).toBe(20);expect(y.provenance?.operatingIncome?.inputs).toContain('ebit');
});
it('keeps consecutive 52/53-week annual reports crossing New Year',()=>{
 const ys=['2018-12-29','2019-12-28','2021-01-02','2022-01-01','2022-12-31','2023-12-30','2024-12-28','2026-01-03'].map(end=>emptyYear(end,'USD'));
 const f={id:'X.US',currency:'USD',years:ys,integrity:{ok:true,reasons:[]},fetchedAt:''};
 expect(checkIntegrity(f).ok).toBe(true);
 expect(f.years.map(y=>y.fy)).toEqual([2018,2019,2020,2021,2022,2023,2024,2025]);
});
it('derives EBIT from pretax profit and reported interest expense',()=>{
 const fact=(val:number)=>({units:{USD:[{start:'2021-01-01',end:'2021-12-31',form:'10-K',val}]}});
 const raw={facts:{'us-gaap':{Revenues:fact(100),IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest:fact(20),InterestExpense:fact(5)}}};
 const y=yearsFromCompanyFacts(raw,'USD','https://data.sec.gov/test')[0];
 expect(y.operatingIncome).toBe(25);
 expect(y.provenance?.operatingIncome?.inputs).toContain('interestExpense');
});
it('decides financial parent totals over seven complete annual reports and reports the actual interval',()=>{
 const ys=years().slice(-7).map((y,i)=>({...y,equity:100*1.1**i,netIncome:15*1.1**i,dividendsPaid:6*1.1**i}));
 const t=runNumericTests({years:ys,kind:'bank'});
 expect(Object.values(t).map(t=>t.numeric)).toEqual(['pass','pass','pass','pass','pass']);
 expect(t.economics.metrics.bookReturnYears).toBe(6);
});
it('uses an explicitly declared zero dividend without inventing cash distributions',()=>{
 const ys:Year[]=years().map((y,i)=>({...y,equity:100+i*20,dividendsPaid:null,dividendsPerShare:0}));
 const result=runNumericTests({years:ys,kind:'insurer'});
 expect(result.economics.numeric).not.toBe('unclear');
 expect(result.management.numeric).not.toBe('unclear');
 expect(ys.every(y=>y.dividendsPaid===null)).toBe(true);
 ys.at(-1)!.dividendsPerShare=null;
 expect(runNumericTests({years:ys,kind:'insurer'}).economics.numeric).toBe('unclear');
});
it('annualizes seven reported NAV periods over six actual intervals, retaining the return cap',()=>{
 const ys=years().slice(-7).map((y,i)=>({...y,navPerShare:100*1.1**i,dividendsPerShare:0}));
 expect(navHistory(ys)?.uncappedCagr).toBeCloseTo(.1);
 expect(navHistory(ys.slice(1))).toBeNull();
});

it('uses consolidated cash conversion when parent allocation is undefined in a loss year',()=>{
 const ys=years().map(y=>({...y,equity:100,minorityInterest:50,totalNetIncome:30,netIncome:-10,ocf:40}));
 const t=runNumericTests({years:ys,kind:'operating'}).economics;
 expect(t.numeric).toBe('pass');expect(t.metrics.consolidatedCashConversion).toBe(1);
 expect(runNumericTests({years:ys.map(y=>({...y,ocf:null})),kind:'operating'}).economics.numeric).toBe('unclear');
});
it('restores historical EPS restated for a later corroborated split without erasing normal share changes',()=>{
 const ys=years().map((y,i)=>({...y,equity:100,netIncome:20+i,dilutedShares:i<6?10:60,dilutedEps:(20+i)/(i<6?10:60)}));
 const f={id:'X.JP',currency:'JPY',years:ys,integrity:{ok:true,reasons:[]},fetchedAt:''};
 expect(checkIntegrity(f,{source:'edinet',priceHistory:[['2025-03',600],['2025-04',100]]}).ok).toBe(true);
 expect(f.years).toHaveLength(11);expect(f.years[0].dilutedShares).toBe(60);expect(f.years[0].dilutedEps).toBeCloseTo(20/60);
 const noEvidence={...f,years:ys};checkIntegrity(noEvidence,{source:'edinet'});expect(noEvidence.years.length).toBeLessThan(7);
});
it('a sufficient observed failure is decisive even if another core observation is missing',()=>{
 expect(outcome({key:'economics',metrics:{},series:{},checks:[{core:true,pass:false,reason:'failed',data:'measured'},{core:true,pass:null,reason:'unknown',data:'missing'}]}).numeric).toBe('fail');
 expect(outcome({key:'accounting',metrics:{},series:{},minFailures:2,checks:[{core:true,pass:false,reason:'failed',data:'measured'},{core:true,pass:null,reason:'unknown',data:'missing'}]}).numeric).toBe('unclear');
});
it('uses a reported later split factor while preserving simultaneous dilution',()=>{
 const ys=years().map((y,i)=>({...y,equity:100,netIncome:20+i,dilutedShares:i<6?10:164.7,basicEps:(20+i)/(i<6?10:164.7)}));
 const f={id:'X.JP',currency:'JPY',years:ys,integrity:{ok:true,reasons:[]},fetchedAt:'',splits:[{date:'2025-01-22',factor:15}]};
 expect(checkIntegrity(f,{source:'edinet'}).ok).toBe(true);
 expect(f.years[0].dilutedShares).toBe(150);expect(f.years.at(-1)?.dilutedShares).toBe(164.7);
});
it('uses the dated balance share count when the calendar share series is off by orders of magnitude',()=>{
 const raw={Financials:{Income_Statement:{yearly:{'2021-03-31':{netIncome:100}}},Balance_Sheet:{yearly:{'2021-03-31':{commonStockSharesOutstanding:290000000}}}},outstandingShares:{annual:{a:{date:'2021',shares:352200}}}};
 const y=normalizeEodhd(raw,'X.LSE').fundamentals.years[0];expect(y.dilutedShares).toBe(290000000);
 expect(y.provenance?.dilutedShares?.field).toContain('commonStockSharesOutstanding');
});
it('does not replace an ordinary share count with a much smaller par-value balance field',()=>{
 const raw={Financials:{Income_Statement:{yearly:{'2025-12-31':{netIncome:73000000}}},Balance_Sheet:{yearly:{'2025-12-31':{commonStockSharesOutstanding:3614000}}}},outstandingShares:{annual:{a:{date:'2025',shares:432164000}}}};
 expect(normalizeEodhd(raw,'X.LSE').fundamentals.years[0].dilutedShares).toBe(432164000);
});
it('can prove the return hurdle on all paid capital without inventing an undisclosed goodwill amount',()=>{
 const ys=years().map(y=>({...y,equity:100,totalDebt:20,goodwill:null,operatingIncome:60}));
 const t=runNumericTests({years:ys,kind:'operating'}).moat;
 expect(t.numeric).toBe('pass');expect(t.metrics.returnFloorMedian).toBeCloseTo(.395);
 expect(ys[0].goodwill).toBeNull();
 expect(runNumericTests({years:ys.map(y=>({...y,operatingIncome:1})),kind:'operating'}).moat.numeric).toBe('unclear');
});
it('does not call fewer than five measured return observations a failed median',()=>{
 const ys=years().map((y,i)=>({...y,operatingIncome:i<7?null:1,preTaxIncome:null,interestExpense:null}));
 expect(runNumericTests({years:ys,kind:'operating'}).moat.numeric).toBe('unclear');
});

it('preserves reported share-count proxies through repeated derivation',()=>{
 const raw={Financials:{Income_Statement:{yearly:{'2021-12-31':{netIncome:100,basicEPS:1}}},Balance_Sheet:{yearly:{'2021-12-31':{commonStockSharesOutstanding:98}}}}};
 const y=normalizeEodhd(raw,'X.US').fundamentals.years[0];
 expect(fillYears([y],[])[0].dilutedShares).toBe(98);
});
it('retains documented recapitalization dilution and fails cancelled common capital',()=>{
 const ys=years().map((y,i)=>({...y,equity:100,dilutedShares:i<7?10:1000}));
 const f={id:'BMPS.MI',currency:'USD',years:ys,integrity:{ok:true,reasons:[]},fetchedAt:''};
 expect(checkIntegrity(f).ok).toBe(true);expect(f.years[0].dilutedShares).toBe(10);
 expect(management({years:years().map((y,i)=>({...y,commonCapitalCancelled:i===6})),kind:'operating'}).numeric).toBe('fail');
});
it('adjusts a documented split for non-Japanese sources without erasing actual dilution',()=>{
 const ys=years().map((y,i)=>({...y,equity:100,dilutedShares:i<7?10:52}));
 const f={id:'X.KO',currency:'USD',years:ys,integrity:{ok:true,reasons:[]},fetchedAt:'',splits:[{date:'2022-01-01',factor:5}]};
 expect(checkIntegrity(f,{source:'eodhd'}).ok).toBe(true);
 expect(f.years[0].dilutedShares).toBe(50);expect(f.years.at(-1)!.dilutedShares).toBe(52);
});
it('repairs an isolated comparative on a documented split basis, retaining surrounding dilution',()=>{
 const ys=years().map((y,i)=>({...y,equity:100,dilutedShares:i===7?151:30+i*.02}));
 const f={id:'X.KO',currency:'USD',years:ys,integrity:{ok:true,reasons:[]},fetchedAt:'2026-10-01',splits:[{date:'2026-04-01',factor:5}]};
 expect(checkIntegrity(f,{source:'eodhd'}).ok).toBe(true);
 expect(f.years).toHaveLength(11);expect(f.years[7].dilutedShares).toBeCloseTo(30.2);
 const noEvidence={...f,years:ys,splits:[]};expect(checkIntegrity(noEvidence,{source:'eodhd'}).ok).toBe(false);
});
it('does not mistake ordinary annual share movement for an isolated split comparative',()=>{
 const ys=years().map((y,i)=>({...y,equity:100,dilutedShares:i===7?110:i===8?90:100}));
 const f={id:'X.US',currency:'USD',years:ys,integrity:{ok:true,reasons:[]},fetchedAt:'',splits:[{date:'2025-12-18',factor:1.01}]};
 checkIntegrity(f);
 expect(f.years.map(y=>y.dilutedShares)).toEqual(ys.map(y=>y.dilutedShares));
});
it('restores an interior unadjusted comparative between observations on a documented later split basis',()=>{
 const ys=years().map((y,i)=>({...y,equity:100,dilutedShares:i===6||i===7?2.44:24.4}));
 const f={id:'X.SW',currency:'USD',years:ys,integrity:{ok:true,reasons:[]},fetchedAt:'2026-10-01',splits:[{date:'2025-04-16',factor:10}]};
 expect(checkIntegrity(f,{source:'eodhd'}).ok).toBe(true);
 expect(f.years).toHaveLength(11);expect(f.years[6].dilutedShares).toBeCloseTo(24.4);
});
