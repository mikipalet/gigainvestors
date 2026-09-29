'use client';
import { useState } from 'react';
import { PointerTooltip } from '@/components/PointerTooltip';
import { companyName, priceFraming } from '@/lib/value/presentation';
import type { ResultEntry } from '@/app/value/_components/ResultRow';
import { CompanyLogo } from './CompanyLogo';
import { ValueLink } from './ValueLink';
export function BuyZone({entries}:{entries:ResultEntry[]}) {
 const [hover,setHover]=useState<{entry:ResultEntry;x:number;y:number}|null>(null);
 return <section className="buy-zone" aria-labelledby="buy-zone-title"><header><div><p className="eyebrow">5 quality tests + price</p><h2 id="buy-zone-title">Buy zone <span>{entries.length}</span></h2></div><p>Quality businesses at a safety discount.</p></header><div className="buy-grid">{entries.map(entry=>{const {row,mos}=entry,name=companyName(row),price=priceFraming(mos===null?null:1-mos,row.m);return <ValueLink key={row.id} href={`/${row.id.toLowerCase()}`} className="buy-tile" data-testid="company-tile" data-buy="true" onPointerEnter={e=>setHover({entry,x:e.clientX,y:e.clientY})} onPointerMove={e=>setHover({entry,x:e.clientX,y:e.clientY})} onPointerLeave={()=>setHover(null)} onFocus={e=>{const r=e.currentTarget.getBoundingClientRect();setHover({entry,x:r.left+r.width/2,y:r.top+20});}} onBlur={()=>setHover(null)}><CompanyLogo src={row.lg} name={name}/><strong>{name}</strong><span>{price.headline}</span></ValueLink>;})}{!entries.length&&<p className="no-buys">No buy-zone companies in this view. Try another country or year.</p>}</div>{hover&&<PointerTooltip x={hover.x} y={hover.y}><strong>{companyName(hover.entry.row)}</strong><div>Buy zone · passes all 5 quality tests + price</div><div>{priceFraming(hover.entry.mos===null?null:1-hover.entry.mos,hover.entry.row.m).headline}</div><div>{priceFraming(hover.entry.mos===null?null:1-hover.entry.mos,hover.entry.row.m).fall}</div><small>{hover.entry.row.id} · {hover.entry.row.s??'Sector unavailable'}</small></PointerTooltip>}</section>;
}
