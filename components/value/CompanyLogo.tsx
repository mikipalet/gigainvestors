'use client';
import { useEffect, useRef, useState } from 'react';
export function CompanyLogo({src,name,initials=2,fallback='initials'}:{src?:string|null;name:string;initials?:1|2;fallback?:'initials'|'none'}) {
 const ref=useRef<HTMLImageElement>(null);
 const [failed,setFailed]=useState<string|null>(null);
 useEffect(()=>{if(src&&ref.current?.complete&&!ref.current.naturalWidth)setFailed(src);},[src]);
 if(fallback==='none'&&(!src||failed===src))return <span className="company-logo-empty" aria-hidden="true"/>;
 return <span className={`company-logo ${!src||failed===src?'company-monogram':''}`} aria-hidden="true">{src&&failed!==src?<img ref={ref} src={src.startsWith('https://icons.duckduckgo.com/ip3/')?`/api/value/logo?domain=${encodeURIComponent(src.split('/').at(-1)!.replace(/\.ico$/, ''))}`:src} alt="" draggable={false} onError={()=>setFailed(src)}/>:<span>{name.split(/[^a-zA-Z0-9]+/).filter(Boolean).slice(0,initials).map(w=>w[0]).join('').toUpperCase()}</span>}</span>;
}
