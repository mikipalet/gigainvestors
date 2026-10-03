import {expect,it} from 'vitest';
import {completeCachedYears} from '@/lib/value/completeness/cached-years';
import {emptyYear} from '@/lib/value/completeness/second-sources';
import {checkIntegrity} from '@/lib/value/integrity';
import {runNumericTests} from '@/lib/value/tests';
import type {Fundamentals,Year} from '@/lib/value/types';
const years=():Year[]=>Array.from({length:11},(_,i)=>({...emptyYear(`${2015+i}-12-31`,'USD'),revenue:1000,netIncome:100,equity:500,totalAssets:1000,totalLiabilities:500,dilutedShares:100,provenance:{dilutedShares:{source:'prior vendor',field:'shares',method:'cached' as const}}}));
const f=(ys:Year[]):Fundamentals=>({id:'TEST.US',currency:'USD',fetchedAt:'2026-10-01',years:ys,integrity:{ok:true,reasons:[]}});
it('retains a valid history when secondary shares create a destructive jump (IAG-shaped regression)',()=>{
 const prior=years(); const bad={...prior[9],dilutedShares:.33,ocf:50,provenance:{dilutedShares:{source:'https://query2.finance.yahoo.com/test',field:'annualDilutedAverageShares',method:'reported' as const}}};
 const cache:any={'fundamentals/TEST.US.json':f(prior),'completeness/yahoo/TEST.US.json':[bad]};
 const result=completeCachedYears({id:'TEST.US',source:'eodhd',cik:null},prior,<T>(p:string)=>cache[p] as T??null);
 const checked=f(result);expect(checkIntegrity(checked).ok).toBe(true);expect(checked.years).toHaveLength(11);
 expect(result[9].ocf).toBe(50);expect(result[9].dilutedShares).toBe(100);expect(result[9].provenance?.dilutedShares?.source).toBe('prior vendor');
 expect(result[9].sourceWarnings?.join(' ')).toMatch(/retained.*shares/i);
 expect(prior[9].sourceWarnings).toBeUndefined();
});
it('accepts an explicit share correction that preserves usable history and reported zero cash',()=>{
 const prior=years();const fresh={...prior[9],dilutedShares:99,ocf:0,provenance:{dilutedShares:{source:'yahoo',field:'annualDilutedAverageShares',method:'reported' as const}}};
 const cache:any={'fundamentals/TEST.US.json':f(prior),'completeness/yahoo/TEST.US.json':[fresh]};
 const result=completeCachedYears({id:'TEST.US',source:'eodhd',cik:null},prior,<T>(p:string)=>cache[p] as T??null);
 expect(result[9].dilutedShares).toBe(99);expect(result[9].ocf).toBe(0);
});
it('does not bless an already invalid prior history',()=>{
 const prior=years().slice(-2);const cache:any={'fundamentals/TEST.US.json':f(prior)};
 const result=completeCachedYears({id:'TEST.US',source:'eodhd',cik:null},prior,<T>(p:string)=>cache[p] as T??null);
 expect(checkIntegrity(f(result)).ok).toBe(false);
});
it('uses filed MCC denominators instead of parent profit divided by ordinary EPS',()=>{
 const prior=[2023,2024,2025].map(fy=>({...emptyYear(`${fy}-12-31`,'CNY'),dilutedShares:fy===2025?660884000000:3696092100}));
 const result=completeCachedYears({id:'601618.SHG',source:'eodhd',cik:null},prior,()=>null);
 expect(result.map(y=>y.dilutedShares)).toEqual([20723619000,20723619000,20723619000]);
 expect(result.at(-1)?.commonNetIncome).toBe(46309000);
});
it('reconciles a documented post-period consolidation even when historical EPS is absent',()=>{
 const ys=years().map(y=>({...y,currency:'NZD',end:`${y.fy}-07-31`,dilutedShares:y.fy>=2024?4:100}));
 const fundamentals={...f(ys),id:'KMD.AU',currency:'NZD',splits:[{date:'2026-06-30',factor:.04}]};
 expect(checkIntegrity(fundamentals).ok).toBe(true);
 expect(fundamentals.years).toHaveLength(11);
 expect(fundamentals.years[0].dilutedShares).toBe(4);
});
it('keeps LG Chem ordinary shares separate from participating preferred shares',()=>{
 const prior=[2024,2025].map(fy=>({...emptyYear(`${fy}-12-31`,'KRW'),dilutedShares:78276071}));
 const result=completeCachedYears({id:'051910.KO',source:'eodhd',cik:null},prior,()=>null);
 expect(result.filter(y=>y.fy>=2024).map(y=>y.dilutedShares)).toEqual([70592343,70592342]);
});
it('uses KMD filed weighted diluted shares on the completed 1-for-25 consolidation basis',()=>{
 const prior=[2024,2025].map(fy=>({...emptyYear(`${fy}-07-31`,'NZD'),dilutedShares:47458566}));
 const result=completeCachedYears({id:'KMD.AU',source:'eodhd',cik:null},prior,()=>null);
 expect(result.map(y=>y.dilutedShares)).toEqual([28951360,29215440]);
});
it('does not pass Develop accounting on an inferred zero compensation expense in the new fiscal year',()=>{
 const prior=[{...emptyYear('2026-06-30','AUD'),sbc:0,ocf:51338000,capex:64797000}];
 const result=completeCachedYears({id:'DVP.AU',source:'eodhd',cik:null},prior,()=>null).at(-1)!;
 expect(result.sbc).toBe(12521000);
 expect(result.ocf).toBe(49952000);
 expect(result.capex).toBe(112725000);
});
it('uses the five filed SSP consolidated cash flows after capital expenditure and lease payments',()=>{
 const prior=[2021,2022,2023,2024,2025].map(fy=>({...emptyYear(`${fy}-09-30`,'GBP'),equity:100e6,minorityInterest:50e6,netIncome:fy===2025?-74.4e6:1e6}));
 const result=completeCachedYears({id:'SSPG.LSE',source:'eodhd',cik:null},prior,()=>null);
 const metrics=runNumericTests({years:result,kind:'operating',industry:''}).economics.metrics;
 expect(metrics.consolidatedCashConversion).toBe(1);
 expect(metrics.netIncomeTotal).toBe(-234800000);
 expect(metrics.ownerEarningsTotal).toBe(185300000);
});
it('uses PDI weighted ordinary shares on its completed consolidation basis',()=>{
 const prior=[2024,2025].map(fy=>({...emptyYear(`${fy}-06-30`,'AUD'),dilutedShares:525259500}));
 const result=completeCachedYears({id:'PDI.AU',source:'eodhd',cik:null},prior,()=>null);
 expect(result.filter(y=>y.fy>=2024).map(y=>y.dilutedShares)).toEqual([2112032411/5,2450879959/5]);
});
it('restores Genesis history instead of letting a share-basis cut disable long-window checks',()=>{
 const prior=Array.from({length:19},(_,i)=>({...years()[0],fy:2008+i,end:`${2008+i}-06-30`,currency:'AUD',dilutedShares:i<12?1096164400:[129041391.2,193269564.5,340542800,1096164400,1128301900,1142328200,1170350500][i-12]}));
 const result=completeCachedYears({id:'GMD.AU',source:'eodhd',cik:null},prior,()=>null);
 const checked={...f(result),id:'GMD.AU',currency:'AUD',splits:[{date:'2022-01-06',factor:.1}]};
 expect(checkIntegrity(checked).ok).toBe(true);
 expect(checked.years.map(y=>y.fy)).toEqual(prior.map(y=>y.fy));
 expect(result.find(y=>y.fy===2016)?.dilutedShares).toBe(45438463.8);
 expect(result.find(y=>y.fy===2022)?.dilutedShares).toBe(235531324);
});
it('preserves Idemitsu pre-merger years while retaining the real share issuance after split normalization',()=>{
 const prior=Array.from({length:14},(_,i)=>({...years()[0],fy:2013+i,end:`${2013+i}-03-31`,currency:'JPY',dilutedShares:i<7?160e6:1500e6}));
 const result=completeCachedYears({id:'5019.JP',source:'edinet',cik:null},prior,()=>null);
 const checked={...f(result),id:'5019.JP',currency:'JPY'};
 expect(checkIntegrity(checked).ok).toBe(true);
 expect(checked.years).toHaveLength(14);
 expect(result.find(y=>y.fy===2019)!.dilutedShares).toBeCloseTo(81450000000/401.63*5,3);
 expect(result.find(y=>y.fy===2019)!.basicEps).toBe(401.63/5);
 expect(result.find(y=>y.fy===2020)!.dilutedShares).toBe(1500e6);
});

it('repairs Tractor Supply share units and old split bases without dropping the 2009 fiscal period',()=>{
 const prior=Array.from({length:18},(_,i)=>({...years()[0],fy:2008+i,end:`${2008+i}-12-31`,dilutedShares:i===0?74927:i<3?73300000:733000000,netIncome:[81930000,115466000,167972000,222740000,276457000,328234000,370885000,410395000,437120000,422599000,532357000,562354000,748958000,997114000][i]??100}));
 const result=completeCachedYears({id:'TSCO.US',source:'eodhd',cik:'916365'},prior,()=>null);
 const checked={...f(result),id:'TSCO.US'};
 expect(checkIntegrity(checked).ok).toBe(true);
 expect(new Set(checked.years.map(y=>y.fy)).size).toBe(18);
 expect(checked.years).toHaveLength(18);
 expect(result.find(y=>y.fy===2009)!.dilutedShares).toBe(732970000);
 expect(result.find(y=>y.fy===2010)!.dilutedEps).toBe(.225);
});
