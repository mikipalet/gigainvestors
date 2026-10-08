import {observationLabel} from '@/lib/value/observation-label';
import type {ProvisionalYear} from '@/lib/value/quality-ltm';
import { ChartInteraction } from './ChartInteraction';
import type { Series } from '@/lib/value/types';
import { formatMetric, isCapitalReturn, type MetricFormat } from '@/lib/value/metric-labels';
import { useWidth } from '@/lib/value/viz/use-width';
export function MiniSeries({ provisional, dense=false, series, label, threshold, format='pct', currency='', better='higher', height:requestedHeight=60, fluid=false }: { provisional?:ProvisionalYear; dense?:boolean; series: Series; label: string; threshold?: number;currency?:string;format?:MetricFormat;better?:'higher'|'lower';height?:number;fluid?:boolean }) {
 const {ref,width,height:availableHeight}=useWidth();
 const caption=fluid||threshold===undefined||label==='ROIC including acquisitions';
 const height=fluid?Math.max(50,availableHeight-(caption?22:0)):requestedHeight;
 const points=series.filter((p):p is [number,number]=>p[1]!==null&&Number.isFinite(p[1]));
 if(!points.length)return null;
 const values=points.map(p=>p[1]);
 const lo=Math.min(0,...values,threshold??0),hi=Math.max(format==='pct'?.1:1,...values,threshold??0);

 const fmt=(v:number)=>format==='pct'&&!isCapitalReturn(label)&&Math.abs(v*100)>=10000?`${(v*100).toExponential(1)}%`:formatMetric({value:v,format,currency,returnRatio:isCapitalReturn(label)});
 const axis=(v:number)=>fmt(v).replace(`${currency} `,'');
 const top=12,bottom=height-18,left=Math.min(Math.max(44,Math.max(axis(lo).length,axis(hi).length)*9+12),Math.max(44,width-90)),right=width-7;
 const y=(v:number)=>bottom-(v-lo)/(hi-lo||1)*(bottom-top);
 const first=series[0][0],last=series.at(-1)![0],x=(t:number)=>left+(t-first)/(last-first||1)*(right-left);
 const endLabel=provisional?.fy===last?provisional.label:String(last);
 const showFirst=right-left>(String(first).length+endLabel.length)*8+12;
 let gap=true,previous:number|null=null;
 const path=series.map(([t,v])=>{if(v===null||!Number.isFinite(v)){gap=true;return '';}const part=`${gap||previous!==t-1?'M':'L'}${x(t)},${y(v)}`;gap=false;previous=t;return part;}).join(' ');
 return <figure ref={ref} className="mini-series" data-series={JSON.stringify(series)} data-series-label={label} data-format={format} data-currency={currency} style={{visibility:fluid&&!availableHeight?'hidden':undefined}} aria-label={`${label}, ${first} to ${last}; ${threshold===undefined?'Annual observations.':`${better} is better. Shading marks the passing side.`}`}><ChartInteraction width={width} height={height} label={label} points={points.map(([fy,v])=>({x:x(fy),y:y(v),text:`${observationLabel(fy,provisional)} · ${label}: ${fmt(v)}${threshold===undefined?'':` · Passing bar ${better==='higher'?'≥':'≤'} ${fmt(threshold)}`}`}))}><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} by fiscal year`}>
 {threshold!==undefined&&<><rect data-good-side={better} x={left} y={better==='higher'?top:y(threshold)} width={right-left} height={better==='higher'?y(threshold)-top:bottom-y(threshold)} fill="var(--buy)" opacity=".12"/><path d={`M${left} ${y(threshold)}H${right}`} stroke="var(--buy)" strokeDasharray="3 3"/></>}
 {dense&&points.map(([fy,v])=><g key={fy}><path d={`M${x(fy)} ${top}V${bottom}`} stroke="var(--viz-grid)"/><circle cx={x(fy)} cy={y(v)} r="2" fill="currentColor"/></g>)}
 <path d={`M${left} ${top}V${bottom}H${right}`} fill="none" stroke="var(--viz-grid)"/>
 <text x={left-5} y={top+4} textAnchor="end">{axis(hi)}</text><text x={left-5} y={bottom+3} textAnchor="end">{axis(lo)}</text>
 {series.every(([,v])=>v!==null&&Number.isFinite(v))&&<path d={`${path} L${x(last)},${y(0)} L${x(first)},${y(0)} Z`} fill="var(--buy)" opacity=".16"/>}
 {points.length===1&&<circle cx={x(points[0][0])} cy={y(points[0][1])} r={3} fill="currentColor"/>}<path d={path} fill="none" stroke="currentColor" strokeWidth="1.8"/>
 <text x={left} y={height-2}>{showFirst?first:null}</text><text x={right} y={height-2} textAnchor="end">{endLabel}</text>
 </svg></ChartInteraction>{caption&&<figcaption>{label}</figcaption>}</figure>;
}
