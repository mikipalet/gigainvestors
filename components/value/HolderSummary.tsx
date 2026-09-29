'use client';
import { useState } from 'react';
import { PointerTooltip } from '@/components/PointerTooltip';
export function HolderSummary({holders}:{holders:Array<{name:string;code:string}>}) {
 const [point,setPoint]=useState<{x:number;y:number}|null>(null);
 return <a className="holder-summary" href="https://gigainvestors.com" onPointerEnter={e=>setPoint({x:e.clientX,y:e.clientY})} onPointerMove={e=>setPoint({x:e.clientX,y:e.clientY})} onPointerLeave={()=>setPoint(null)} onFocus={e=>{const r=e.currentTarget.getBoundingClientRect();setPoint({x:r.left,y:r.bottom});}} onBlur={()=>setPoint(null)}>Held by {holders.length} tracked investor{holders.length===1?'':'s'} ⓘ{point&&<PointerTooltip {...point}><strong>Tracked investors</strong><div>{holders.map(h=>h.name).join(' · ')}</div><small>Explore their portfolios on gigainvestors.com</small></PointerTooltip>}</a>;
}
