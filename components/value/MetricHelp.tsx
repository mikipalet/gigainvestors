'use client';
import { useState } from 'react';
import { PointerTooltip } from '@/components/PointerTooltip';
import { metricHelp } from '@/lib/value/metric-help';
export function MetricHelp({id,technical}:{id:string;technical:string}) {
 const [point,setPoint]=useState<{x:number;y:number}|null>(null);
 const help=metricHelp(id,technical);
 return <span className="plain-metric" tabIndex={0} aria-label={`${help.label}. ${help.technical}. Why it matters: ${help.why} ${help.source}`} onPointerEnter={e=>setPoint({x:e.clientX,y:e.clientY})} onPointerMove={e=>setPoint({x:e.clientX,y:e.clientY})} onPointerLeave={()=>setPoint(null)} onFocus={e=>{const r=e.currentTarget.getBoundingClientRect();setPoint({x:r.left,y:r.top+20});}} onBlur={()=>setPoint(null)}>{help.label} ⓘ{point&&<PointerTooltip {...point}><strong>{help.technical}</strong><div>Why it matters</div><div>{help.why}</div><small>{help.source}</small></PointerTooltip>}</span>;
}
