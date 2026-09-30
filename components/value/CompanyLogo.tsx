'use client';
import { useEffect, useRef, useState } from 'react';
export function CompanyLogo({src,name}:{src?:string|null;name:string}) {
 const ref=useRef<HTMLImageElement>(null);
 const [failed,setFailed]=useState<string|null>(null);
 useEffect(()=>{if(src&&ref.current?.complete&&!ref.current.naturalWidth)setFailed(src);},[src]);
 const local=src?.startsWith('https://icons.duckduckgo.com/ip3/')?`/api/value/logo?domain=${encodeURIComponent(src.split('/').at(-1)!.replace(/\.ico$/, ''))}`:src?.startsWith('https://eodhd.com/img/logos/')?`/api/value/logo?eod=${encodeURIComponent(src.slice('https://eodhd.com/img/logos/'.length))}`:src;
 return <span className={`company-logo ${!src||failed===src?'company-monogram':''}`} aria-hidden="true">{src&&failed!==src?<img ref={ref} src={local??undefined} width={64} height={64} loading="lazy" decoding="async" alt="" draggable={false} onError={()=>setFailed(src)}/>:<span>{name.split(/[^a-zA-Z0-9]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()}</span>}</span>;
}
