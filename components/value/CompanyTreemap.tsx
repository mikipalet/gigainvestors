'use client';
import { useEffect, useMemo, useState } from 'react';
import { Treemap } from '@/components/Treemap';
import { PointerTooltip } from '@/components/PointerTooltip';
import { CompanyLogo } from './CompanyLogo';
import { ValueLink } from './ValueLink';
import { buyColour, companyName, priceFraming } from '@/lib/value/presentation';
import type { ResultEntry } from '@/app/value/_components/ResultRow';

const distance=(e:ResultEntry)=>e.mos===null||e.row.dataQualityFlags?.length?Infinity:Math.abs((1-e.mos)/(1-(e.row.m??.25))-1);
const prioritiseBuy=(entry:ResultEntry)=>entry.row.b===true;

export function CompanyTreemap({entries,year,onTable,sort='cap'}:{entries:ResultEntry[];year:string;sort?:'cap'|'closest';onTable:()=>void}) {
 const [hover,setHover]=useState<{entry:ResultEntry;x:number;y:number}|null>(null);
 const [tileLimit,setTileLimit]=useState(20);
 useEffect(()=>{const update=()=>setTileLimit(window.innerWidth<768?2:window.innerHeight<=900?3:window.innerWidth<1100?6:12);update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
 useEffect(()=>{const clear=(e:FocusEvent)=>{if(!(e.target as HTMLElement)?.closest('.company-treemap'))setHover(null);};document.addEventListener('focusin',clear);return()=>document.removeEventListener('focusin',clear);},[]);
 const frames=useMemo(()=>({[year]:[...entries].sort((a,b)=>sort==='closest'?distance(a)-distance(b):(b.row.mc??0)-(a.row.mc??0)).slice(0,sort==='closest'?Math.min(tileLimit,6):tileLimit).map(entry=>({id:entry.row.id,value:sort==='closest'?1:entry.row.mc&&entry.row.mc>0?entry.row.mc:1,data:entry}))}),[entries,year,tileLimit,sort]);
 const renderTile=(entry:ResultEntry,rect:{w:number;h:number})=>{
  const {row,mos}=entry,name=companyName(row),ratio=mos===null||row.dataQualityFlags?.length?null:(1-mos)/(1-(row.m??.25));
  const colours=buyColour(row.dataQualityFlags?.length?null:ratio);
  const compact=rect.w<150||rect.h<130, tiny=rect.w<45||rect.h<32, shallow=rect.h<60&&rect.w>90;
  const labelSize=compact?12:Math.min(22,Math.max(14,rect.w/15));
  const logoFits=shallow||!tiny&&rect.h>Math.ceil(name.length/(Math.max(20,rect.w-12)/(labelSize*.55)))*labelSize*1.15+42;
  return <ValueLink href={`/${row.id.toLowerCase()}`} className={`company-tile ${compact?'compact':''} ${tiny?'tiny':''} ${shallow?'shallow':''}`} data-buy={row.b===true} data-testid="company-tile" style={{background:colours.background,color:colours.color}} onPointerEnter={e=>setHover({entry,x:e.clientX,y:e.clientY})} onPointerMove={e=>setHover({entry,x:e.clientX,y:e.clientY})} onFocus={e=>{const r=e.currentTarget.getBoundingClientRect();setHover({entry,x:r.left+r.width/2,y:r.top+Math.min(r.height/2,30)});}} onBlur={()=>setHover(null)} aria-label={`${name}, ${row.id}. ${priceFraming(mos===null?null:1-mos,row.m).headline}. Open company review.`}>
   {logoFits&&<CompanyLogo src={row.lg} name={name}/>}
   <strong style={{fontSize:labelSize}}>{name}</strong>
   <span className="map-price">{ratio===null?'Value unavailable':ratio<=1?'At or below buy price':compact?`${ratio.toFixed(1)}x too high`:`${ratio.toFixed(1)}x its buy price, too expensive`}</span>
  </ValueLink>;
 };
 return <div className="company-treemap" data-sort={sort} onPointerLeave={()=>setHover(null)}>
 {sort==='closest'?<div className="equal-company-grid">{frames[year].map(frame=><div key={frame.id}>{renderTile(frame.data,{w:180,h:140})}</div>)}</div>:<Treemap frames={frames} q={year} floor={.025} compactTileArea={1} compactFloor={tileLimit===2?.45:.08} priority={prioritiseBuy} onMore={onTable} className="value-map-canvas" render={(entry,_tier,rect)=>renderTile(entry,rect)}/>}
 {!entries.length&&<div className="treemap-empty"><h2>No companies match this view.</h2><p>Try another year, country or include near misses.</p><button onClick={onTable}>Open the company list →</button></div>}
 {hover&&<PointerTooltip x={hover.x} y={hover.y}><strong>{companyName(hover.entry.row)}</strong><div>{hover.entry.row.id} · {hover.entry.row.t==='PPPPP'?'Passes all five quality tests':'Near miss: one quality test fails'}</div><div>{priceFraming(hover.entry.mos===null?null:1-hover.entry.mos,hover.entry.row.m).headline}</div><div>{priceFraming(hover.entry.mos===null?null:1-hover.entry.mos,hover.entry.row.m).fall}</div><small>{year==='Today'?'Click for 5 quality tests + price.':`FY${year} snapshot · click for today’s review.`}</small></PointerTooltip>}
 </div>;
}
