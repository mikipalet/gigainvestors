'use client';
import { useEffect,useRef,useState } from 'react';
export function CompanyLogo({src,name,fallback='initials',onUnavailable}:{src?:string|null;name:string;fallback?:'initials'|'none';onUnavailable?:()=>void}) {
 const ref=useRef<HTMLImageElement>(null);
 const [failed,setFailed]=useState<string|null>(null);
 useEffect(()=>{if(src&&ref.current?.complete&&!ref.current.naturalWidth){setFailed(src);onUnavailable?.();}},[src,onUnavailable]);
 if(fallback==='none'&&(!src||failed===src))return <span className="company-logo-empty" aria-hidden="true"/>;
 const local=src?.startsWith('https://icons.duckduckgo.com/ip3/')?`/api/value/logo?domain=${encodeURIComponent(src.split('/').at(-1)!.replace(/\.ico$/, ''))}`:src?.startsWith('https://eodhd.com/img/logos/')?`/api/value/logo?eod=${encodeURIComponent(src.slice('https://eodhd.com/img/logos/'.length))}`:src;
 return <span className={`company-logo ${!src||failed===src?'company-monogram':''}`} aria-hidden="true">{src&&failed!==src?<img ref={ref} src={local??undefined} width={64} height={64} loading="lazy" decoding="async" fetchPriority="low" alt="" draggable={false} onError={()=>{setFailed(src);onUnavailable?.();}}/>:<span>{name.split(/[^a-zA-Z0-9]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()}</span>}</span>;
}
