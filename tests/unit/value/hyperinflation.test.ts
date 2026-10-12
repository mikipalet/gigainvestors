import {describe,expect,it} from 'vitest';
import {emptyYear} from '@/lib/value/completeness/second-sources';
import {averageRate,closingRate,hyperinflationary,measuredYears,measureNote,measureYears,measuringUnits,type Measure} from '@/lib/value/hyperinflation';
import {statementCurrencyChanged} from '@/lib/value/statement-currency';
import {analysisCurrency} from '@/lib/value/currency';
import {runNumericTests} from '@/lib/value/tests';
import type {Year} from '@/lib/value/types';

const year=(end:string,v:Partial<Year>):Year=>({...emptyYear(end,'ARS'),...v});
type Fact={start?:string;end:string;val:number;filed:string;form:string;accn:string};
// Transportadora de Gas del Sur, Form 20-F companyfacts (ARS): each 20-F restates its comparatives into its own year-end currency.
const accn=(fy:number)=>`0001140361-${fy+1}-00000${fy%10}`;
const flow=(fy:number,filedFy:number,val:number):Fact=>({start:`${fy}-01-01`,end:`${fy}-12-31`,val,filed:`${filedFy+1}-04-25`,form:'20-F',accn:accn(filedFy)});
const stock=(fy:number,filedFy:number,val:number):Fact=>({end:`${fy}-12-31`,val,filed:`${filedFy+1}-04-25`,form:'20-F',accn:accn(filedFy)});
const sec={facts:{facts:{'ifrs-full':{
 Revenue:{units:{ARS:[flow(2016,2017,7402172000),flow(2017,2017,12246664000),flow(2021,2021,88976328000),flow(2021,2022,173319821000),flow(2021,2023,539731171000),flow(2022,2022,164524789000),flow(2022,2023,512342769000),flow(2022,2024,1115696199000),flow(2023,2023,452808754000),flow(2023,2024,986052768000),flow(2024,2024,1219766287000)]}},
 Equity:{units:{ARS:[stock(2016,2017,2526378000),stock(2017,2017,5319640000),stock(2021,2021,120592771000),stock(2021,2022,234906487000),stock(2022,2022,267224289000),stock(2022,2023,832156862000),stock(2023,2023,855674894000),stock(2023,2024,1863348684000),stock(2024,2024,2233512179000)]}},
}}},source:'https://data.sec.gov/api/xbrl/companyfacts/CIK0000931427.json'};
// Vendor rows (raw/eodhd/TGS.US.json): FY2022 income from the FY2024 20-F, balance sheet from the FY2023 20-F.
const vendor=[
 year('2016-12-31',{revenue:7402172000,netIncome:930675000,equity:2526378000,dilutedShares:165014600}),
 year('2017-12-31',{revenue:12246664000,netIncome:2793263000,equity:5319640000,dilutedShares:165014600}),
 year('2022-12-31',{revenue:1115696199000,netIncome:219157465000,equity:832156862000,dilutedShares:150552200}),
 year('2023-12-31',{revenue:986052768000,netIncome:51212469000,equity:1863348684000,dilutedShares:150552200}),
 year('2024-12-31',{revenue:1219766287000,netIncome:370163706000,equity:2233512179000,dilutedShares:150552200}),
 year('2025-12-31',{revenue:1987918172000,netIncome:490323576000,dilutedShares:150552200}),
];
// USD per ARS (raw/eodhd/universe/fx-ARS.json): a flat month around each date is enough here.
const days=(from:string,to:string,usd:number):Array<[string,number]>=>{const out:Array<[string,number]>=[];for(let t=Date.parse(from);t<=Date.parse(to);t+=86400000)out.push([new Date(t).toISOString().slice(0,10),usd]);return out;};
const ars=[...days('2016-01-01','2016-12-31',1/14.8),...days('2017-01-01','2017-12-31',1/16.6),...days('2022-12-01','2022-12-31',1/177),...days('2023-12-01','2023-12-31',1/808),...days('2024-12-01','2024-12-31',1/1032),...days('2025-12-01','2025-12-31',1/1450)];

describe('hyperinflationary reporters are measured in US dollars (3.8.3)',()=>{
 const units=measuringUnits(vendor,[sec],'2026-10-12');
 it('lists Argentina from 1 July 2018 and Türkiye from 30 June 2022 (IAS 29)',()=>{
  expect([hyperinflationary('ARS','2017-12-31'),hyperinflationary('ARS','2018-12-31'),hyperinflationary('TRY','2021-12-31'),hyperinflationary('TRY','2022-12-31'),hyperinflationary('BRL','2025-12-31')]).toEqual([false,true,false,true,false]);
 });
 it('places each statement in the year-end currency of the 20-F it equals',()=>{
  const at=(fy:number)=>units.find(u=>u.fy===fy)!.statements;
  expect(at(2016).income).toMatchObject({basis:'nominal',unitEnd:'2016-12-31'});
  expect(at(2022).income).toMatchObject({basis:'restated',unitEnd:'2024-12-31'});
  expect(at(2022).balance).toMatchObject({basis:'restated',unitEnd:'2023-12-31'});
  // No filed cash-flow total: the cash-flow statement takes its income statement's unit.
  expect(at(2022).cashFlow).toMatchObject({basis:'restated',unitEnd:'2024-12-31'});
 });
 it('leaves a statement no filing places as unknown (FY2025 income restated into a later, unidentified unit)',()=>{
  expect(units.find(u=>u.fy===2025)!.statements.income.basis).toBe('unknown');
 });
 it('translates restated statements at their unit date and nominal flows at the year average (IAS 21.42)',()=>{
  const m=measureYears(units,ars,null);
  const fy2022=m.find(y=>y.fy===2022)!,fy2016=m.find(y=>y.fy===2016)!;
  expect(fy2022.income).toBeCloseTo(1/1032,9);expect(fy2022.balance).toBeCloseTo(1/808,9);
  expect(fy2016.income).toBeCloseTo(1/14.8,9);expect(fy2016.balance).toBe(closingRate(ars,'2016-12-31'));
  expect(averageRate(ars,'2016-12-31')).toBeCloseTo(1/14.8,9);
 });
 const measure:Measure={currency:'USD',reporting:'ARS',basis:'Argentina',years:measureYears(units,ars,null)};
 const usd=measuredYears(vendor,measure,1032);
 it('measures earnings per share in dollars: nominal ARS 5.64 → 2,459 is US$0.38 → US$2.38',()=>{
  const eps=(ys:Year[],fy:number)=>{const y=ys.find(v=>v.fy===fy)!;return y.netIncome===null?null:y.netIncome/y.dilutedShares!;};
  expect(eps(vendor,2016)!.toFixed(2)).toBe('5.64');expect(eps(vendor,2024)!.toFixed(0)).toBe('2459');
  expect(eps(usd,2016)!.toFixed(2)).toBe('0.38');expect(eps(usd,2024)!.toFixed(2)).toBe('2.38');
  expect(usd.find(y=>y.fy===2025)!.netIncome).toBeNull();
  expect(usd.every(y=>y.currency==='USD'&&y.dilutedShares!>0)).toBe(true);
 });
 it('makes within-year ratios consistent again (income and balance sheet from different filings)',()=>{
  const roe=(y:Year)=>y.netIncome!/y.equity!;
  expect(roe(vendor.find(y=>y.fy===2022)!)).toBeCloseTo(.263,3);
  expect(roe(usd.find(y=>y.fy===2022)!)).toBeCloseTo(219157465000/1032/(832156862000/808),3);
 });
 it('fails the per-share progress check that nominal pesos passed',()=>{
  const ten=(base:Year[])=>Array.from({length:11},(_,i)=>{const fy=2015+i;return {...emptyYear(`${fy}-12-31`,'ARS'),revenue:100*1.6**i,operatingIncome:30*1.6**i,netIncome:(fy<2023?20:5)*1.6**i,equity:200*1.6**i,dilutedShares:1e6,totalDebt:0,cash:10,goodwill:0,taxExpense:5,preTaxIncome:25} as Year;});
  const nominal=ten(vendor);
  // Real earnings in dollars fall by three quarters while pesos lose 60% a year.
  const dollars=nominal.map(y=>({...y,currency:'USD',revenue:100,netIncome:y.fy<2023?20:5,operatingIncome:30,equity:200,cash:10/1.6**(y.fy-2015)}));
  expect(runNumericTests({years:nominal,kind:'operating'}).management.metrics.perShareValueChange!).toBeGreaterThan(0);
  expect(runNumericTests({years:dollars,kind:'operating'}).management.numeric).toBe('fail');
 });
 it('labels measured figures in dollars and keeps nominal published figures out',()=>{
  expect(analysisCurrency({measure:{currency:'USD'},reportingCurrency:'ARS',company:{currency:'USD'}})).toBe('USD');
  expect(analysisCurrency({reportingCurrency:'ARS',company:{currency:'USD'}})).toBe('ARS');
  expect(statementCurrencyChanged({measure:{currency:'USD'},events:[]})).toBe(true);
  expect(measureNote(measure)).toMatch(/^ARS is hyperinflationary \(Argentina\): the tests are measured in US dollars, each statement at the exchange rate of the year-end currency it is stated in, not in nominal ARS; FY2025 has a statement no annual filing places/);
 });
});
