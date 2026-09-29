'use client';
import { useState, type ReactNode } from 'react';
import { PointerTooltip } from '@/components/PointerTooltip';
export function HolderLink({name,code,children}:{name:string;code:string;children:ReactNode}) {
 const [point,setPoint]=useState<{x:number;y:number}|null>(null);
 return <a href={`https://gigainvestors.com/${encodeURIComponent(code)}`} aria-label={`${name}’s portfolio on GigaInvestors`} onPointerMove={e=>setPoint({x:e.clientX,y:e.clientY})} onPointerLeave={()=>setPoint(null)} onFocus={e=>{const r=e.currentTarget.getBoundingClientRect();setPoint({x:r.left,y:r.bottom});}} onBlur={()=>setPoint(null)}>{children}{point&&<PointerTooltip {...point}><strong>{name}</strong><div>Tracked investor · view their disclosed portfolio on GigaInvestors</div></PointerTooltip>}</a>;
}
