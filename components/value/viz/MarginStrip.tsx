'use client';
import { useState } from 'react';
import { useWidth } from '@/lib/value/viz/use-width';
import { valueHref } from '@/lib/value/href';
import { usePathname } from 'next/navigation';
import { ChartInteraction } from './ChartInteraction';
import { scale } from '@/lib/value/viz/layout';
import { dateLabel, displayName } from '@/lib/value/presentation';
type Entry = { id: string; name: string; tests:string; mos: number; requiredMos: number; date?: string };
export function MarginStrip({ entries, qualityCount, buyCount, unpriced = [], checking = 0 }: { checking?:number; unpriced?: Array<{id:string;name:string}>; qualityCount:number; buyCount:number; entries: Entry[]; date?: string | null }) {
  const { ref, width } = useWidth(), pathname = usePathname();
  const [active,setActive]=useState<number|null>(null);
  const quality=entries.filter(e=>e.tests==='PPPPP').sort((a,b)=>Math.abs(Math.log((1-a.mos)/(1-a.requiredMos)))-Math.abs(Math.log((1-b.mos)/(1-b.requiredMos)))).slice(0,8).sort((a,b)=>b.mos-a.mos), near=entries.filter(e=>/^P*FP*$/.test(e.tests));
  const shown=[...quality,...(width<480?[]:near)];
  const maximum=Math.max(4,...shown.map(e=>2**Math.ceil(Math.log2(1-e.mos))));
  const minimum=Math.min(.5,...shown.map(e=>2**Math.floor(Math.log2(Math.min(1-e.mos,1-e.requiredMos)))));
  const left=65,right=width-45, bottom=quality.length*24+40, height=bottom+(width<480?25:65);
  const project=scale({domain:[Math.log2(minimum),Math.log2(maximum)],range:[left,right]});
  const x=(v:number)=>project(Math.log2(v));
  const dots=shown.map((entry,i)=>({entry,x:x(1-entry.mos),y:i<quality.length?20+i*24:bottom+30}));
  return <figure ref={ref} className="closest-chart" aria-labelledby="strip-title"><figcaption><h2 id="strip-title">Quality has a price</h2><p>{qualityCount} quality passes{checking?' so far':''}; {buyCount===0?'none':buyCount} at their buy line. {qualityCount>8&&'Showing the eight nearest their buy line.'}</p></figcaption>
    <ChartInteraction above onActive={setActive} label="Shortlisted companies by price to value" width={width} height={height} points={dots.map(({x,y,entry:e})=>({x,y,text:`${displayName(e.name)}. ${e.tests==='PPPPP'?'Passes all quality tests':'One quality test fails'}. Needs ${(1-e.requiredMos).toFixed(2)}×, is ${(1-e.mos).toFixed(2)}×: ${e.mos>=e.requiredMos?'below its buy line':`price must fall ${((1-(1-e.requiredMos)/(1-e.mos))*100).toFixed(0)}%`}. Price ${dateLabel(e.date)}.`,href:valueHref(`/${e.id.toLowerCase()}`,pathname)}))}>
    <svg aria-hidden="true" width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {[.25,.5,1,2,4,8,16,32,64].filter(t=>t>=minimum&&t<=maximum).map(t=><g key={t}><line x1={x(t)} x2={x(t)} y1="8" y2={bottom-20} stroke="var(--viz-grid)"/><text x={x(t)} y={bottom} textAnchor="middle" className="viz-tick">{t}×</text></g>)}
      {dots.map(({x:cx,y,entry:e},i)=><g key={e.id} opacity={i<quality.length?1:.4}>{i<quality.length?<><text x="0" y={y+4} className="viz-tick">{e.id.split('.')[0]}</text><line x1={x(1-e.requiredMos)} x2={cx} y1={y} y2={y} stroke="var(--ink)" opacity=".2"/><line x1={x(1-e.requiredMos)} x2={x(1-e.requiredMos)} y1={y-5} y2={y+5} stroke="var(--buy)" strokeWidth="2"/><circle cx={cx} cy={y} r="4" fill="var(--ink)"/><text x={cx+9} y={y+4} className="viz-tick">{(1-e.mos).toFixed(2)}×</text></>:<line x1={cx} x2={cx} y1={y-3} y2={y+3} stroke="var(--ink)"/>}{active===i&&<circle cx={cx} cy={y} r="8" fill="none" stroke="var(--ink)"/>}</g>)}
      {width>=480&&<text x="0" y={bottom+50} className="viz-tick">{near.length} priced near misses · one confirmed quality failure</text>}
    </svg></ChartInteraction><p className="source-line">Price / mid value · log scale · green ticks mark each company’s buy line.</p>{unpriced.length>0&&<details className="source-line"><summary>{unpriced.length} companies without a comparable value</summary><p>{unpriced.map((e,i)=><span key={e.id}>{i>0?', ':''}<a className="underline" href={valueHref(`/${e.id.toLowerCase()}`,pathname)}>{displayName(e.name)}</a></span>)}.</p></details>}</figure>;
}
