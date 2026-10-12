import {describe,expect,it} from 'vitest';
import {normalizeEodhd} from '@/lib/value/normalize-eodhd';
import {parentShare} from '@/lib/value/parent-share';
import {ownerEarningsBridge} from '@/lib/value/owner-earnings';
import {filingStatements,filingStatementIssuer} from '@/lib/value/filing-statements';
import {filingLabels} from '@/lib/value/annual-source-corrections';
import {checkIntegrity} from '@/lib/value/integrity';
import {deriveYears} from '@/lib/value/derive';
import type {Company,Fundamentals} from '@/lib/value/types';

const row=(fields:Record<string,string|number|null>,currency='KRW')=>({currency_symbol:currency,...Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v===null?null:String(v)]))});

describe('minority shareholders’ share of consolidated cash flows (Orion Holdings, DART FY2025)',()=>{
 // 사업보고서 2025 (rcpNo 20260318000838): 당기순이익 337,777,860,270; 지배기업 소유주 120,991,845,518; 비지배지분 216,786,014,752.
 const income=row({totalRevenue:3393126199450,netIncome:120991845510,minorityInterest:-216786014750,netIncomeFromContinuingOps:337777860270,incomeBeforeTax:477997869010,operatingIncome:487728621830,reconciledDepreciation:265090282920});
 const balance=row({totalAssets:6183410426050,totalStockholderEquity:2463569687390,noncontrollingInterestInConsolidatedEntity:2692366660230,cash:353427526410,totalLiab:1027474078420});
 const cash=row({totalCashFromOperatingActivities:514071834740,capitalExpenditures:-188426638440,netIncome:337777860270});
 const raw={General:{CurrencyCode:'KRW'},Financials:{Income_Statement:{yearly:{'2025-12-31':income}},Balance_Sheet:{yearly:{'2025-12-31':balance}},Cash_Flow:{yearly:{'2025-12-31':cash}}}};
 const [y]=normalizeEodhd(raw,'001800.KO').fundamentals.years;
 it('reads the consolidated profit when parent profit plus the minority share reconciles to it',()=>{
  expect(y.totalNetIncome).toBe(337777860270);
  expect(parentShare(y)).toBeCloseTo(120991845510/337777860270,9);
 });
 it('allocates consolidated D&A and capital spending to the parent (62% belongs to minorities)',()=>{
  const [bridge]=ownerEarningsBridge(deriveYears([y]));
  expect(bridge.allocation).toBeCloseTo(.358,3);
  expect(bridge.value!).toBeLessThan(y.netIncome!+(y.da!-bridge.maintenanceCapex!)*.36);
 });
 it('leaves the profit split unknown when the row does not reconcile or the minority share is a loss',()=>{
  const odd=normalizeEodhd({...raw,Financials:{...raw.Financials,Income_Statement:{yearly:{'2025-12-31':{...income,netIncomeFromContinuingOps:'300000000000'}}}}},'001800.KO').fundamentals.years[0];
  expect(odd.totalNetIncome).toBeUndefined();
  const loss=normalizeEodhd({...raw,Financials:{...raw.Financials,Income_Statement:{yearly:{'2025-12-31':{...income,minorityInterest:'140357395.50',netIncome:'29003103411.66',netIncomeFromContinuingOps:'28862746016.16'}}}}},'000651.SHE').fundamentals.years[0];
  expect(loss.totalNetIncome).toBeUndefined();
 });
});

describe('statements from the 20-F where the vendor rows mix its currencies (3.8.3)',()=>{
 const flow=(fy:number,val:number,filed:string)=>({start:`${fy}-01-01`,end:`${fy}-12-31`,val,filed,form:'20-F',accn:`0001292814-${filed.slice(2,4)}-1`});
 const stock=(fy:number,val:number,filed:string)=>({end:`${fy}-12-31`,val,filed,form:'20-F',accn:`0001292814-${filed.slice(2,4)}-1`});
 const facts=(fys:number[],filed:string)=>({facts:{'ifrs-full':{
  Revenue:{units:{USD:fys.map(fy=>flow(fy,80e9+fy,filed))}},ProfitLossAttributableToOwnersOfParent:{units:{USD:fys.map(fy=>flow(fy,10e9,filed))}},
  CashFlowsFromUsedInOperatingActivities:{units:{USD:fys.map(fy=>flow(fy,35e9,filed))}},PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities:{units:{USD:fys.map(fy=>flow(fy,15e9,filed))}},
  Assets:{units:{USD:fys.map(fy=>stock(fy,200e9,filed))}},EquityAttributableToOwnersOfParent:{units:{USD:fys.map(fy=>stock(fy,70e9,filed))}},CurrentTradeReceivables:{units:{USD:fys.map(fy=>stock(fy,5e9,filed))}},
  AdjustedWeightedAverageShares:{units:{shares:fys.map(fy=>flow(fy,13044496930,filed))}}}}});
 const files:Record<string,unknown>={
  'raw/sec-companyfacts/PBR.US.json':{cik:1119639,...facts([2012,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024],'2025-04-09')},
  'raw/sec-annual/PETR3.SA.json':{source:'https://www.sec.gov/Archives/edgar/data/1119639/000129281426002168/pbrform20f_2025.htm',facts:facts([2023,2024,2025],'2026-04-09')},
 };
 const read=<T,>(f:string)=>(files[f]??null) as T|null;
 it('lists Petrobras, YPF and JBS with their reasons and 20-F sources',()=>{
  for(const id of ['PETR3.SA','YPF.US','JBS.US'])expect(filingStatementIssuer(id)).toMatchObject({currency:'USD',source:expect.stringMatching(/^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\//)});
  expect(filingStatementIssuer('PDD.US')).toBeNull();
 });
 it('builds the consecutive US-dollar years ending with the latest 20-F (Petrobras FY2015–FY2025)',()=>{
  const built=filingStatements({id:'PETR3.SA',cik:null} as unknown as Company,read)!;
  expect(built.currency).toBe('USD');
  expect(built.years.map(y=>y.fy)).toEqual([2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025]);
  const y2025=built.years.at(-1)!;
  expect([y2025.currency,y2025.revenue,y2025.capex,y2025.receivables,y2025.dilutedShares]).toEqual(['USD',80e9+2025,15e9,5e9,13044496930]);
  expect(y2025.totalLiabilities).toBe(130e9);
  expect(built.note).toMatch(/^Annual statements built from the 20-F \(USD, FY2015–FY2025\); vendor rows not used: /);
 });
 it('refuses facts of another issuer',()=>{
  const wrong=(f:string)=>(f==='raw/sec-companyfacts/PBR.US.json'?{cik:1,...facts([2024],'2025-04-09')}:null) as never;
  expect(()=>filingStatements({id:'PETR3.SA'} as unknown as Company,wrong)).toThrow(/belongs to CIK 1, not 1119639/);
 });
});

describe('a one-year vendor label flip no longer cuts a bank’s history (Credicorp FY2025)',()=>{
 const fy=(year:number,currency:string,ni:number)=>({fy:year,end:`${year}-12-31`,currency,revenue:ni*4,netIncome:ni,totalAssets:ni*45,equity:ni*6,totalLiabilities:ni*39,dilutedShares:79.4e6} as never);
 const years=[2019,2020,2021,2022,2023,2024].map(y=>fy(y,'PEN',4e9+y*1e6)).concat([fy(2025,'USD',6925377000)]);
 // Form 20-F FY2025 inline XBRL (PEN): profit attributable 6,925,377 thousand; total assets 267.3bn.
 const sec={source:'https://www.sec.gov/Archives/edgar/data/1001290/bap-20251231.htm',facts:{facts:{'ifrs-full':{
  ProfitLossAttributableToOwnersOfParent:{units:{PEN:[{start:'2025-01-01',end:'2025-12-31',val:6925377000,filed:'2026-04-28',form:'20-F'}]}},
  Assets:{units:{PEN:[{end:'2025-12-31',val:6925377000*45,filed:'2026-04-28',form:'20-F'}]}},
  Revenues:{units:{PEN:[{start:'2025-01-01',end:'2025-12-31',val:6925377000*4,filed:'2026-04-28',form:'20-F'}]}}}}}};
 const read=<T,>(f:string)=>(f==='raw/sec-annual/BAP.US.json'?sec:null) as T|null;
 const company={id:'BAP.US',currency:'USD',country:'US',kind:'bank',sector:'Financial Services'} as unknown as Company;
 it('restores the filing’s label on the flipped year before the history is cut',()=>{
  const labels=filingLabels(company,years,null,read);
  expect([...labels.keys()]).toEqual(['2025-12-31']);
  expect(labels.get('2025-12-31')!.currency).toBe('PEN');
  const relabelled=years.map((y:{end:string})=>labels.get(y.end)??y);
  const f={id:'BAP.US',currency:'PEN',years:relabelled,integrity:{ok:true,reasons:[]},fetchedAt:'',splits:[]} as unknown as Fundamentals;
  const before={...f,years:years.map((y:object)=>({...y}))} as Fundamentals;
  checkIntegrity(before);checkIntegrity(f);
  expect(before.years).toHaveLength(1);
  expect(f.years.map(y=>y.fy)).toEqual([2019,2020,2021,2022,2023,2024,2025]);
 });
});

it('keeps Worldline’s share basis: FY2025 ESEF 280,073,277 weighted shares restated for the 1-for-40 consolidation of 15 June 2026',()=>{
 // filings.xbrl.org 549300CJMQNCA0U4TS33-2025-12-31: ifrs-full:WeightedAverageShares 280,073,277 (2025), 282,567,142 (2024).
 const shares={2024:282567142/40,2025:280073277/40};
 expect(Math.round(shares[2025])).toBe(7001832);
 const f={id:'WLN.PA',currency:'EUR',integrity:{ok:true,reasons:[]},fetchedAt:'',splits:[{date:'2026-06-15',factor:.025}],
  years:[2019,2020,2021,2022,2023,2024,2025].map(fy=>({fy,end:`${fy}-12-31`,currency:'EUR',netIncome:-1e8,equity:5e9,totalAssets:1.5e10,revenue:4e9,dilutedShares:fy>=2024?shares[fy as 2024|2025]:7.0e6}))} as unknown as Fundamentals;
 const integrity=checkIntegrity(f);
 expect(integrity.notes.some(n=>/share count jumped|split/.test(n))).toBe(false);
 expect(f.years.at(-1)!.dilutedShares).toBe(280073277/40);
});
