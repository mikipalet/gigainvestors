import type { Series } from '@/lib/value/types';
import { formatMetric, type MetricFormat } from '@/lib/value/metric-labels';
import { useWidth } from '@/lib/value/viz/use-width';
export function MiniSeries({ series, label, threshold, format='pct' }: { series: Series; label: string; threshold?: number;format?:MetricFormat }) {
 const {ref,width}=useWidth();
 const points=series.filter((p):p is [number,number]=>p[1]!==null&&Number.isFinite(p[1]));
 if(points.length<2)return null;
 const values=points.map(p=>p[1]);
 const lo=Math.min(0,...values,threshold??0),hi=Math.max(format==='pct'?.1:1,...values,threshold??0);
 const y=(v:number)=>42-(v-lo)/(hi-lo||1)*35, right=width-48;
 const first=series[0][0],last=series.at(-1)![0],x=(t:number)=>(t-first)/(last-first||1)*right;
 let gap=true;
 const path=series.map(([t,v])=>{if(v===null||!Number.isFinite(v)){gap=true;return '';}const part=`${gap?'M':'L'}${x(t)},${y(v)}`;gap=false;return part;}).join(' ');
 const end=points.at(-1)!;const fmt=(v:number)=>formatMetric({value:v,format});
 return <figure ref={ref} className="mini-series"><figcaption>{label}<span>{first}–{last}</span></figcaption><svg viewBox={`0 0 ${width} 52`} aria-hidden="true">{threshold!==undefined&&<><path d={`M0 ${y(threshold)}H${right}`} stroke="var(--buy)" strokeDasharray="3 4"/><text x={right+5} y={Math.abs(y(end[1])-y(threshold))<14?(y(end[1])+4>28?y(end[1])-12:y(end[1])+20):y(threshold)+4} fill="var(--buy)">{fmt(threshold)}</text></>}<path d={path} fill="none" stroke="currentColor" strokeWidth="1.5"/><text x={right+5} y={y(end[1])+4}>{fmt(end[1])}</text></svg></figure>;
}
