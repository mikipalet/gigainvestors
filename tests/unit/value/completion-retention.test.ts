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
it('rejects destructive SEC share replacements before they truncate older annual periods',()=>{
 const prior=years();const bad={...prior[3],dilutedShares:100e6,ocf:50,provenance:{dilutedShares:{source:'https://data.sec.gov/api/xbrl/companyfacts/CIK1.json',field:'WeightedAverageNumberOfDilutedSharesOutstanding',method:'reported' as const}}};
 const cache:any={'fundamentals/TEST.US.json':f(prior),'completeness/sec/1.json':[bad]};
 const result=completeCachedYears({id:'TEST.US',source:'eodhd',cik:'1'},prior,<T>(p:string)=>cache[p] as T??null);
 const checked=f(result);checkIntegrity(checked);expect(checked.years).toHaveLength(11);expect(result[3].ocf).toBe(50);
});
it('restores Tokuyama early history on its filed one-for-five basis',()=>{
 const ys=Array.from({length:14},(_,i)=>({...years()[0],fy:2013+i,end:`${2013+i}-03-31`,currency:'JPY',netIncome:10+i,equity:100+i,dilutedShares:i?70e6:350e6,basicEps:i?1:.2}));
 const checked={...f(ys),id:'4043.JP',currency:'JPY'};checkIntegrity(checked,{source:'edinet'});
 expect(checked.years).toHaveLength(14);expect(checked.years[0].dilutedShares).toBe(70e6);
});
it('restores Aena pre-split comparatives and Equinor incorrectly multiplied shares',()=>{
 const a=completeCachedYears({id:'AENA.MC',source:'eodhd',cik:null},[2011,2012,2013].map(fy=>({...emptyYear(`${fy}-12-31`,'EUR'),dilutedShares:150e6})),()=>null);
 expect(a.map(y=>y.dilutedShares)).toEqual([1500e6,1500e6,1500e6]);
 const e=completeCachedYears({id:'EQNR.OL',source:'eodhd',cik:null},[{...emptyYear('2000-12-31','USD'),dilutedShares:9879428000}],()=>null);
 expect(e[0].dilutedShares).toBe(1975885600);
});
it('uses filed US statement fields when vendor totals disagree',()=>{
 const c={source:'eodhd' as const,cik:null};
 expect(completeCachedYears({...c,id:'TYL.US'},[{...emptyYear('2019-12-31','USD'),grossProfit:495455000}],()=>null).find(y=>y.fy===2019)?.grossProfit).toBe(516900000);
 expect(completeCachedYears({...c,id:'OMC.US'},[{...emptyYear('2020-12-31','USD'),operatingIncome:1714100000}],()=>null).find(y=>y.fy===2020)?.operatingIncome).toBe(1598800000);
 expect(completeCachedYears({...c,id:'WY.US'},[{...emptyYear('2025-12-31','USD'),operatingIncome:465000000}],()=>null).find(y=>y.fy===2025)?.operatingIncome).toBe(731000000);
});
it('separates Emeis recapitalisation dilution from the subsequent 1-for-1000 reverse split',()=>{
 const prior=Array.from({length:13},(_,i)=>({...emptyYear(`${2013+i}-12-31`,'EUR'),dilutedShares:64e6,netIncome:1e6,equity:1e7}));
 const result=completeCachedYears({id:'EMEIS.PA',source:'eodhd',cik:null},prior,()=>null);
 const checked={...f(result),id:'EMEIS.PA',currency:'EUR',splits:[{date:'2024-03-22',factor:.001}]};
 checkIntegrity(checked);
 expect(checked.years).toHaveLength(13);
 expect(result.find(y=>y.fy===2022)?.dilutedShares).toBe(68400.833);
 expect(result.find(y=>y.fy===2023)?.dilutedShares).toBe(10374827.35);
 expect(result.find(y=>y.fy===2024)?.dilutedShares).toBe(159062400);
 expect(result.find(y=>y.fy===2025)?.dilutedShares).toBe(162789272);
 expect(checked.years.find(y=>y.fy===2023)!.dilutedShares!/checked.years.find(y=>y.fy===2022)!.dilutedShares!).toBeGreaterThan(150);
 expect(checked.integrity.notes?.join(' ')??'').not.toContain('split 150');
});
it('uses matching SEC annual profit and operating cash totals rather than conflicting vendor totals',()=>{
 const c={source:'eodhd' as const,cik:null};
 const a=completeCachedYears({...c,id:'AMCR.US'},[{...emptyYear('2017-06-30','USD'),netIncome:596418000,ocf:596418287}],()=>null).find(y=>y.fy===2017)!;
 expect(a.netIncome).toBe(564000000);expect(a.ocf).toBe(908900000);
 const n=completeCachedYears({...c,id:'NDSN.US'},[{...emptyYear('2016-10-31','USD'),ocf:331158000}],()=>null).find(y=>y.fy===2016)!;
 expect(n.ocf).toBe(334634000);
});
it('restores Evolution FY2005 using filed year-end shares as an explicit proxy and subsequent filed weighted shares',()=>{
 const ys=Array.from({length:25},(_,i)=>({...emptyYear(`${2002+i}-06-30`,'AUD'),dilutedShares:i<4?670299580:50e6,netIncome:-1e6,equity:20e6}));
 const result=completeCachedYears({id:'EVN.AU',source:'eodhd',cik:null},ys,()=>null);
 const checked={...f(result),id:'EVN.AU',currency:'AUD',splits:[{date:'2009-11-27',factor:1/11}]};checkIntegrity(checked);
 expect(checked.years[0].fy).toBe(2005);expect(checked.years).toHaveLength(22);
 expect(result.find(y=>y.fy===2005)?.dilutedShares).toBeCloseTo(220998086/11,5);
 expect(result.find(y=>y.fy===2005)?.provenance?.dilutedShares.inputs?.join(' ')).toMatch(/year-end.*proxy/i);
 expect(result.find(y=>y.fy===2005)?.provenance?.dilutedShares.method).toBe('estimate');
 expect(result.find(y=>y.fy===2006)?.dilutedShares).toBeCloseTo(224558623/11,5);
});
it('retains Hammerson 1996-99 from filed weighted shares with disclosed rights and consolidation factors',()=>{
 const ys=Array.from({length:30},(_,i)=>({...emptyYear(`${1996+i}-12-31`,'GBP'),dilutedShares:i<4?5402219200:100e6,netIncome:10e6,equity:100e6}));
 const result=completeCachedYears({id:'HMSO.LSE',source:'eodhd',cik:null},ys,()=>null);
 const checked={...f(result),id:'HMSO.LSE',currency:'GBP'};checkIntegrity(checked);
 expect(checked.years).toHaveLength(30);expect(checked.years[0].fy).toBe(1996);
 expect(result[0].dilutedShares).toBeCloseTo(283700000*1.47*10.95/5/10,5);
 expect(result.find(y=>y.fy===1999)?.dilutedShares).toBeCloseTo(314200000*1.47*10.95/5/10,5);
});

it.each([['4507.JP',3],['6902.JP',4]] as const)('aligns older %s comparative shares to its issuer-confirmed split', (id,factor)=>{
 const ys=Array.from({length:14},(_,i)=>({...emptyYear(`${2013+i}-03-31`,'JPY'),dilutedShares:i<8?100:100*factor,netIncome:1000+i*10,basicEps:(1000+i*10)/(i<8?100:100*factor),equity:5000+i*20,revenue:10000+i*50}));
 const checked={...f(ys),id,currency:'JPY'};checkIntegrity(checked);
 expect(checked.years[0].dilutedShares).toBe(100*factor);
 expect(checked.years.at(-1)?.dilutedShares).toBe(100*factor);
 expect(checked.years[0].basicEps).toBeCloseTo(10/factor);
});
