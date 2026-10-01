'use client';
import type {ReactNode} from 'react';
import {PointerTooltip} from '@/components/PointerTooltip';
import {useChartInteraction,type ChartPoint} from './use-chart-interaction';
export type {ChartPoint} from './use-chart-interaction';
export function ChartInteraction({points,width,height,label,children,onActive,fallback=''}:{points:ChartPoint[];width:number;height:number;label:string;children:ReactNode;onActive?:(index:number|null)=>void;fallback?:string;above?:boolean;below?:boolean}){
 const interaction=useChartInteraction(points,width,height,onActive);
 return <div className="chart-interaction" style={{position:'relative'}}>
  <div style={{position:'relative',height}}>{children}<div ref={interaction.ref} role="group" aria-label={`${label}. Use arrow keys to explore.`} tabIndex={0} className="chart-hit-area" {...interaction.handlers} onClick={e=>e.stopPropagation()}/>
  {interaction.point&&<svg className="chart-crosshair" aria-hidden="true" viewBox={`0 0 ${width} ${height}`} style={{height}}><line x1={interaction.point.x} x2={interaction.point.x} y1={8} y2={height-18} stroke="var(--viz-muted)"/>{interaction.point.y!==undefined&&<circle cx={interaction.point.x} cy={interaction.point.y} r={4} fill="var(--paper)" stroke="var(--ink)"/>}</svg>}</div>
  {interaction.point&&interaction.position&&<PointerTooltip {...interaction.position}>{interaction.point.text}</PointerTooltip>}
  {fallback&&interaction.active===null&&<p className="chart-fallback">{fallback}</p>}
  <span className="sr-only" aria-live="polite">{interaction.point?.text}</span>
 </div>;
}
