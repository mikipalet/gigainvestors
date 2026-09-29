'use client';
import { useWidth } from '@/lib/value/viz/use-width';
import { valueHref } from '@/lib/value/href';
import { usePathname } from 'next/navigation';
import { ChartInteraction } from './ChartInteraction';
type Entry = { id: string; name: string; mos: number; requiredMos: number; date?: string };
export function MarginStrip({ entries }: { entries: Entry[]; date?: string | null }) {
  const { ref, width } = useWidth(), pathname = usePathname();
  const closest = [...entries].sort((a,b) => (1-a.mos)/(1-a.requiredMos) - (1-b.mos)/(1-b.requiredMos)).slice(0,5);
  const maximum = Math.max(4, ...closest.map(e => 2 ** Math.ceil(Math.log2(1-e.mos))));
  const minimum = Math.min(.25,...closest.map(e=>2**Math.floor(Math.log2(1-e.mos))));
  const x = (v: number) => 70 + (Math.log2(Math.max(minimum,v))-Math.log2(minimum))/(Math.log2(maximum)-Math.log2(minimum))*(width-140);
  const buys = entries.filter(e => e.mos >= e.requiredMos).length;
  return <figure ref={ref} className="closest-chart" aria-labelledby="strip-title"><figcaption><h2 id="strip-title">Closest to their buy line</h2><p>{buys ? `${buys} quality companies meet the buy discount.` : `None at its buy price.${closest.length ? ` ${closest.slice(0,2).map(e=>e.id.split('.')[0]).join(' and ')} are closest.` : ''}`}</p></figcaption><ChartInteraction label="Quality companies by price to value" width={width} height={150} points={closest.map((e,i)=>({x:x(1-e.mos),y:20+i*24,text:`${e.name}, ${(1-e.mos).toFixed(2)}× mid value; needs ${(e.requiredMos*100).toFixed(0)}% discount, ${e.mos > 0 ? `has ${(e.mos*100).toFixed(0)}%` : 'trades above value'}`,href:valueHref(`/${e.id.toLowerCase()}`,pathname)}))}>
    <svg aria-hidden="true" width="100%" height="150" viewBox={`0 0 ${width} 150`}>
      {closest.map((e,i)=><g key={e.id}><text x="0" y={24+i*24}>{e.id.split('.')[0]}</text><line x1={70} x2={width-70} y1={20+i*24} y2={20+i*24} stroke="var(--viz-grid)"/><line x1={x(1-e.requiredMos)} x2={x(1-e.requiredMos)} y1={12+i*24} y2={28+i*24} stroke="var(--buy)" strokeWidth="2"/><circle cx={x(1-e.mos)} cy={20+i*24} r="4" fill="var(--ink)"/><text x={width-2} textAnchor="end" y={24+i*24}>{(1-e.mos).toFixed(2)}×</text></g>)}
      {[minimum,1,maximum].map(t=><text key={t} x={x(t)} y="145" textAnchor="middle" className="viz-tick">{t}×</text>)}
    </svg></ChartInteraction><p className="source-line">Price / mid value · log scale · green tick = required buy line</p></figure>;
}
