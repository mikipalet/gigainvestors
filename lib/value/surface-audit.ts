import assert from 'node:assert/strict';
import {formatMetric,isCapitalReturn} from './metric-labels';
import {sharePrice} from './listing-details';
import {primaryTileMetric} from './tile-metric';
import {yearTable,retainedWindow} from './drawer-data';
import {seriesSummary} from './density';
import {comparableValuation} from './site-valuation';
import {ownerReturn} from './owner-return';
import type {Dossier,IndexRow,Series,PriceMap,TestOutcome} from './types';
type ChartSnapshot={label:string;series:Series;format:string;currency:string};
export type SurfaceSnapshot={signals?:unknown[];text:string;numbers:string[];charts:ChartSnapshot[];stats:Array<[string,string]>;table:string[][];windows:unknown[];priceCharts:unknown[]};
const normalizedText=(s:string)=>s.replace(/−/g,'-').replace(/\s+/g,' ').trim();
const same=(a:unknown,b:unknown,where:string)=>assert.deepEqual(a,b,where);
const contains=(s:SurfaceSnapshot,value:string,where:string)=>assert.ok(!value||normalizedText(s.text).includes(normalizedText(value)),`${where}: expected ${value}`);
/** Compares captured renderer output, never a second invocation of that renderer.
 * Source series retain full precision; visible scalar values use their actual display formatter.
 */
export function auditTestSurfaces(d:Dossier,t:TestOutcome,tile:SurfaceSnapshot,drawer:SurfaceSnapshot){
 const currency=d.reportingCurrency??d.valuation?.currency??d.company.currency;
 const m=primaryTileMetric(t,d.company.kind,d.tests.understandable.series.netIncome??d.series.netIncome);
 const where=`${d.id} ${t.key}`;
 const window=retainedWindow(t);
 same(tile.signals??[],drawer.signals??[],`${where} filing likelihood chart mismatch`);
 if(window){same(tile.windows,drawer.windows,`${where} cumulative chart mismatch`);assert.equal(tile.windows.length,1,`${where} missing cumulative chart`);same(tile.stats.slice(0,3),drawer.stats.slice(0,3),`${where} cumulative key numbers mismatch`);}
 else {
  same(tile.charts,drawer.charts,`${where} chart metric/years/values/units mismatch`);
  if(m.series.some(p=>p[1]!=null))same(tile.charts[0]?.series,m.series,`${where} published series mismatch`);
 }
 const summary=seriesSummary(m.series,m.chartBetter??(t.key==='understandable'?'higher':m.better));
 if(summary&&!window){
  const format=m.chartFormat==='index'?'count':m.chartFormat==='ratio'?'x':m.chartFormat??(t.key==='understandable'&&m.id==='opMarginCv'?'pct':m.format);
  const fmt=(n:number)=>formatMetric({value:n,format,currency,returnRatio:isCapitalReturn(m.chart)});
  const wanted=[fmt(summary.median),fmt(summary.worst),fmt(summary.latest)];
  same(tile.stats.slice(0,3).map(r=>r[1]),wanted,`${where} tile median/worst/latest`);
  same(drawer.stats.slice(0,3).map(r=>r[1]),wanted,`${where} drawer median/worst/latest`);
 }
 const table=yearTable(d,t);
 const fmt=(value:number|null,format:Parameters<typeof formatMetric>[0]['format']=m.chartFormat==='index'?'count':m.chartFormat==='ratio'?'x':m.chartFormat??(m.id==='opMarginCv'?'pct':m.format))=>formatMetric({value,format,currency,returnRatio:isCapitalReturn(m.chart)});
 if(window){
  same(tile.windows,[{values:{first:window.start,last:window.end,retained:window.retained,created:window.created},currency}],`${where} published retained window`);
  same(drawer.stats,[['Retained',fmt(window.retained,'money')],['Value created',fmt(window.created,'money')],['Share growth / yr',fmt(t.metrics.shareCagr??null,'pct')],['$1 test',window.created>=window.retained?'Pass':'Fail'],['Window',`${window.start}–${window.end}`]],`${where} all window numbers`);
 }else if(summary){
  const bar=m.id==='opMarginCv'?`CV ≤ ${fmt(m.threshold,'x')}`:m.chartThreshold===null?'Over the window':`${(m.chartBetter??m.better)==='higher'?'≥':'<'} ${fmt(m.chartThreshold??m.threshold)}`;
  same(drawer.stats.slice(3),[['Passing bar',bar],['Years',String(m.series.filter(p=>p[1]!=null&&Number.isFinite(p[1])).length)]],`${where} threshold and observation count`);
 }else{
  same(drawer.stats,[[m.label,fmt(m.value,m.format)],['Passing bar',fmt(m.threshold,m.format)],['Years',String(table.rows.length)]],`${where} scalar drawer numbers`);
  same(tile.stats,[[m.label,fmt(m.value,m.format)],['Passing bar',`${m.better==='higher'?'≥':'≤'} ${fmt(m.threshold,m.format)}`]],`${where} scalar tile numbers`);
 }
 const expected=table.rows.map(r=>[String(r.year),...r.values.map((value,i)=>value==null?'—':formatMetric({value,format:table.columns[i].format,currency,returnRatio:isCapitalReturn(table.columns[i].key)}).replace(`${currency} `,'')),r.pass==null?'·':r.pass?'✓':'×']);
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
 if(owner)for(const value of [owner.yield,Math.abs(owner.growth),owner.expected])contains(price,formatMetric({value,format:'pct'}),`${d.id} return inputs`);
 same(drawer.stats.slice(0,5),[['Share price',sharePrice(quote[0],currency)],['Estimated value',sharePrice(v.perShare.mid,currency)],['Buy price',sharePrice(buy,currency)],['Expected / yr',owner?`${(owner.expected*100).toFixed(1)}%`:'—'],['Required',`${(d.valuation!.discountRate*100).toFixed(1)}%`]],`${d.id} valuation key numbers`);
 const years=(d.valueHistory??[]).map(([fy,,mid])=>{const p=(d.priceHistory??[]).filter(p=>Number(p[0].slice(0,4))===fy).at(-1)?.[1];const buy=mid*(1-(d.requiredMos??.25));return [String(fy),sharePrice(p??null,currency),sharePrice(mid,currency),sharePrice(buy,currency),p==null?'·':p<=buy?'✓':'×'];});
 same(drawer.table,years,`${d.id} valuation annual table`);
 for(const r of d.valuation!.bridge.slice(0,5))contains(drawer,formatMetric({value:r.value,format:/shares/i.test(r.label)?'count':/return|CAGR/i.test(r.label)?'pct':/factor|price to book/i.test(r.label)?'x':'money',currency:d.valuation!.currency}),`${d.id} valuation input ${r.label}`);
 same(price.priceCharts,drawer.priceCharts,`${d.id} price history / value bands`);
 for(const chart of price.priceCharts as Array<{prices:Array<[string,number]>;values:Array<{from:number;to:number;low:number;mid:number;high:number}>;mos:number;currency:string}>){
  same(chart.currency,currency,`${d.id} price chart currency`);same(chart.mos,d.requiredMos??.25,`${d.id} chart safety margin`);
  same(chart.prices,[...(d.priceHistory??[]).filter(p=>p[0]<quote[1]),[quote[1],quote[0]]],`${d.id} published quote history`);
  for(const segment of chart.values){const source=(d.valueHistory??[]).find(([fy,low,mid,high])=>segment.from>=fy&&segment.to<=fy+1&&low===segment.low&&mid===segment.mid&&high===segment.high);assert.ok(source||segment.low===v.perShare.low&&segment.mid===v.perShare.mid&&segment.high===v.perShare.high,`${d.id} value band has no published observation`);}
 }
 if(row?.v){same(row.v,[v.perShare.low,v.perShare.mid,v.perShare.high],`${d.id} index value range`);same(row.m,d.requiredMos,`${d.id} safety discount`);same(row.cur,currency,`${d.id} index currency`);}
}
