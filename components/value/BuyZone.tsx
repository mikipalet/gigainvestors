'use client';
import { useEffect, useState } from 'react';
import { PointerTooltip } from '@/components/PointerTooltip';
import { companyName, priceFraming, dateLabel } from '@/lib/value/presentation';
import type { ResultEntry } from '@/app/value/_components/ResultRow';
import { CompanyLogo } from './CompanyLogo';
import { ValueLink } from './ValueLink';
import { ownerReturn, expectedReturnCopy, requiredReturnCopy } from '@/lib/value/owner-return';
import { listingDetails, sharePrice } from '@/lib/value/listing-details';
import { westernTradingLabel } from '@/lib/value/western';
const returnFor=(entry:ResultEntry)=>entry.historical?null:ownerReturn(entry.row.ownerReturnInputs?.valuation??null,entry.row.cur,entry.row.ownerReturnInputs?.marketCapUsd??null,entry.quote);
export function BuyZone({entries}:{entries:ResultEntry[];allMarkets?:boolean}) {
 const [page,setPage]=useState(0),[pageSize,setPageSize]=useState(8);
 useEffect(()=>{const update=()=>setPageSize(window.innerWidth<768?2:window.innerWidth<1100||window.innerHeight<=900?4:8);update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
 // Missing returns come last. Historical cohorts retain historical-return ranking, never today's model.
 const ranked=[...entries].sort((a,b)=>(a.historical&&b.historical?(b.historicalReturn??-Infinity)-(a.historicalReturn??-Infinity):(returnFor(b)?.expected??-Infinity)-(returnFor(a)?.expected??-Infinity))||a.row.id.localeCompare(b.row.id));
 const pages=Math.max(1,Math.ceil(ranked.length/pageSize)),current=Math.min(page,pages-1),visible=ranked.slice(current*pageSize,current*pageSize+pageSize);
 const [hover,setHover]=useState<{entry:ResultEntry;x:number;y:number}|null>(null);
 const hoveredOwner=hover?returnFor(hover.entry):null;
 return <section className="buy-zone" aria-labelledby="buy-zone-title">
  <header><h2 id="buy-zone-title">Buy zone <span>{entries.length}</span></h2>{pages>1&&<nav className="buy-pager" aria-label="Buy-zone pages"><button aria-label="Previous buy-zone companies" disabled={current===0} onClick={()=>setPage(current-1)}>←</button><span>{current+1}/{pages}</span><button aria-label="Next buy-zone companies" disabled={current===pages-1} onClick={()=>setPage(current+1)}>→</button></nav>}</header>
  <div className="buy-grid">{visible.map((entry,i)=>{const {row}=entry,name=companyName(row),owner=returnFor(entry),rank=current*pageSize+i+1;
   const detail=owner?expectedReturnCopy(owner,row.ownerReturnInputs?.valuation??null,row.c):requiredReturnCopy(row.ownerReturnInputs?.valuation??null,row.c);
   return <ValueLink key={row.id} href={`/${row.id.toLowerCase()}`} className="buy-tile" data-testid="company-tile" data-buy="true" data-priority={rank===1} data-rank={rank} title={`${detail} · ${westernTradingLabel(row.w,row.id,row.exchange)??listingDetails(row).exchange}`} onPointerEnter={e=>setHover({entry,x:e.clientX,y:e.clientY})} onPointerMove={e=>setHover({entry,x:e.clientX,y:e.clientY})} onPointerLeave={()=>setHover(null)} onFocus={e=>{const r=e.currentTarget.getBoundingClientRect();setHover({entry,x:r.left+r.width/2,y:r.top+20});}} onBlur={()=>setHover(null)}>
    <span className="buy-rank" aria-label={`Rank ${rank}`}>{rank}</span><CompanyLogo src={row.lg} name={name}/><strong>{name}</strong>
    <span className="buy-return-compact"><b>{entry.historical?(entry.historicalReturn==null?'—':`${(entry.historicalReturn*100).toFixed(1)}%`):owner?`${(owner.expected*100).toFixed(1)}%`:'—'}</b> <span>{entry.historical?'gain since then':'expected / year'}</span></span><span className="buy-verdict">Buy</span>
   </ValueLink>;
  })}{!entries.length&&<p className="no-buys">No buy-zone companies in this view. Try another country or year.</p>}</div>
  {hover&&<PointerTooltip x={hover.x} y={hover.y}><strong>{companyName(hover.entry.row)}</strong><div>Buy zone · passes all 5 quality tests + price</div><div>{hoveredOwner?expectedReturnCopy(hoveredOwner,hover.entry.row.ownerReturnInputs?.valuation??null,hover.entry.row.c):'Historical pick; returns exclude dividends.'}</div><div>{priceFraming(hover.entry.mos===null?null:1-hover.entry.mos,hover.entry.row.m).headline}</div><div>{sharePrice(hover.entry.quote,hover.entry.row.cur)} · {westernTradingLabel(hover.entry.row.w,hover.entry.row.id,hover.entry.row.exchange)??listingDetails(hover.entry.row).exchange}</div>{listingDetails(hover.entry.row).note&&<div>{listingDetails(hover.entry.row).note}</div>}{hover.entry.seed&&<div>Price estimated from market value on {dateLabel(hover.entry.date)}</div>}<small>{hover.entry.row.id} · {hover.entry.row.s??'Sector unavailable'}</small></PointerTooltip>}
 </section>;
}
