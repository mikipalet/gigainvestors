import assert from 'node:assert/strict';
import {formatRate} from '@/lib/format';
import {formatMetric,isCapitalReturn} from './metric-labels';
import {sharePrice} from './listing-details';
import {primaryTileMetric,tileSentence} from './tile-metric';
import {yearTable,retainedWindow} from './drawer-data';
import {seriesSummary} from './density';
import {comparableValuation} from './site-valuation';
import {ownerReturn,returnModelCopy,cashCoveredReturnCopy} from './owner-return';
import {ruleReading} from './rule-reading';
import type {Dossier,IndexRow,Series,PriceMap,TestOutcome} from './types';
type ChartSnapshot={label:string;series:Series;format:string;currency:string};
export type SurfaceSnapshot={accountingContext?:string;signals?:unknown[];text:string;numbers:string[];charts:ChartSnapshot[];stats:Array<[string,string]>;table:string[][];tableHeaders?:string[];windows:unknown[];priceCharts:unknown[]};
const normalizedText=(s:string)=>s.replace(/−/g,'-').replace(/\s+/g,' ').trim();
const same=(a:unknown,b:unknown,where:string)=>assert.deepEqual(a,b,where);
const contains=(s:SurfaceSnapshot,value:string,where:string)=>assert.ok(!value||normalizedText(s.text).includes(normalizedText(value)),`${where}: expected ${value}`);
type PriceChartSnapshot={prices:Array<[string,number]>;values:Array<{from:number;to:number;low:number;mid:number;high:number}>;mos:number;currency:string};
export function auditPriceChartWindows(tile:unknown[],drawer:unknown[],where:string){
 same(tile.length,drawer.length,`${where} missing price chart`);
 for(let i=0;i<tile.length;i++){
  const a=tile[i] as PriceChartSnapshot,b=drawer[i] as PriceChartSnapshot;
  same([a.prices,a.currency,a.mos],[b.prices,b.currency,b.mos],`${where} price history / currency / safety discount`);
  if(!a.values.length||!b.values.length){same(a.values,b.values,`${where} missing value bands`);continue;}
  const start=Math.min(...a.values.map(v=>v.from)),end=Math.max(...a.values.map(v=>v.to));
  assert.ok(Math.min(...b.values.map(v=>v.from))<=start&&Math.max(...b.values.map(v=>v.to))>=end,`${where} drawer omits the tile's period`);
  const within=(chart:PriceChartSnapshot)=>chart.values.filter(v=>v.to>=start&&v.from<=end).map(v=>({...v,from:Math.max(start,v.from),to:Math.min(end,v.to)}));
  same(within(a),within(b),`${where} shared value bands`);
 }
}
/** Compares captured renderer output, never a second invocation of that renderer.
 * Source series retain full precision; visible scalar values use their actual display formatter.
 */
export function auditTestSurfaces(d:Dossier,t:TestOutcome,tile:SurfaceSnapshot,drawer:SurfaceSnapshot){
 const currency=d.reportingCurrency??d.valuation?.currency??d.company.currency;
 const m=primaryTileMetric(t,d.company.kind,d.tests.understandable.series.netIncome??d.series.netIncome);
 const where=`${d.id} ${t.key}`;
 const yearLabel=(fy:number|null|undefined)=>t.provisional?.fy===fy?'LTM':String(fy);
 if(t.provisional)contains(drawer,t.provisional.label,`${where} provisional period label`);
 const reading=ruleReading(t,d.company.kind);
 same(reading.derived,t.result,`${where} verdict differs from applied rules`);
 contains(tile,tileSentence(t,m,d.company.kind),`${where} tile rule sentence`);
 contains(drawer,tileSentence(t,m,d.company.kind),`${where} drawer rule sentence`);
 for(const check of reading.checks.filter(c=>c.pass!==null))contains(drawer,`${check.pass?'✓':'×'} ${check.text}`,`${where} applied rule`);
 const window=retainedWindow(t);
 same(tile.signals??[],drawer.signals??[],`${where} filing likelihood chart mismatch`);
 if(window){same(tile.windows,drawer.windows,`${where} cumulative chart mismatch`);assert.equal(tile.windows.length,1,`${where} missing cumulative chart`);same(tile.stats.slice(0,3),drawer.stats.slice(0,3),`${where} cumulative key numbers mismatch`);}
 else {
  const book=(t.series.bookPerShare??d.tests.economics?.series.bookPerShare??d.series.bookPerShare??[]).filter(([fy])=>fy<=(t.provisional?.fy??d.historyCoverage?.last??Infinity));
  const bookContext=t.key==='accounting'&&'financialRedFlags' in t.metrics&&!m.series.some(p=>p[1]!=null)&&!t.jev.some(a=>a.probability!==null&&Number.isFinite(a.probability))&&book.some(p=>p[1]!=null);
  if(bookContext){
   // The drawer adds the positive-book-value prerequisite behind the warning count.
   // Check that extra context against the published source, not against an absent tile chart.
   same(tile.charts,[],`${where} unexpected warning-count chart`);
   same(drawer.charts,[{label:d.company.kind==='bank'?'Tangible common book per share':'Common book per share',series:book,format:'money',currency}],`${where} published book context chart`);
  }else same(tile.charts,drawer.charts,`${where} chart metric/years/values/units mismatch`);
  if(m.series.some(p=>p[1]!=null))same(tile.charts[0]?.series,m.series,`${where} published series mismatch`);
 }
 const summary=seriesSummary(m.series,m.chartBetter??(t.key==='understandable'?'higher':m.better),Infinity);
 if(summary&&!window){
  const format=m.chartFormat==='index'?'count':m.chartFormat==='ratio'?'x':m.chartFormat??(t.key==='understandable'&&m.id==='opMarginCv'?'pct':m.format);
  const fmt=(n:number)=>formatMetric({value:n,format,currency,returnRatio:isCapitalReturn(m.chart)});
  const wanted=[fmt(summary.median),fmt(summary.worst),fmt(summary.latest)];
  same(tile.stats.slice(0,3).map(r=>r[1]),wanted,`${where} tile median/worst/latest`);
  same(drawer.stats.slice(0,3).map(r=>r[1]),wanted,`${where} drawer median/worst/latest`);
 }
 const table=yearTable(d,t);
 const extraColumns:Record<string,{series:Series;format:'money'|'count'|'pct';key:string}>={
  'Profit':{series:t.series.netIncome??d.series.netIncome??[],format:'money',key:'netIncome'},
  'Diluted shares':{series:t.series.shares??d.series.shares??[],format:'count',key:'shares'},
  'Book / share':{series:t.series.bookPerShare??d.series.bookPerShare??[],format:'money',key:'bookPerShare'},
  'Common ROE':{series:t.series.commonRoe??d.series.commonRoe??[],format:'pct',key:'commonRoe'},
 };
 for(const header of (drawer.tableHeaders??[]).slice(1+table.columns.length,-1)){
  const extra=extraColumns[header];assert.ok(extra,`${where} unrecognised additional column ${header}`);
  table.columns.push({...extra,label:header});for(const row of table.rows)row.values.push(extra.series.find(p=>p[0]===row.year)?.[1]??null);
 }
 const fmt=(value:number|null,format:Parameters<typeof formatMetric>[0]['format']=m.chartFormat==='index'?'count':m.chartFormat==='ratio'?'x':m.chartFormat??(m.id==='opMarginCv'?'pct':m.format))=>formatMetric({value,format,currency,returnRatio:isCapitalReturn(m.chart)});
 if(window){
  same(tile.windows,[{values:{first:window.start,last:window.end,retained:window.retained,created:window.created},currency}],`${where} published retained window`);
  same(drawer.stats,[['Retained',fmt(window.retained,'money')],['Value created',fmt(window.created,'money')],['Shares / yr',fmt(t.metrics.shareCagr??null,'pct')],['$1 test',window.created>=window.retained?'Pass':'Fail'],['Window',`${window.start}–${yearLabel(window.end)}`]],`${where} all window numbers`);
 }else if('financialRedFlags' in t.metrics){
  same(tile.stats,[[m.label,fmt(m.value,m.format)],['Passing bar',`${m.better==='higher'?'≥':'≤'} ${fmt(m.threshold,m.format)}`]],`${where} warning-count tile numbers`);
  const book=(t.series.bookPerShare??d.tests.economics?.series.bookPerShare??d.series.bookPerShare??[]).filter((p):p is [number,number]=>p[1]!=null&&Number.isFinite(p[1])&&table.rows.some(r=>r.year===p[0]));
  const first=book[0],last=book.at(-1);
  if(first&&last){
   if(drawer.accountingContext!==undefined)same(normalizedText(drawer.accountingContext),normalizedText(`${d.company.kind==='bank'?'Tangible common':'Common'} book per share: ${fmt(last[1],'money')} in ${t.provisional?.fy===last[0]?'LTM':`FY${last[0]}`}; must be positive. ${t.metrics.restatementYears!=null?`Reported restatement flags: ${t.metrics.restatementYears}; none allowed.`:''}`),`${where} accounting rule context basis`);
   const expected:Array<[string,string]>=[[d.company.kind==='bank'?'Tangible book / share':'Book / share',fmt(last[1],'money')]];
   if(first[1]>0&&last[1]>0&&last[0]>first[0])expected.push(['Book only / yr',fmt((last[1]/first[1])**(1/(last[0]-first[0]))-1,'pct')]);
   if(t.metrics.restatementYears!=null)expected.push(['Restatement flags',String(t.metrics.restatementYears)]);
   expected.push(['Window',`${first[0]}–${yearLabel(last[0])}`]);same(drawer.stats,expected,`${where} financial accounting context`);
  }
 }else if(summary){
  const bar=m.id==='opMarginCv'&&t.metrics.opMarginImproving===1?'Steady or improving':m.id==='opMarginCv'?`CV ≤ ${fmt(m.threshold,'x')}`:m.chartThreshold===null?'Over the window':`${(m.chartBetter??m.better)==='higher'?'≥':'<'} ${fmt(m.chartThreshold??m.threshold)}`;
  same(drawer.stats.slice(3),[['Passing bar',bar],['Window',`${m.series.filter(p=>p[1]!=null&&Number.isFinite(p[1]))[0]?.[0]}–${yearLabel(m.series.filter(p=>p[1]!=null&&Number.isFinite(p[1])).at(-1)?.[0])}`]],`${where} threshold and observation count`);
 }else{
  same(drawer.stats,[[m.label,fmt(m.value,m.format)],['Passing bar',fmt(m.threshold,m.format)],['Years',String(table.rows.length)]],`${where} scalar drawer numbers`);
  same(tile.stats,[[m.label,fmt(m.value,m.format)],['Passing bar',`${m.better==='higher'?'≥':'≤'} ${fmt(m.threshold,m.format)}`]],`${where} scalar tile numbers`);
 }
 const expected=table.rows.map(r=>[t.provisional?.fy===r.year?t.provisional.label.replace('LTM to ','LTM to'):String(r.year),...r.values.map((value,i)=>value==null?'—':formatMetric({value,format:table.columns[i].format,currency,returnRatio:isCapitalReturn(table.columns[i].key)}).replace(`${currency} `,'')),r.pass==null?'·':r.pass?'✓':'×']);
 same(drawer.table,expected,`${where} year table differs from published observations`);
 // A shared name must never silently change basis between the merged dossier and its tests.
 for(const [key,series]of Object.entries(t.series))if(d.series[key])for(const [year,value]of series){
  const p=d.series[key].find(p=>p[0]===year);if(p)same(p[1],value,`${where} published ${key} FY${year}`);
 }
}
export function auditPriceSurfaces(d:Dossier,row:IndexRow|undefined,quote:PriceMap[string]|null,top:SurfaceSnapshot,price:SurfaceSnapshot,drawer:SurfaceSnapshot){
 const v=comparableValuation(d.valuation,d.company.currency),currency=d.company.currency;
 if(!v||!quote)return;
 const buy=v.perShare.mid*(1-(d.requiredMos??.25)),owner=ownerReturn(d.valuation,currency,d.company.marketCapUsd,quote[0]);
 for(const s of [top,drawer]){contains(s,sharePrice(quote[0],currency),`${d.id} share price`);contains(s,sharePrice(buy,currency),`${d.id} buy price`);if(owner)contains(s,formatMetric({value:owner.expected,format:'pct'}),`${d.id} expected return`);}
 contains(price,sharePrice(buy,currency),`${d.id} price math`);
 for(const value of [v.perShare.low,v.perShare.mid,v.perShare.high])contains(price,sharePrice(value,currency),`${d.id} value range / midpoint`);
 contains(price,formatMetric({value:d.requiredMos??.25,format:'pct'}),`${d.id} safety margin`);
 contains(price,formatMetric({value:1-quote[0]/v.perShare.mid,format:'pct'}),`${d.id} discount`);
 if(owner){contains(price,formatMetric({value:owner.expected,format:'pct'}),`${d.id} IRR`);for(const surface of [price,drawer])contains(surface,returnModelCopy(d.valuation!,currency),`${d.id} shared IRR inputs`);}
 same(drawer.stats,[['Share price',sharePrice(quote[0],currency)],['Estimated value',sharePrice(v.perShare.mid,currency)],['Buy price',sharePrice(buy,currency)],['Expected / yr',owner?formatRate(owner.expected):cashCoveredReturnCopy(d.valuation,currency,quote[0])?'Cash covers price':'—'],['Required',formatRate(d.valuation!.discountRate)],['Safety discount',formatRate(d.requiredMos??.25)],['Price / value',formatRate(quote[0]/v.perShare.mid)]],`${d.id} valuation key numbers`);
 const years=(d.valueHistory??[]).map(([fy,,mid])=>{const p=(d.priceHistory??[]).filter(p=>Number(p[0].slice(0,4))===fy).at(-1)?.[1];const buy=mid*(1-(d.requiredMos??.25));return [String(fy),sharePrice(p??null,currency).replace(`${currency} `,''),sharePrice(mid,currency).replace(`${currency} `,''),sharePrice(buy,currency).replace(`${currency} `,''),p!=null&&mid>0?formatRate(p/mid):'—',p==null?'·':p<=buy?'✓':'×'];});
 same(drawer.table,years,`${d.id} valuation annual table`);
 for(const r of d.valuation!.bridge.slice(0,5))contains(drawer,formatMetric({value:r.value,format:/shares/i.test(r.label)?'count':/return|CAGR/i.test(r.label)?'pct':/factor|price to book/i.test(r.label)?'x':'money',currency:d.valuation!.currency}),`${d.id} valuation input ${r.label}`);
 auditPriceChartWindows(price.priceCharts,drawer.priceCharts,d.id);
 for(const chart of [...price.priceCharts,...drawer.priceCharts] as PriceChartSnapshot[]){
  same(chart.currency,currency,`${d.id} price chart currency`);same(chart.mos,d.requiredMos??.25,`${d.id} chart safety margin`);
  same(chart.prices,[...(d.priceHistory??[]).filter(p=>p[0]<quote[1]),[quote[1],quote[0]]],`${d.id} published quote history`);
  for(const segment of chart.values){const source=(d.valueHistory??[]).find(([fy,low,mid,high])=>segment.from>=fy&&segment.to<=fy+1&&low===segment.low&&mid===segment.mid&&high===segment.high);assert.ok(source||segment.low===v.perShare.low&&segment.mid===v.perShare.mid&&segment.high===v.perShare.high,`${d.id} value band has no published observation`);}
 }
 if(row?.v){same(row.v,[v.perShare.low,v.perShare.mid,v.perShare.high],`${d.id} index value range`);same(row.m,d.requiredMos,`${d.id} safety discount`);same(row.cur,currency,`${d.id} index currency`);}
}
