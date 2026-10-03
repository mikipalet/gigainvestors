import {expect,it} from 'vitest';
import {retainRefreshFacts} from '@/lib/value/refresh-fundamentals';
import {emptyYear} from '@/lib/value/completeness/second-sources';
import {withReportedFacts} from '@/lib/value/completeness/reported-facts';
import type {Fundamentals} from '@/lib/value/types';
const prior:Fundamentals={id:'TEST.US',currency:'USD',fetchedAt:'2026-09-01',integrity:{ok:true,reasons:[]},years:[{...emptyYear('2024-12-31','USD'),ocf:40,dividendsPaid:5,netIncome:30}]};
it('does not replace a prior fact with an inferred absence zero, but accepts a reported zero',()=>{
 const fresh={...prior,years:[{...prior.years[0],dividendsPaid:0,provenance:{dividendsPaid:{source:'statements',field:'dividendsPaid',method:'absent-in-complete-statement' as const}}}]};
 const retained=retainRefreshFacts(fresh,prior);
 expect(retained.fundamentals.years[0].dividendsPaid).toBe(5);
 expect(retained.snapshot?.value).toEqual(prior);
 fresh.years[0].provenance.dividendsPaid.method='reported' as any;
 expect(retainRefreshFacts(fresh,prior).fundamentals.years[0].dividendsPaid).toBe(0);
});
it('rejects ambiguous fiscal boundaries and company identities without merging unrelated facts',()=>{
 expect(()=>retainRefreshFacts({...prior,years:[{...prior.years[0],end:'2024-12-28',netIncome:999}]},prior)).toThrow(/fiscal boundary/);
 expect(()=>retainRefreshFacts({...prior,id:'OTHER.US'},prior)).toThrow(/identity/);
});
it('repairs LULU rounded fiscal ends without creating empty latest annual observations',()=>{
 const dates=['2024-01-31','2025-01-31','2026-01-31'];
 const profits=[1550190000,1814616000,1579183000],shares=[127060000,123935000,119068000];
 const source=dates.map((end,i)=>({...emptyYear(end,'USD'),netIncome:profits[i],dilutedShares:shares[i],ocf:100+i}));
 const result=withReportedFacts('LULU.US',source);
 expect(result.map(y=>y.end)).toEqual(['2024-01-28','2025-02-02','2026-02-01']);
 expect(result.map(y=>y.dilutedShares)).toEqual(shares);
 expect(result.map(y=>y.ocf)).toEqual([100,101,102]);
 expect(withReportedFacts('LULU.US',result)).toEqual(result);
});
it('restores BCP 2023 zero common dividends from the complete issuer cash-flow statement',()=>{
 const years=withReportedFacts('BCP.LS',[emptyYear('2022-12-31','EUR'),emptyYear('2023-12-31','EUR')]);
 expect(years[1]).toMatchObject({commonDividendsPaid:0,dividendsPaid:0});
 expect(years[0].commonDividendsPaid).toBe(13603000);
 expect(years[1].provenance?.commonDividendsPaid.source).toContain('b36af017');
});
it('restores Kawasaki pandemic-year sales and loss instead of accepting zero-filled income',()=>{
 const [year]=withReportedFacts('7012.JP',[{...emptyYear('2021-03-31','JPY'),revenue:0,netIncome:0}]);
 expect(year).toMatchObject({revenue:1488486000000,netIncome:-19332000000,operatingIncome:-5305000000});
});
it('accepts a filing-corroborated week-based fiscal date correction and retains missing facts',()=>{
 const fresh={...prior,years:[{...prior.years[0],end:'2024-12-28',ocf:null}]};
 const result=retainRefreshFacts(fresh,prior);
 expect(result.fundamentals.years).toHaveLength(1);
 expect(result.fundamentals.years[0]).toMatchObject({end:'2024-12-28',ocf:40});
});
it('retains lease and compensation coverage metadata with the corresponding omitted facts',()=>{
 const old={...prior,years:[{...prior.years[0],leaseCash:8,leaseCashIncomplete:true,leaseLiabilities:50,leaseDepreciationIncluded:true,sbc:3,sbcIncomplete:true}]};
 const fresh={...prior,years:[{...prior.years[0],leaseCash:null,leaseCashIncomplete:false,leaseLiabilities:null,leaseDepreciationIncluded:false,sbc:null,sbcIncomplete:false}]};
 expect(retainRefreshFacts(fresh,old).fundamentals.years[0]).toMatchObject({leaseCash:8,leaseCashIncomplete:true,leaseLiabilities:50,leaseDepreciationIncluded:true,sbc:3,sbcIncomplete:true});
});
it('retains omitted annual periods and their provenance when a refresh has no new fiscal year',()=>{
 const old={...prior,years:[{...prior.years[0],fy:2023,end:'2023-12-31'},prior.years[0]]};
 const result=retainRefreshFacts(prior,old);
 expect(result.fundamentals.years.map(y=>y.fy)).toEqual([2023,2024]);
 expect(result.fundamentals.years[0].provenance?.ocf.retainedFrom?.snapshot).toBe(result.snapshot?.path);
 expect(old.years[0].provenance).toBeUndefined();
});
it('keeps a coherent prior share basis when refresh replacements would truncate history',()=>{
 const years=Array.from({length:12},(_,i)=>({...emptyYear(`${2014+i}-12-31`,'USD'),revenue:100,netIncome:10,equity:50,totalAssets:100,totalLiabilities:50,dilutedShares:100}));
 const old={...prior,years},fresh={...old,years:years.map(y=>({...y,dilutedShares:y.fy===2018?1e8:100}))};
 const result=retainRefreshFacts(fresh,old);
 expect(result.fundamentals.years.find(y=>y.fy===2018)?.dilutedShares).toBe(100);
 expect(result.snapshot?.value).toEqual(old);
 expect(result.fundamentals.years.find(y=>y.fy===2018)?.provenance?.dilutedShares?.retainedFrom?.snapshot).toBe(result.snapshot?.path);
});
