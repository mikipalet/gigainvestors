import { expect,it } from 'vitest';
import { calendarQuarters, quarterEnd, historyFrame } from '@/lib/value/time-travel';
import { availableOn, eodInterims, trailingAt } from '@/lib/value/quarterly-inputs';
import { makeYears } from './synthetic';

it('enumerates completed calendar quarters and maps legacy years to Q4',()=>{
 expect(calendarQuarters('2006-04-01')).toEqual(['2005Q1','2005Q2','2005Q3','2005Q4','2006Q1']);
 expect(quarterEnd('2018Q3')).toBe('2018-09-30');
 expect(historyFrame({year:'2018'},['2018Q4','2019Q1'])).toBe('2018Q4');
 expect(historyFrame({q:'2019Q1',year:'2018'},['2018Q4','2019Q1'])).toBe('2019Q1');
 expect(historyFrame({q:'2030Q1'},['2018Q4'])).toBe('Today');
});
it('uses a real filing date or exactly 90 days, rejects period-end placeholder filing dates',()=>{
 expect(availableOn('2018-12-31','2019-02-14')).toBe('2019-02-14');
 expect(availableOn('2018-12-31','2018-12-31')).toBe('2019-03-31');
 expect(availableOn('2019-12-31')).toBe('2020-03-30');
});
const latest=makeYears({from:2017,n:1})[0];
const raw=(ends:string[],filing='2018-08-01')=>({Financials:Object.fromEntries(['Income_Statement','Cash_Flow'].map(table=>[table,{quarterly:Object.fromEntries(ends.map(end=>[end,{filing_date:filing,currency_symbol:'USD',totalRevenue:100,netIncome:10,depreciation:3,capitalExpenditures:4,stockBasedCompensation:1,totalCashFromOperatingActivities:13}]))}]))});
it('sums four filed quarters without leaking a later quarter or changing annual quality inputs',()=>{
 const inputs=eodInterims(raw(['2017-09-30','2017-12-31','2018-03-31','2018-06-30','2018-09-30']));
 expect(trailingAt(inputs,latest,'2018-09-30')?.year).toMatchObject({revenue:400,netIncome:40,da:12,capex:16,sbc:4,end:'2018-06-30'});
 expect(trailingAt(inputs,latest,'2018-08-01')).toBeNull();
 expect(latest.revenue).toBe(1000);
});
it('requires consecutive periods and aggregates the last two half-years',()=>{
 const inputs=eodInterims(raw(['2017-09-30','2017-12-31','2018-06-30','2018-09-30']));
 expect(trailingAt(inputs,latest,'2018-12-31')).toBeNull();
 const halves=eodInterims(raw(['2017-12-31','2018-06-30']),6);
 expect(trailingAt(halves,latest,'2018-09-30')?.year.netIncome).toBe(20);
});
it('does not inherit annual adjustments or lease cash into trailing flows',()=>{
 const adjusted={...latest,maintenanceCapexJudgement:1,nonRecurring:20,leaseCash:5};
 const inputs=eodInterims(raw(['2017-09-30','2017-12-31','2018-03-31','2018-06-30']));
 const ttm=trailingAt(inputs,adjusted,'2018-09-30')!.year;
 expect(ttm.maintenanceCapexJudgement).toBeUndefined();
 expect(ttm.nonRecurring).toBeNull();
 expect(ttm.leaseCash).toBeNull();
});

import { snapshotForQuarter } from '@/lib/value/quarterly-snapshots';
import type { Company, Fundamentals } from '@/lib/value/types';
const company={name:'Test company',id:'TEST.US',currency:'USD',country:'US',kind:'operating',source:'eodhd'} as Company;
it('quality uses only filed annual reports; price is quarter end and future filings cannot change it',()=>{
 const f:Fundamentals={id:company.id,currency:'USD',years:makeYears({from:2000,n:19}),fetchedAt:'2026-01-01',integrity:{ok:true,reasons:[]}};
 const args={company,fundamentals:f,quarter:'2018Q3',prices:[['2018-08',11],['2018-09',12],['2018-10',99]] as [string,number][],latestPrice:null,bondYield:.04,fxRate:1,asOf:'2026-10-01'};
 const result=snapshotForQuarter(args)!;
 expect(result.row[5]?.price).toBe(12);
 expect(result.basis.annual).toBe(2017);
 f.years.at(-1)!.netIncome=-1e12;
 expect(snapshotForQuarter(args)?.row).toEqual(result.row);
 expect(snapshotForQuarter({...args,prices:[['2018-08',11]]})).toBeNull();
});
it('does not use an annual report filed on or after the quarter cutoff',()=>{
 const fundamentals:Fundamentals={id:company.id,currency:'USD',years:makeYears({from:2000,n:19}),fetchedAt:'2026-01-01',integrity:{ok:true,reasons:[]}};
 const args={company,fundamentals,quarter:'2019Q1',prices:[['2019-03',12]] as [string,number][],latestPrice:null,bondYield:.04,fxRate:1,asOf:'2026-10-01'};
 expect(snapshotForQuarter(args)?.basis.annual).toBe(2017); // 90-day fallback = 31 March, not before it.
 expect(snapshotForQuarter({...args,filedByPeriod:{'2018-12-31':'2019-03-30'}})?.basis.annual).toBe(2018);
});

import { secInterims } from '@/lib/value/quarterly-inputs';
import { historyView } from '@/lib/value/browser-view';
import { matchesView } from '@/lib/value/view-filter';
import type { IndexRow } from '@/lib/value/types';
it('keeps quarter navigation out of text search and carries contemporary expected return',()=>{
 const identity={id:'TEST.US',n:'Test',c:'US',k:'operating',cur:'USD',t:'PPPPP',g:[],h:0,st:'s',w:'TEST.US'} as unknown as IndexRow;
 const row=historyView([['TEST.US','PPPPP',.5,true,2,undefined,undefined,{annual:2017,ttm:'2018-06-30',expected:.15}]],[identity])[0];
 expect(row.expected).toBe(.15);
 expect(row.basis).toEqual({annual:2017,ttm:'2018-06-30'});
 expect(matchesView(row,{q:'2018Q3',markets:'all'})).toBe(true);
 expect(matchesView(row,{q:'2018Q3',search:'absent',markets:'all'})).toBe(false);
});
it('differences SEC YTD cash flows and excludes later amendments',()=>{
 const facts=(values:number[])=>({units:{USD:values.map((val,i)=>({start:'2018-01-01',end:['2018-03-31','2018-06-30','2018-09-30'][i],filed:['2018-05-01','2018-08-01','2018-11-01'][i],form:'10-Q',val}))}});
 const raw={facts:{'us-gaap':{NetIncomeLoss:facts([10,30,60]),DepreciationDepletionAndAmortization:facts([1,3,6]),PaymentsToAcquirePropertyPlantAndEquipment:facts([2,6,12])}}};
 const rows=secInterims(raw,'USD','2018-09-30');
 expect(rows.map(r=>r.flows.netIncome)).toEqual([10,20]);
 expect(rows.map(r=>r.flows.capex)).toEqual([2,4]);
 raw.facts['us-gaap'].NetIncomeLoss.units.USD.push({start:'2018-01-01',end:'2018-06-30',filed:'2019-01-01',form:'10-Q/A',val:999});
 expect(secInterims(raw,'USD','2018-09-30')).toEqual(rows);
});
it('does not confuse continuing-operations income with consolidated income',()=>{
 const data=raw(['2017-09-30','2017-12-31','2018-03-31','2018-06-30']);
 for(const v of Object.values((data.Financials.Income_Statement as any).quarterly))Object.assign(v as object,{netIncomeFromContinuingOps:900});
 const result=trailingAt(eodInterims(data),latest,'2018-09-30')!.year;
 expect(result.totalNetIncome).toBeUndefined();
});
import { secAnnualFilings } from '@/lib/value/quarterly-inputs';
it('uses SEC annual filing dates without mistaking quarterly comparative facts for annual reports',()=>{
 const raw={facts:{'us-gaap':{NetIncomeLoss:{units:{USD:[
 {start:'2018-01-01',end:'2018-12-31',filed:'2019-02-12',form:'10-K',val:40},
 {start:'2018-01-01',end:'2018-12-31',filed:'2020-02-01',form:'10-K',val:42},
 {start:'2018-01-01',end:'2018-03-31',filed:'2018-05-01',form:'10-Q',val:10},
 ]}}}}};
 expect(secAnnualFilings(raw)).toEqual({'2018-12-31':'2019-02-12'});
});
import {publishViews} from '@/lib/value/publish-views';
import {unpackView} from '@/lib/value/browser-view';
import {gzipSync} from 'node:zlib';
it('publishes one bounded quarter payload with a Q4 alias for legacy links',()=>{
 const id={id:'TEST.US',n:'Test',c:'US',s:null,k:'operating',cur:'USD',t:'PPPPP',g:[],h:0,st:'s',w:null,mc:null,v:null} as IndexRow;
 const files:Record<string,unknown>={'meta.json':{},'history/companies.json':[id],'history/2018Q4.json':[['TEST.US','PPPPP',.5,true,2,null,null,{annual:2017,ttm:'2018-09-30',expected:.15}]]};
 const m=publishViews(files),payload=files[m.quarters!['2018Q4']];
 expect(m.years['2018']).toBe(m.quarters!['2018Q4']);
 expect(gzipSync(JSON.stringify(payload)).byteLength).toBeLessThanOrEqual(60000);
 expect(unpackView(payload as any)[0].expected).toBe(.15);
});
it('detects half-year reporters at month ends without rolling June 31 into July',()=>{
 const data=raw(['2017-06-30','2017-12-31','2018-06-30','2018-12-31']);
 Object.assign(data.Financials.Income_Statement,{yearly:{'2017-12-31':{totalRevenue:200},'2018-12-31':{totalRevenue:200}}});
 expect(eodInterims(data).every(p=>p.months===6)).toBe(true);
});
import { alignHistoryShares } from '@/lib/value/history-split-basis';
it('aligns confirmed split units without changing earnings or double-adjusting shares',()=>{
 const years=makeYears({from:2019,n:4});
 years.forEach((y,i)=>{y.end=`${y.fy}-03-31`;y.dilutedShares=i<3?100:500;y.netIncome=1000;y.dilutedEps=i<3?10:2;});
 const f={id:'7203.JP',years,currency:'JPY',integrity:{ok:true,reasons:[]},fetchedAt:'2026-10-01'};
 const result=alignHistoryShares(f,[['2021-09',100],['2021-10',101]]);
 expect(result.years.map(y=>y.dilutedShares)).toEqual([500,500,500,500]);
 expect(result.years[0].dilutedEps).toBe(2);
 expect(result.years[0].netIncome).toBe(1000);
 expect(alignHistoryShares(result,[['2021-09',100],['2021-10',101]])).toEqual(result);
});
