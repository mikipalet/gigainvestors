import type { Series } from '@/lib/value/types';
import { formatMetric, type MetricFormat } from '@/lib/value/metric-labels';
import { useWidth } from '@/lib/value/viz/use-width';
export function MiniSeries({ series, label, threshold, format='pct', better='higher' }: { series: Series; label: string; threshold?: number;format?:MetricFormat;better?:'higher'|'lower' }) {
 const {ref,width}=useWidth();
 const points=series.filter((p):p is [number,number]=>p[1]!==null&&Number.isFinite(p[1]));
 if(points.length<2)return null;
 const values=points.map(p=>p[1]);
 const lo=Math.min(0,...values,threshold??0),hi=Math.max(format==='pct'?.1:1,...values,threshold??0);
 const height=width<220?40:width<320?60:84;
 const top=8,bottom=height-18,left=36,right=width-7;
 const y=(v:number)=>bottom-(v-lo)/(hi-lo||1)*(bottom-top);
 const first=series[0][0],last=series.at(-1)![0],x=(t:number)=>left+(t-first)/(last-first||1)*(right-left);
 let gap=true;
 const path=series.map(([t,v])=>{if(v===null||!Number.isFinite(v)){gap=true;return '';}const part=`${gap?'M':'L'}${x(t)},${y(v)}`;gap=false;return part;}).join(' ');
 const fmt=(v:number)=>formatMetric({value:v,format});
 return <figure ref={ref} className="mini-series" aria-label={`${label}, ${first} to ${last}; ${better} is better. Shading marks the passing side.`}><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} by fiscal year`}>
 {threshold!==undefined&&<><rect data-good-side={better} x={left} y={better==='higher'?top:y(threshold)} width={right-left} height={better==='higher'?y(threshold)-top:bottom-y(threshold)} fill="var(--buy)" opacity=".12"/><path d={`M${left} ${y(threshold)}H${right}`} stroke="var(--buy)" strokeDasharray="3 3"/></>}
 <path d={`M${left} ${top}V${bottom}H${right}`} fill="none" stroke="var(--viz-grid)"/>
 <text x={left-5} y={top+4} textAnchor="end">{fmt(hi)}</text><text x={left-5} y={bottom+3} textAnchor="end">{fmt(lo)}</text>
 <path d={path} fill="none" stroke="currentColor" strokeWidth="1.8"/>
 <text x={left} y={height-2}>{first}</text><text x={right} y={height-2} textAnchor="end">{last}</text>
 </svg></figure>;
}
