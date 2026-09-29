'use client';
import { useEffect, useRef, useState } from 'react';
import type { ResultEntry } from '@/app/value/_components/ResultRow';
import { displayName } from '@/lib/value/presentation';
import { compactMoney } from '@/lib/value/viz/layout';
import { valueHref } from '@/lib/value/href';
import { ValueLink } from '../ValueLink';
const shortName=(name:string)=>{
 const full=displayName(name);
 const aliases:Record<string,string>={'Taiwan Semiconductor Manufacturing':'TSMC','Philip Morris International':'Philip Morris','Royal Bank of Canada':'RBC','UnitedHealth Group':'UnitedHealth','Luzhou Lao Jiao':'Luzhou Lao Jiao','Delta Electronics (Thailand)':'Delta Thailand','Infosys Ltd ADR':'Infosys','Shanxi Xinghuacun Fen Wine Factory':'Shanxi Fen Wine','Anhui Gujing Distillery':'Anhui Gujing','Hisense Kelon Electrical Holdings':'Hisense Kelon','Hisense Kelon Electrical':'Hisense Kelon','Beijing New Building Materials Public Ltd':'Beijing New Building','G-bits Network Technology Xiamen':'G-bits','Dashenlin Pharm Grp':'Dashenlin'};
 return aliases[full]??full.replace(/\s*\([^)]*\)/g,'').replace(/\s+(International|Holdings?|Group)$/i,'').split(' ').slice(0,3).join(' ');
};
export function CompanyMap({ entries, onTable, country }: { entries:ResultEntry[]; onTable:()=>void;country?:string }) {
 const ref=useRef<HTMLElement>(null),[size,setSize]=useState({width:1000,height:550}),[active,setActive]=useState<string|null>(null);
 useEffect(()=>{const o=new ResizeObserver(([e])=>setSize({width:e.contentRect.width,height:e.contentRect.height}));if(ref.current)o.observe(ref.current);return()=>o.disconnect();},[]);
 const touch=useRef(false),touchNavigate=useRef(false);
 const {width:w,height:h}=size,mobile=w<600;
 const pad={left:mobile?43:70,right:mobile?150:220,top:mobile?158:105,bottom:mobile?122:95};
 const x=(v:number)=>pad.left+(Math.log(Math.min(v,10))-Math.log(.2))/Math.log(50)*(w-pad.left-pad.right);
 const y=(v:number)=>h-pad.bottom-Math.min(1,Math.max(0,v))*(h-pad.top-pad.bottom);
 const valid=entries.filter(e=>!e.row.dataQualityFlags?.length&&e.quote!==null&&e.row.v&&e.row.v[1]>0&&e.quote/e.row.v[1]>=.2&&e.quote/e.row.v[1]<=20&&e.row.returnInfo?.sort!=null&&Number.isFinite(e.row.returnInfo.sort)&&e.row.returnInfo.sort<Number.MAX_VALUE&&!/nonpositive|not reported|data arriving/i.test(e.row.returnInfo.label)&&e.row.returnInfo.sort>=0);
 const points=[...valid].sort((a,b)=>(b.row.mc??0)-(a.row.mc??0)).map(e=>({...e,cx:x(e.quote!/e.row.v![1]),cy:y(e.row.returnInfo!.sort),buy:e.row.b===true,r:Math.max(mobile?2:3,Math.min(25,Math.sqrt((e.row.mc??1e9)/1e12)*23+3))*(mobile?.5:1)}));
 const heldForReview=entries.filter(e=>e.row.dataQualityFlags?.length);
 const selected=points.find(e=>e.row.id===active),buys=points.filter(p=>p.buy);
 const occupied:Array<{x:number;y:number;width:number}>=[],labels=new Map<string,{x:number;y:number;width:number}>();
 const priority=[...buys.sort((a,b)=>a.cy-b.cy),...(mobile?[]:points.filter(p=>!p.buy).slice(0,10))];
 for(const p of priority){
  const name=shortName(p.row.n),lw=name.length*(mobile?5.9:6.4);
  if(p.buy){const i=buys.indexOf(p);const box={x:w-pad.right+14,y:pad.top+14+i*(h-pad.top-pad.bottom-30)/Math.max(1,buys.length-1),width:lw};labels.set(p.row.id,box);occupied.push(box);continue;}
  const candidates=[];
  for(let dy=0;dy<200;dy+=20)for(const sign of [1,-1])for(const lx of [p.cx+p.r+8,p.cx-p.r-8-lw])candidates.push({x:lx,y:p.cy+sign*dy-9,width:lw});
  const box=candidates.find(b=>b.x>=pad.left+4&&b.x+lw<w-pad.right&&b.y>pad.top+12&&b.y<h-pad.bottom-22&&!occupied.some(a=>b.x<a.x+a.width+8&&b.x+lw>a.x-8&&Math.abs(b.y-a.y)<18)&&!points.some(c=>b.x<c.cx+c.r+3&&b.x+lw>c.cx-c.r-3&&b.y-12<c.cy+c.r+3&&b.y+3>c.cy-c.r-3));
  if(box){labels.set(p.row.id,box);occupied.push(box);}
 }
 return <figure className="company-map" ref={ref} aria-labelledby="map-title"><figcaption><h1 id="map-title">{buys.length} quality {buys.length===1?'company trades':'companies trade'} at a buy price</h1><p>{points.length} plotted · size = market cap · <button onClick={onTable}>{entries.length-points.length} unplotted / table ↗</button></p></figcaption>
 {!points.length&&<div className="map-empty"><strong>No {country==='JP'?'Japanese ':''}companies have a comparable price yet.</strong><button onClick={onTable}>{entries.length} companies are listed in the table ↗</button></div>}
 <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} aria-label="Company price to value and return map">
 <rect x={pad.left} y={pad.top} width={x(.75)-pad.left} height={Math.max(0,h-pad.top-pad.bottom)} fill="var(--viz-buy-tint)" opacity=".5"/>
 {[0,.25,.5,.75,1].map(v=><g key={v}><path d={`M${pad.left} ${y(v)}H${w-pad.right}`} stroke="var(--viz-grid)"/><text x={pad.left-9} y={y(v)+4} textAnchor="end">{v===1?'≥100':v*100}%</text></g>)}
 {[.25,.5,1,2,5,10].map(v=><g key={v}><path d={`M${x(v)} ${pad.top}V${h-pad.bottom}`} stroke={v===1?'var(--viz-muted)':'var(--viz-grid)'} strokeDasharray={v===1?'3 4':undefined}/><text x={x(v)} y={h-pad.bottom+21} textAnchor="middle">{v===10?'≥10':v}×</text></g>)}
 <text x={pad.left} y={pad.top-14}>Return on capital / equity ↑</text><text x={pad.left} y={h-pad.bottom+44} textAnchor="start">Price / mid value · log scale →</text>
 {[...labels].map(([id,b])=>{const p=points.find(p=>p.row.id===id)!;return <path key={id} d={`M${p.cx} ${p.cy}L${b.x-3} ${b.y-4}`} stroke={p.buy?'var(--buy)':'var(--viz-muted)'} opacity=".4" fill="none"/>;})}
 {[...points].reverse().map(p=><a key={p.row.id} href={valueHref(`/${p.row.id.toLowerCase()}`)} data-buy={p.buy} aria-label={`${displayName(p.row.n)} · ${(p.quote!/p.row.v![1]).toFixed(2)} times value · ${p.row.returnInfo!.label}`} onPointerDown={e=>{touch.current=e.pointerType==='touch';touchNavigate.current=active===p.row.id;if(touch.current)setActive(p.row.id);}} onFocus={()=>setActive(p.row.id)} onMouseEnter={()=>setActive(p.row.id)} onKeyDown={e=>{if(e.key==='Escape')setActive(null);}} onClick={e=>{if(touch.current&&!touchNavigate.current){e.preventDefault();setActive(p.row.id);}}}><circle cx={p.cx} cy={p.cy} r={p.r} fill={p.buy?'var(--buy)':p.row.t==='PPPPP'?'var(--viz-muted)':'var(--paper)'} fillOpacity={p.buy||active===p.row.id?1:.5} stroke={p.buy?'var(--buy)':'var(--ink)'} strokeDasharray={p.row.k==='operating'?undefined:'2 2'} strokeWidth={active===p.row.id?3:1}/><title>{`${displayName(p.row.n)} · ${p.row.id}`}</title></a>)}
 {[...labels].map(([id,b])=><text key={id} x={b.x} y={b.y} className="map-company-label" data-buy={points.find(p=>p.row.id===id)!.buy} fill={points.find(p=>p.row.id===id)!.buy?'var(--buy)':undefined} pointerEvents="none">{shortName(points.find(p=>p.row.id===id)!.row.n)}</text>)}
 </svg>
 <p className="map-key">Shading: possible buy zone · green dots meet their own buy line.<br/>{heldForReview.length>0?`${heldForReview.map(e=>shortName(e.row.n)).join(', ')}: unverified, held for review · `:''}Buy ≤ 0.50–0.75× · {points.some(p=>p.seed)?'est. prices included · ':''}{entries.some(e=>e.row.t!=='PPPPP')?'○ One quality fail · ':''}Dashed outline: financials</p>
 {selected&&<div className="map-tooltip" role="tooltip"><ValueLink href={`/${selected.row.id.toLowerCase()}`}><strong>{displayName(selected.row.n)} ↗</strong></ValueLink><span>{selected.row.id} · {(selected.quote!/selected.row.v![1]).toFixed(2)}×{selected.seed?' est.':''} mid value · {selected.row.k==='operating'?'ROIC':'ROE'} {selected.row.returnInfo!.label.replace(/^ROE /,'')}</span><span>{selected.row.mc==null?'Market cap unavailable':compactMoney(selected.row.mc,'USD')} · buy ≤ {(1-(selected.row.m??.25)).toFixed(2)}×</span><button aria-label="Dismiss company tooltip" onClick={()=>setActive(null)}>×</button></div>}
 </figure>;
}
