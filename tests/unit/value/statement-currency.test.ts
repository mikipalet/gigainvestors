import {describe,expect,it} from 'vitest';
import {emptyYear} from '@/lib/value/completeness/second-sources';
import {consistentBalanceSheets,consistentTrailing,homeCurrencies,statementCurrencyChanged,verifyStatementCurrency} from '@/lib/value/statement-currency';
import {companyEvents} from '@/lib/value/history';
import type {BalanceSheet} from '@/lib/value/latest-balance';
import type {Year} from '@/lib/value/types';

// Cached observations, USD per unit (raw/eodhd/universe/fx-*.json on 2026-10-12).
const rates={USD:1,BRL:.20052,HKD:.12742,CNY:.1404,ARS:.000689};
const year=(end:string,currency:string,v:Partial<Year>):Year=>({...emptyYear(end,currency),...v});
type Fact={start?:string;end:string;val:number;filed:string;form:string;accn?:string};
const flow=(fy:number,val:number):Fact=>({start:`${fy}-01-01`,end:`${fy}-12-31`,val,filed:'2026-04-09',form:'20-F',accn:'0001292814-26-002168'});
const stock=(fy:number,val:number):Fact=>({end:`${fy}-12-31`,val,filed:'2026-04-09',form:'20-F',accn:'0001292814-26-002168'});
const filing=(unit:string,rows:Record<string,Fact[]>)=>({facts:{facts:{'ifrs-full':Object.fromEntries(Object.entries(rows).map(([tag,facts])=>[tag,{units:{[unit]:facts}}]))}},source:'https://www.sec.gov/Archives/edgar/data/1119639/000129281426002168/pbrform20f_2025.htm'});

describe('Petrobras (PETR3.SA): BRL statements labelled USD, against the USD 20-F',()=>{
 // Form 20-F FY2025 inline XBRL (US$ million): revenue 102,409 / 91,416 / 89,195; profit attributable 24,884 / 7,528 / 19,634;
 // operating cash flow 43,212 / 37,984 / 36,047; total assets 181,645 / 222,337; total equity 69,836 / 78,975 / 59,350 / 75,891.
 const sec=filing('USD',{
  Revenue:[flow(2023,102409e6),flow(2024,91416e6),flow(2025,89195e6)],
  ProfitLossAttributableToOwnersOfParent:[flow(2023,24884e6),flow(2024,7528e6),flow(2025,19634e6)],
  CashFlowsFromUsedInOperatingActivities:[flow(2023,43212e6),flow(2024,37984e6),flow(2025,36047e6)],
  Assets:[stock(2024,181645e6),stock(2025,222337e6)],
  Equity:[stock(2022,69836e6),stock(2023,78975e6),stock(2024,59350e6),stock(2025,75891e6)],
 });
 // Vendor rows (raw/eodhd/PETR3.SA.json), every one labelled USD.
 const vendor=[
  year('2022-12-31','USD',{revenue:665900632000,netIncome:195922673000,totalAssets:187191000000,equity:69836000000,ocf:49717000000}),
  year('2023-12-31','USD',{revenue:102409000000,netIncome:24884000000,totalAssets:1066918416000,equity:386247794000,ocf:212393770000}),
  year('2024-12-31','USD',{revenue:490829000000,netIncome:36606000000,totalAssets:1123292680000,equity:365511504000,ocf:234893056000}),
  year('2025-12-31','USD',{revenue:497549000000,netIncome:110129000000,totalAssets:1222897785000,equity:415619056000,ocf:200252561000}),
 ];
 const home=homeCurrencies({currency:'BRL',country:'BR'});
 const {years,dropped}=verifyStatementCurrency(vendor,[sec],home,rates,'2026-10-12');
 it('labels the FY2024 and FY2025 amounts as reais, unchanged, with the filing as evidence',()=>{
  const fy2025=years.find(y=>y.fy===2025)!;
  expect(fy2025.currency).toBe('BRL');expect(fy2025.revenue).toBe(497549000000);
  expect(fy2025.provenance?.currency?.inputs?.[0]).toBe('Vendor label USD; amounts are BRL');
  expect(fy2025.provenance?.currency?.inputs?.[1]).toContain('revenue 5.58× filing USD');
  expect(years.find(y=>y.fy===2024)!.currency).toBe('BRL');
 });
 it('keeps only the FY2023 income statement the 20-F confirms in dollars; its balance sheet and cash flow (reais) are left out',()=>{
  const fy2023=years.find(y=>y.fy===2023)!;
  expect([fy2023.currency,fy2023.revenue,fy2023.netIncome]).toEqual(['USD',102409000000,24884000000]);
  expect([fy2023.equity,fy2023.totalAssets,fy2023.ocf,fy2023.statementCoverage?.balance,fy2023.statementCoverage?.cashFlow]).toEqual([null,null,null,false,false]);
  expect(dropped).toHaveLength(1);
  expect(dropped[0].blanked).toEqual(['cash-flow statement','balance sheet']);
  expect(dropped[0].reason).toMatch(/^Statement currency changed in 2023: FY2023 mixes currencies under one USD label \(revenue = filing USD, netIncome = filing USD, .*equity 4\.89× filing USD.*\); the FY2023 cash-flow statement and balance sheet are not used, the income statement \(USD, as the filing confirms\) is kept$/);
 });
 it('leaves years without a filing to the series checks (the label change then ends the history)',()=>{
  expect(years.find(y=>y.fy===2022)!.currency).toBe('USD');
 });
 it('records the change as an event the publication can see',()=>{
  const events=companyEvents({id:'PETR3.SA',currency:'BRL',years,integrity:{ok:true,reasons:[],notes:dropped.map(d=>d.reason)},fetchedAt:'',splits:[]});
  expect(statementCurrencyChanged({events})).toBe(true);
  expect(statementCurrencyChanged({events:[{kind:'currency_change',note:'reporting currency changed in 2020'}]})).toBe(false);
 });
});

it('drops a JBS N.V. year in reais labelled dollars when reais are not its home currency',()=>{
 // Form 20-F FY2025 inline XBRL (US$): revenue 77,182,547k / 86,184,182k; profit attributable 1,766,870k / 2,024,333k; assets 40,685,373k / 45,156,486k.
 const sec=filing('USD',{Revenue:[flow(2024,77182547e3),flow(2025,86184182e3)],ProfitLossAttributableToOwnersOfParent:[flow(2024,1766870e3),flow(2025,2024333e3)],Assets:[stock(2024,40685373e3),stock(2025,45156486e3)]});
 const vendor=[year('2024-12-31','USD',{revenue:77182547e3,netIncome:1766870e3,totalAssets:40685373e3}),year('2025-12-31','USD',{revenue:471142859000,netIncome:11096825000,totalAssets:248344325000})];
 // The vendor labelled this company's earlier rows BRL: reais are a candidate, not a home currency.
 const {years,dropped}=verifyStatementCurrency(vendor,[sec],homeCurrencies({currency:'USD',country:'US'}),rates,'2026-10-12',['BRL','USD']);
 expect(years.map(y=>[y.fy,y.currency])).toEqual([[2024,'USD']]);
 expect(dropped[0].reason).toMatch(/^Statement currency changed in 2025: FY2025 amounts are not in their USD label \(revenue 5\.47× filing USD.*the USD\/BRL rate\) and BRL is not the company's home currency/);
});

it('realigns a ZKH row filed under the wrong date and currency from three exact CNY filing amounts',()=>{
 const unit='CNY';
 const sec={facts:{facts:{'us-gaap':{
  RevenueFromContractWithCustomerExcludingAssessedTax:{units:{[unit]:[flow(2024,8761318000)]}},
  NetIncomeLoss:{units:{[unit]:[flow(2024,-268043000)]}},Assets:{units:{[unit]:[stock(2024,6611236000)]}}}}},source:'https://www.sec.gov/Archives/edgar/data/1862044/000110465926048107/zkh-20251231x20f.htm'};
 const vendor=[year('2025-09-30','USD',{revenue:8761318000,netIncome:-268043000,totalAssets:6611236000})];
 const [y]=verifyStatementCurrency(vendor,[sec],homeCurrencies({currency:'USD',country:'US'}),rates,'2026-10-12').years;
 expect([y.end,y.fy,y.currency,y.revenue]).toEqual(['2024-12-31',2024,'CNY',8761318000]);
});

it('drops a YPF year whose cash-flow statement is in dollars inside peso statements',()=>{
 const sec=filing('USD',{Revenue:[flow(2024,19293e6)],CashFlowsFromUsedInOperatingActivities:[flow(2024,5869e6)],Assets:[stock(2024,29391e6)]});
 const vendor=[year('2024-12-31','ARS',{revenue:17895031000000,ocf:5869000000,totalAssets:30272730000000})];
 const r=verifyStatementCurrency(vendor,[sec],homeCurrencies({currency:'USD',country:'US'}),rates,'2026-10-12');
 expect(r.years).toEqual([]);expect(r.dropped[0].reason).toContain('ocf = filing USD');
});

describe('one older year mixing currencies keeps its confirmed statements (3.8.3)',()=>{
 // PDD Holdings FY2022 (20-F, RMB with a US-dollar convenience translation): the vendor
 // cash-flow total is the dollar figure; income statement and balance sheet are the RMB statements.
 const unit=(cny:Fact[],usd:Fact[])=>({units:{CNY:cny,USD:usd}});
 const sec={facts:{facts:{'us-gaap':{
  Revenues:unit([flow(2022,130557589e3)],[flow(2022,18929e6)]),NetIncomeLoss:unit([flow(2022,31538062e3)],[flow(2022,4572e6)]),
  NetCashProvidedByUsedInOperatingActivities:unit([flow(2022,48785640e3)],[flow(2022,7073e6)]),
  Assets:unit([stock(2022,247645218e3)],[stock(2022,35905e6)]),StockholdersEquity:unit([stock(2022,125219802e3)],[stock(2022,18155e6)])}}},source:'https://www.sec.gov/Archives/edgar/data/1737806/pdd-20221231x20f.htm'};
 const vendor=[
  year('2021-12-31','CNY',{revenue:93949939e3,netIncome:7768670e3,ocf:24689812e3,totalAssets:197908030e3,equity:89212178e3}),
  year('2022-12-31','CNY',{revenue:130557589e3,netIncome:31538062e3,ocf:7073e6,capex:52e6,dividendsPaid:0,totalAssets:247645218e3,equity:125219802e3,cash:34326192e3}),
  year('2023-12-31','CNY',{revenue:247639077e3,netIncome:60026544e3,ocf:94162135e3,totalAssets:347991250e3,equity:183375565e3}),
 ];
 const r=verifyStatementCurrency(vendor,[sec],homeCurrencies({currency:'USD',country:'CN'}),rates,'2026-10-12');
 it('keeps FY2022 so the history stays continuous; only its dollar cash-flow statement is blank',()=>{
  expect(r.years.map(y=>y.fy)).toEqual([2021,2022,2023]);
  const y=r.years[1];
  expect([y.revenue,y.netIncome,y.totalAssets,y.equity,y.cash]).toEqual([130557589e3,31538062e3,247645218e3,125219802e3,34326192e3]);
  expect([y.ocf,y.capex,y.dividendsPaid,y.statementCoverage?.cashFlow]).toEqual([null,null,null,false]);
  expect(y.sourceWarnings).toContain('FY2022 cash-flow statement: vendor amounts are not in the CNY label of the filing; not used');
  expect(r.dropped.map(d=>[d.fy,d.blanked])).toEqual([[2022,['cash-flow statement']]]);
 });
 it('still records a statement-currency change, so no published figure from the mislabelled rows is retained',()=>{
  const events=companyEvents({id:'PDD.US',currency:'CNY',years:r.years,integrity:{ok:true,reasons:[],notes:r.dropped.map(d=>d.reason)},fetchedAt:'',splits:[]});
  expect(statementCurrencyChanged({events})).toBe(true);
 });
 it('blanks a balance sheet in dollars inside a soles year (Cementos Pacasmayo FY2019)',()=>{
  const pen=filing('PEN',{Revenue:[flow(2019,1392709e3)],ProfitLossAttributableToOwnersOfParent:[flow(2019,152558e3)],CashFlowsFromUsedInOperatingActivities:[flow(2019,277466e3)],Assets:[stock(2019,3116383e3)],Equity:[stock(2019,1572098e3)]});
  const v=[year('2019-12-31','PEN',{revenue:1392709e3,netIncome:152558e3,ocf:277466e3,totalAssets:940376e3,equity:474380e3,cash:20e6})];
  const out=verifyStatementCurrency(v,[pen],homeCurrencies({currency:'USD',country:'PE'}),{...rates,PEN:.2655},'2026-10-12');
  expect(out.years[0].revenue).toBe(1392709e3);expect([out.years[0].totalAssets,out.years[0].cash]).toEqual([null,null]);
  expect(out.dropped[0].blanked).toEqual(['balance sheet']);
 });
 it('confirms a label the dated exchange rate explains (Embraer FY2023: BRL accounts beside a USD 20-F)',()=>{
  const usd=filing('USD',{Revenue:[flow(2023,5269e6)],ProfitLossAttributableToOwnersOfParent:[flow(2023,148e6)],CashFlowsFromUsedInOperatingActivities:[flow(2023,1083e6)],Equity:[stock(2023,2531e6)]});
  const v=[year('2023-12-31','BRL',{revenue:5269e6*4.92,netIncome:148e6*4.91,ocf:1083e6,equity:2531e6*4.51,cash:9e9})];
  const out=verifyStatementCurrency(v,[usd],homeCurrencies({currency:'USD',country:'US'}),rates,'2026-10-12',['BRL']);
  expect(out.years).toHaveLength(1);expect([out.years[0].ocf,out.years[0].revenue]).toEqual([null,5269e6*4.92]);
  expect(out.dropped[0].blanked).toEqual(['cash-flow statement']);
 });
 it('relabels amounts on the home-currency filing scale when no filing states the label currency (a USD label on peso rows)',()=>{
  const pen=filing('PEN',{Revenue:[flow(2025,28.0e9)],ProfitLossAttributableToOwnersOfParent:[flow(2025,6.6e9)],Assets:[stock(2025,268e9)]});
  const v=[year('2025-12-31','USD',{revenue:28.9e9,netIncome:6.93e9,totalAssets:262.1e9})];
  const out=verifyStatementCurrency(v,[pen],homeCurrencies({currency:'USD',country:'PE'}),{...rates,PEN:.2655},'2026-10-12');
  expect(out.years[0].currency).toBe('PEN');expect(out.years[0].provenance?.currency?.inputs?.[0]).toBe('Vendor label USD; amounts are PEN');
 });
 it('drops the year when no statement is confirmed in its label (YPF)',()=>{
  const sec2=filing('USD',{Revenue:[flow(2024,19293e6)],CashFlowsFromUsedInOperatingActivities:[flow(2024,5869e6)],Assets:[stock(2024,29391e6)]});
  expect(verifyStatementCurrency([year('2024-12-31','ARS',{revenue:17895031000000,ocf:5869000000,totalAssets:30272730000000})],[sec2],homeCurrencies({currency:'USD',country:'US'}),rates,'2026-10-12').years).toEqual([]);
 });
});

describe('series checks without a filing (Budweiser APAC, 1876.HK)',()=>{
 const y=(fy:number,scale:number,revenue:number)=>year(`${fy}-12-31`,'USD',{revenue,grossProfit:revenue*.52,costOfSales:revenue*.48,totalAssets:15e9*scale,totalLiabilities:4.6e9*scale,equity:10.4e9*scale,currentAssets:5e9*scale});
 const home=homeCurrencies({currency:'HKD',country:'HK'});
 it('drops a latest year whose balance sheet is in Hong Kong dollars under a USD label',()=>{
  const {years,dropped}=verifyStatementCurrency([y(2023,1,6.86e9),y(2024,.985,6.25e9),y(2025,7.75,5.76e9)],[],home,rates);
  expect(years.map(v=>v.fy)).toEqual([2023,2024]);
  expect(dropped[0].reason).toMatch(/^Statement currency changed in 2025: the FY2025 balance sheet changes scale 8\.\d+× against FY2024 .*USD\/HKD rate/);
 });
 it('drops a one-year blip but keeps a persistent step it cannot attribute',()=>{
  expect(verifyStatementCurrency([y(2022,1,6.5e9),y(2023,7.8,6.6e9),y(2024,1,6.5e9)],[],home,rates).years.map(v=>v.fy)).toEqual([2022,2024]);
  expect(verifyStatementCurrency([y(2022,1,6.5e9),y(2023,7.8,6.6e9),y(2024,7.8,6.5e9)],[],home,rates).years).toHaveLength(3);
 });
 it('rejects newer balance sheets and trailing flows on another currency scale',()=>{
  const sheet=(end:string,assets:number,equity:number):BalanceSheet=>({end,filed:end,currency:'USD',source:`EODHD ${end}`,basis:'filed',values:{cash:1,totalDebt:0,totalAssets:assets,equity,clientAssets:null,shortTermDebt:null,goodwill:null,intangibles:null,minorityInterest:null,leaseLiabilities:null,sharesOutstanding:null,debtIncludesLeases:true}});
  const annual=[y(2024,.985,6.25e9)];
  const r=consistentBalanceSheets([sheet('2025-06-30',14.9e9,10.3e9),sheet('2026-06-30',113396043000,77448086000)],annual,home,rates);
  expect(r.rows.map(s=>s.end)).toEqual(['2025-06-30']);expect(r.rejected[0]).toContain('USD/HKD scale');
  expect(consistentTrailing(year('2026-06-30','USD',{revenue:45e9,grossProfit:23.4e9,costOfSales:21.6e9}),annual,home,rates).ttm).toBeNull();
  expect(consistentTrailing(year('2026-06-30','USD',{revenue:5.9e9,grossProfit:3.07e9,costOfSales:2.83e9}),annual,home,rates).ttm?.revenue).toBe(5.9e9);
 });
});

describe('unchanged',()=>{
 it('keeps statements that equal the filing, with or without a convenience translation',()=>{
  const sec={facts:{facts:{'us-gaap':{Revenues:{units:{CNY:[flow(2025,9e9)],USD:[flow(2025,1.26e9)]}},Assets:{units:{CNY:[stock(2025,20e9)],USD:[stock(2025,2.8e9)]}}}}},source:'https://www.sec.gov/x'};
  const v=[year('2025-12-31','CNY',{revenue:9e9,totalAssets:20e9})];
  const r=verifyStatementCurrency(v,[sec],homeCurrencies({currency:'USD',country:'CN'}),rates,'2026-10-12');
  expect(r.years).toEqual(v);expect(r.dropped).toEqual([]);
 });
 it('ignores small profits and real growth that is not at an exchange rate',()=>{
  const sec=filing('USD',{Revenue:[flow(2025,1e9)],ProfitLossAttributableToOwnersOfParent:[flow(2025,1e6)],Assets:[stock(2025,2e9)]});
  const v=[year('2025-12-31','USD',{revenue:1e9,netIncome:9e6,totalAssets:2e9})];
  expect(verifyStatementCurrency(v,[sec],['BRL'],rates,'2026-10-12').years).toEqual(v);
  const grow=[year('2024-12-31','USD',{revenue:1e9,grossProfit:.4e9,totalAssets:1e9,equity:.5e9}),year('2025-12-31','USD',{revenue:1.1e9,grossProfit:.44e9,totalAssets:3.3e9,equity:1.65e9})];
  expect(verifyStatementCurrency(grow,[],['HKD'],rates).years).toHaveLength(2);
 });
 it('treats a gap no exchange rate explains as a definition difference (bank revenue)',()=>{
  const sec=filing('USD',{Revenues:[flow(2024,3e9)],NetIncomeLoss:[flow(2024,.9e9)],Assets:[stock(2024,60e9)]});
  const v=[year('2024-12-31','USD',{revenue:1.05e9,netIncome:.9e9,totalAssets:60e9})];
  expect(verifyStatementCurrency(v,[sec],['USD'],rates,'2026-10-12',['USD']).years).toEqual(v);
  const w=[year('2024-12-31','USD',{revenue:1.05e9,netIncome:.31e9,totalAssets:60e9*.33})];
  expect(verifyStatementCurrency(w,[sec],['USD'],rates,'2026-10-12',['USD']).years).toEqual(w);
 });
 it('never relabels on a filing filed after the analysis date',()=>{
  const sec=filing('USD',{Revenue:[{...flow(2025,89195e6),filed:'2027-01-01'}],Assets:[{...stock(2025,222337e6),filed:'2027-01-01'}]});
  const v=[year('2025-12-31','USD',{revenue:497549000000,totalAssets:1222897785000})];
  expect(verifyStatementCurrency(v,[sec],['BRL'],rates,'2026-10-12').years).toEqual(v);
 });
});
