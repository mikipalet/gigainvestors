'use client';
import { useWidth } from '@/lib/value/viz/use-width';
import { valueHref } from '@/lib/value/href';
import { usePathname } from 'next/navigation';
import { ChartInteraction } from './ChartInteraction';
import { beeswarm, scale } from '@/lib/value/viz/layout';
import { dateLabel } from '@/lib/value/presentation';
type Entry = { id: string; name: string; tests:string; mos: number; requiredMos: number; date?: string };
export function MarginStrip({ entries, qualityCount, buyCount, unpriced = [] }: { unpriced?: Array<{id:string;name:string}>; qualityCount:number; buyCount:number; entries: Entry[]; date?: string | null }) {
  const { ref, width } = useWidth(), pathname = usePathname();
  const maximum=Math.max(4,...entries.map(e=>2**Math.ceil(Math.log2(1-e.mos))));
  const minimum=Math.min(.25,...entries.map(e=>2**Math.floor(Math.log2(1-e.mos))));
  const project=scale({domain:[Math.log2(minimum),Math.log2(maximum)],range:[-1,1]});
  const x=(v:number)=>40+(project(Math.log2(v))+1)/2*(width-80);
  const quality=entries.filter(e=>e.tests==='PPPPP'), near=entries.filter(e=>e.tests!=='PPPPP');
  const dots=[quality,near].flatMap((group,lane)=>beeswarm({points:group.map(e=>({id:e.id,value:project(Math.log2(1-e.mos))})),width:width-80,gap:11}).map(p=>({...p,x:p.x+40,y:p.y+(lane?157:65),entry:group.find(e=>e.id===p.id)!})));
  const cheapest=[...quality].sort((a,b)=>(1-a.mos)/(1-a.requiredMos)-(1-b.mos)/(1-b.requiredMos))[0];
  return <figure ref={ref} className="closest-chart" aria-labelledby="strip-title"><figcaption><h2 id="strip-title">Quality has a price</h2><p>{qualityCount} quality passes; {buyCount===0?'none':buyCount} at their buy line.{quality.length!==qualityCount?` ${quality.length} have comparable prices.`:''}</p></figcaption>
    <ChartInteraction label="Shortlisted companies by price to value" width={width} height={235} points={dots.map(({x,y,entry:e})=>({x,y,text:`${e.name}. ${e.tests==='PPPPP'?'Passes all quality tests':`Fails ${['Understandable','Moat','Economics','Management','Accounting'][e.tests.indexOf('F')]}`}. Needs ${(1-e.requiredMos).toFixed(2)}×, is ${(1-e.mos).toFixed(2)}×: ${e.mos>=e.requiredMos?'below its buy line':`price must fall ${((1-(1-e.requiredMos)/(1-e.mos))*100).toFixed(0)}%`}. Price ${dateLabel(e.date)}.`,href:valueHref(`/${e.id.toLowerCase()}`,pathname)}))}>
    <svg aria-hidden="true" width="100%" height="235" viewBox={`0 0 ${width} 235`}>
      <rect x="40" y="36" width={Math.max(0,x(.75)-40)} height="159" fill="var(--viz-buy-tint)"/>
      {[.5,1,2,4,8,16].filter(t=>t>=minimum&&t<=maximum).map(t=><g key={t}><line x1={x(t)} x2={x(t)} y1="36" y2="195" stroke="var(--viz-grid)"/><text x={x(t)} y="219" textAnchor="middle" className="viz-tick">{t}×</text></g>)}
      <text x="40" y="20" className="viz-tick">Quality passes</text><text x="40" y="120" className="viz-tick">Near misses · one quality test fails</text>
      {dots.map(({x:cx,y,entry:e})=><g key={e.id} opacity={e.tests==='PPPPP'?1:.45}><line x1={x(1-e.requiredMos)} x2={cx} y1={y} y2={y} stroke="var(--ink)" opacity=".12"/><line x1={x(1-e.requiredMos)} x2={x(1-e.requiredMos)} y1={y-4} y2={y+4} stroke="var(--ink)"/>{e.tests==='PPPPP'?<circle cx={cx} cy={y} r="4" fill="var(--ink)" stroke="var(--paper)"/>:<path d={`M${cx-3},${y-3}l6,6m0,-6l-6,6`} stroke="var(--ink)" strokeWidth="1.5"/>}</g>)}
      {cheapest&&<text x={x(1-cheapest.mos)} y="96" textAnchor="middle">{cheapest.id.split('.')[0]} {(1-cheapest.mos).toFixed(2)}×</text>}
    </svg></ChartInteraction><p className="source-line">Price / mid value · log scale · ticks mark each buy line.<br/>Near misses below the line still fail a quality test.</p>{unpriced.length>0&&<p className="source-line">No comparable value: {unpriced.map((e,i)=><span key={e.id}>{i>0?', ':''}<a className="underline" href={valueHref(`/${e.id.toLowerCase()}`,pathname)}>{e.name}</a></span>)}.</p>}</figure>;
}
