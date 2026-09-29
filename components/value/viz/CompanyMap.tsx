'use client';
import { useEffect, useRef, useState } from 'react';
import type { ResultEntry } from '@/app/value/_components/ResultRow';
import { displayName } from '@/lib/value/presentation';
import { compactMoney } from '@/lib/value/viz/layout';
import { valueHref } from '@/lib/value/href';
import { ValueLink } from '../ValueLink';
export function CompanyMap({ entries, onTable }: { entries:ResultEntry[]; onTable:()=>void }) {
 const ref=useRef<HTMLElement>(null), [size,setSize]=useState({width:1000,height:550}),[active,setActive]=useState<string|null>(null);
 useEffect(()=>{const o=new ResizeObserver(([e])=>setSize({width:e.contentRect.width,height:e.contentRect.height}));if(ref.current)o.observe(ref.current);return()=>o.disconnect();},[]);
 const touch=useRef(false),touchNavigate=useRef(false);
 const {width:w,height:h}=size, mobile=w<600;
 const pad={left:mobile?43:70,right:mobile?18:45,top:125,bottom:mobile?112:70};
 const x=(v:number)=>pad.left+(Math.log(v)-Math.log(.2))/Math.log(100)*(w-pad.left-pad.right);
 const y=(v:number)=>h-pad.bottom-Math.min(1,Math.max(0,v))*(h-pad.top-pad.bottom);
 const valid=entries.filter(e=>!e.row.dataQualityFlags?.length&&e.quote!==null&&e.row.v&&e.row.v[1]>0&&e.quote/e.row.v[1]>=.2&&e.quote/e.row.v[1]<=20&&e.row.returnInfo?.sort!=null&&Number.isFinite(e.row.returnInfo.sort)&&e.row.returnInfo.sort<Number.MAX_VALUE&&!/nonpositive|not reported|data arriving/i.test(e.row.returnInfo.label)&&e.row.returnInfo.sort>=0);
 const points=[...valid].sort((a,b)=>(b.row.mc??0)-(a.row.mc??0)).map(e=>({...e,cx:x(e.quote!/e.row.v![1]),cy:y(e.row.returnInfo!.sort),r:Math.max(3,Math.min(mobile?17:25,Math.sqrt((e.row.mc??1e9)/1e12)*23+3))}));
 const selected=points.find(e=>e.row.id===active);
 const mapName=(name:string)=>{const full=displayName(name);return full.length>25?full.slice(0,23)+'…':full;};
 const occupied:Array<{x:number;y:number;width:number}>=[];
 const labels=new Map<string,{x:number;y:number;width:number}>();
 for(const p of points){if(labels.size>=(mobile?4:12))break;const name=mapName(p.row.n);const lw=name.length*7;const lx=Math.min(w-pad.right-lw,Math.max(pad.left,p.cx+p.r+5));const ly=p.cy-8; if(occupied.some(b=>lx<b.x+b.width+10&&lx+lw>b.x-10&&Math.abs(ly-b.y)<23))continue;const box={x:lx,y:ly,width:lw};labels.set(p.row.id,box);occupied.push(box);}
 return <figure className="company-map" ref={ref} aria-labelledby="map-title"><figcaption><h1 id="map-title">Quality, at what price?</h1><p>{points.length} plotted · size = market cap · <button onClick={onTable}>{entries.length-points.length} unplotted / table ↗</button></p></figcaption>
 <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} aria-label="Company price to value and return map">
  <rect x={pad.left} y={pad.top} width={x(.5)-pad.left} height={h-pad.top-pad.bottom} fill="var(--viz-buy-tint)"/>
  <rect x={x(.5)} y={pad.top} width={x(.75)-x(.5)} height={h-pad.top-pad.bottom} fill="var(--viz-buy-tint)" opacity=".45"/>
  {[0,.25,.5,.75,1].map(v=><g key={v}><path d={`M${pad.left} ${y(v)}H${w-pad.right}`} stroke="var(--viz-grid)"/><text x={pad.left-9} y={y(v)+4} textAnchor="end">{v===1?'≥100':v*100}%</text></g>)}
  {(mobile?[.25,.5,1,2,5,20]:[.25,.5,1,2,5,10,20]).map(v=><g key={v}><path d={`M${x(v)} ${pad.top}V${h-pad.bottom}`} stroke={v===1?'var(--viz-muted)':'var(--viz-grid)'} strokeDasharray={v===1?'3 4':undefined}/><text x={x(v)} y={h-pad.bottom+23} textAnchor="middle">{v}×</text></g>)}
  <text x={pad.left} y={pad.top-14}>Return on capital / equity ↑</text><text x={(w+pad.left-pad.right)/2} y={h-pad.bottom+46} textAnchor="middle">Price / mid value · log scale →</text>
  <text x={pad.left+8} y={h-pad.bottom-12} className="map-zone-label">Buy zone*</text>
  {[...points].reverse().map(p=><a key={p.row.id} href={valueHref(`/${p.row.id.toLowerCase()}`)} aria-label={`${displayName(p.row.n)} · ${(p.quote!/p.row.v![1]).toFixed(2)} times value · ${p.row.returnInfo!.label}`} onPointerDown={e=>{touch.current=e.pointerType==='touch';touchNavigate.current=active===p.row.id;if(touch.current)setActive(p.row.id);}} onFocus={()=>setActive(p.row.id)} onMouseEnter={()=>setActive(p.row.id)} onKeyDown={e=>{if(e.key==='Escape')setActive(null);}} onClick={e=>{if(touch.current&&!touchNavigate.current){e.preventDefault();setActive(p.row.id);}}}><circle cx={p.cx} cy={p.cy} r={p.r} fill={p.row.t==='PPPPP'?'var(--ink)':'var(--paper)'} fillOpacity={active===p.row.id?1:.45} stroke={active===p.row.id?'var(--buy)':'var(--ink)'} strokeWidth={active===p.row.id?3:1}/><title>{displayName(p.row.n)} · {p.row.id}</title></a>)}
  {[...labels].map(([id,b])=><text key={id} x={b.x} y={b.y} className="map-company-label" pointerEvents="none">{mapName(points.find(p=>p.row.id===id)!.row.n)}</text>)}
 </svg>
 {selected?<div className="map-tooltip" role="tooltip"><ValueLink href={`/${selected.row.id.toLowerCase()}`}><strong>{displayName(selected.row.n)} ↗</strong></ValueLink><span>{selected.row.id} · {(selected.quote!/selected.row.v![1]).toFixed(2)}× value · {selected.row.returnInfo!.label}</span><span>{selected.row.mc==null?'Market cap unavailable':compactMoney(selected.row.mc,'USD')} · buy ≤ {(1-(selected.row.m??.25)).toFixed(2)}×</span><button aria-label="Dismiss company tooltip" onClick={()=>setActive(null)}>×</button></div>:<p className="map-key">*Buy ≤ 0.50–0.75×, depending on earnings stability.<br/>● Five quality passes · ○ One quality fail</p>}
 </figure>;
}
