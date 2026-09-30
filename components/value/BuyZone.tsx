'use client';
import { useEffect, useState, useMemo } from 'react';
import { PointerTooltip } from '@/components/PointerTooltip';
import { companyName, priceFraming, dateLabel } from '@/lib/value/presentation';
import type { ResultEntry } from '@/app/value/_components/ResultRow';
import { CompanyLogo } from './CompanyLogo';
import { ValueLink } from './ValueLink';
import type { BrowserRow } from '@/lib/value/browser-view';
import { listingDetails, sharePrice } from '@/lib/value/listing-details';
import { westernTradingLabel } from '@/lib/value/western';
export function BuyZone({entries}:{entries:ResultEntry[];allMarkets?:boolean}) {
 const [page,setPage]=useState(0),[pageSize,setPageSize]=useState(8);
 useEffect(()=>{const update=()=>setPageSize(window.innerWidth<768?2:window.innerWidth<1100||window.innerHeight<=900?4:8);update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
 // Missing returns come last. Historical cohorts retain historical-return ranking, never today's model.
 const ranked=useMemo(()=>[...entries].sort((a,b)=>(a.historical&&b.historical?(b.historicalReturn??-Infinity)-(a.historicalReturn??-Infinity):((b.row as BrowserRow).expected??-Infinity)-((a.row as BrowserRow).expected??-Infinity))||a.row.id.localeCompare(b.row.id)),[entries]);
 const pages=Math.max(1,Math.ceil(ranked.length/pageSize)),current=Math.min(page,pages-1),visible=ranked.slice(current*pageSize,current*pageSize+pageSize);
 const [hover,setHover]=useState<{entry:ResultEntry;x:number;y:number}|null>(null);

 return <section className="buy-zone" data-count={entries.length} aria-labelledby="buy-zone-title">
  <header><h2 id="buy-zone-title">{`Buy zone · ${entries.length}`}</h2>{pages>1&&<nav className="buy-pager" aria-label="Buy-zone pages"><button aria-label="Previous buy-zone companies" disabled={current===0} onClick={()=>setPage(current-1)}>←</button><span>{current+1}/{pages}</span><button aria-label="Next buy-zone companies" disabled={current===pages-1} onClick={()=>setPage(current+1)}>→</button></nav>}</header>
  {entries.length>0&&<p className="buy-unit">{entries[0]?.historical?'Gain since then':'Expected / year'}</p>}
  <div className="buy-grid">{visible.map((entry,i)=>{const {row}=entry,name=companyName(row),rank=current*pageSize+i+1;
   const detail=(row as BrowserRow).returnCopy??'Expected return unavailable';
   return <ValueLink key={row.id} href={`/${row.id.toLowerCase()}`} className="buy-tile" data-testid="company-tile" data-buy="true" data-priority={rank===1} data-rank={rank} title={`${detail} · ${westernTradingLabel(row.w,row.id,row.exchange)??listingDetails(row).exchange}`} onPointerEnter={e=>setHover({entry,x:e.clientX,y:e.clientY})} onPointerMove={e=>setHover({entry,x:e.clientX,y:e.clientY})} onPointerLeave={()=>setHover(null)} onFocus={e=>{const r=e.currentTarget.getBoundingClientRect();setHover({entry,x:r.left+r.width/2,y:r.top+20});}} onBlur={()=>setHover(null)}>
    <CompanyLogo src={row.lg} name={name}/><strong>{name}</strong>
    <span className="buy-return-compact" data-negative={entry.historical && (entry.historicalReturn??0)<0}><b>{entry.historical?(entry.historicalReturn==null?'—':`${(entry.historicalReturn*100).toFixed(1)}%`):(row as BrowserRow).expected!=null?`${((row as BrowserRow).expected!*100).toFixed(1)}%`:'—'}</b> </span>
   </ValueLink>;
  })}{!entries.length&&<p className="no-buys">No buy-zone companies in this view. Try another country or year.</p>}</div>
  {hover&&<PointerTooltip x={hover.x} y={hover.y}><strong>{companyName(hover.entry.row)}</strong><div>Buy zone · passes all 5 quality tests + price</div><div>{(hover.entry.row as BrowserRow).returnCopy??'Historical pick; returns exclude dividends.'}</div><div>{priceFraming(hover.entry.mos===null?null:1-hover.entry.mos,hover.entry.row.m).headline}</div><div>{sharePrice(hover.entry.quote,hover.entry.row.cur)} · {westernTradingLabel(hover.entry.row.w,hover.entry.row.id,hover.entry.row.exchange)??listingDetails(hover.entry.row).exchange}</div>{listingDetails(hover.entry.row).note&&<div>{listingDetails(hover.entry.row).note}</div>}{hover.entry.seed&&<div>Price estimated from market value on {dateLabel(hover.entry.date)}</div>}<small>{hover.entry.row.id} · {hover.entry.row.s??'Sector unavailable'}</small></PointerTooltip>}
 </section>;
}
