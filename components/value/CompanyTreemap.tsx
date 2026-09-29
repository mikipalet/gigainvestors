'use client';
import { useMemo, useState } from 'react';
import { Treemap } from '@/components/Treemap';
import { PointerTooltip } from '@/components/PointerTooltip';
import { CompanyLogo } from './CompanyLogo';
import { ValueLink } from './ValueLink';
import { buyColour, companyName } from '@/lib/value/presentation';
import type { ResultEntry } from '@/app/value/_components/ResultRow';

const prioritiseBuy=(entry:ResultEntry)=>entry.row.b===true;

export function CompanyTreemap({entries,year,onTable}:{entries:ResultEntry[];year:string;onTable:()=>void}) {
 const [hover,setHover]=useState<{entry:ResultEntry;x:number;y:number}|null>(null);
 const frames=useMemo(()=>({[year]:entries.map(entry=>({id:entry.row.id,value:entry.row.mc&&entry.row.mc>0?entry.row.mc:1,data:entry}))}),[entries,year]);
 return <div className="company-treemap" onPointerLeave={()=>setHover(null)}>
 <Treemap frames={frames} q={year} floor={.012} compactTileArea={18000} tileArea={14000} compactFloor={.045} priority={prioritiseBuy} onMore={onTable} className="value-map-canvas" render={(entry,tier,rect)=>{
  const {row,mos}=entry,name=companyName(row),ratio=mos===null?null:(1-mos)/(1-(row.m??.25));
  const colours=buyColour(row.dataQualityFlags?.length?null:ratio);
  const compact=rect.w<150||rect.h<130, tiny=rect.w<45||rect.h<32, shallow=rect.h<60&&rect.w>90;
  const labelSize=tiny?9:compact?Math.max(9,Math.min(10,(rect.w-12)/(Math.max(...name.split(/\s+/).map(w=>w.length))*.64))):Math.min(24,Math.max(13,rect.w/13));
  const logoFits=shallow||!tiny&&rect.h>Math.ceil(name.length/(Math.max(20,rect.w-12)/(labelSize*.55)))*labelSize*1.15+42;
  return <ValueLink href={`/${row.id.toLowerCase()}`} className={`company-tile ${compact?'compact':''} ${tiny?'tiny':''} ${shallow?'shallow':''}`} data-buy={row.b===true} data-testid="company-tile" style={{background:colours.background,color:colours.color}} onPointerEnter={e=>setHover({entry,x:e.clientX,y:e.clientY})} onPointerMove={e=>setHover({entry,x:e.clientX,y:e.clientY})} onFocus={e=>{const r=e.currentTarget.getBoundingClientRect();setHover({entry,x:r.left+r.width/2,y:r.top+Math.min(r.height/2,30)});}} onBlur={()=>setHover(null)} aria-label={`${name}, ${row.id}. ${row.b?'At or below the buy line':ratio===null?'Price unavailable':`${Math.round(Math.abs(ratio-1)*100)}% ${ratio<1?'below':'above'} the buy line`}. Open company review.`}>
   {logoFits&&<CompanyLogo src={row.lg} name={name}/>}
   <strong style={{fontSize:labelSize}}>{name}</strong>
   {!compact&&<span>{row.id}{row.b?' · At buy price':ratio===null?' · No price':` · ${Math.round(Math.abs(ratio-1)*100)}% ${ratio<=1?'below':'above'} buy line`}</span>}
  </ValueLink>;
 }}/>
 {!entries.length&&<div className="treemap-empty"><h2>No companies match this view.</h2><p>Try another year, country or include near misses.</p><button onClick={onTable}>Open the company list →</button></div>}
 {hover&&<PointerTooltip x={hover.x} y={hover.y}><strong>{companyName(hover.entry.row)}</strong><div>{hover.entry.row.id} · {hover.entry.row.t==='PPPPP'?'Passes all five quality tests':'Near miss: one quality test fails'}</div><div>{hover.entry.row.b?'Qualifies at its buy price.':hover.entry.mos===null?'Comparable price unavailable.':`${((1-hover.entry.mos)/(1-(hover.entry.row.m??.25))).toFixed(2)}× its buy line. ${hover.entry.row.dataQualityFlags?.length?'Valuation needs verification.':'Does not qualify at a buy price.'}`}</div><small>{year==='Today'?'Click for the six-test review.':`FY${year} snapshot · click for today’s review.`}</small></PointerTooltip>}
 </div>;
}
