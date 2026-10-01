'use client';
import {useState} from 'react';
import type {Company} from '@/lib/value/types';
import type {Relationship} from '@/lib/value/flags/types';
import {relationLabel,relationAmount} from '@/lib/value/flags/presentation';
import {CompanyLogo} from './CompanyLogo';
import {BusinessQuote} from './BusinessQuote';
export function RelationshipsMap({owner,relationships:input}:{owner:Company;relationships:Relationship[]}){
 const importance=(r:Relationship)=>(r.basis==='wikidata'?0:r.type==='subsidiary'?1:3)+(r.percent!=null?4:r.amount!=null?2:0);
 const relationships=[...input].sort((a,b)=>importance(b)-importance(a)||a.name.localeCompare(b.name));
 const [active,setActive]=useState<string|null>(relationships[0]?.id??null);
 const [hover,setHover]=useState<string|null>(null);
 const partners=[...new Map(relationships.map(r=>[r.from===owner.id?r.to:r.from,r])).values()].slice(0,6);
 const selected=relationships.find(r=>r.id===(hover??active));
 if(!relationships.length)return <p className="relationships-scope">Only specifically evidenced relationships appear here.</p>;
 return <div className="relationships-map">
  <div className="radial-network" aria-label={`Relationship map centred on ${owner.name}`}>
   <svg viewBox="0 0 360 320" aria-hidden="true">{partners.map((r,i)=>{const angle=(i/partners.length)*Math.PI*2-Math.PI/2,x=180+Math.cos(angle)*126,y=160+Math.sin(angle)*112;return <g key={r.id} className={(hover??active)===r.id?'active':''}><line x1={180} y1={160} x2={x} y2={y}/><line className="network-edge-hit" x1={180} y1={160} x2={x} y2={y} onClick={()=>setActive(r.id)} onMouseEnter={()=>setHover(r.id)} onMouseLeave={()=>setHover(null)}><title>{r.name} · {relationLabel(r,owner.id)} · {relationAmount(r,owner.id)}</title></line></g>;})}</svg>
   <div className="network-owner"><CompanyLogo src={owner.logo} name={owner.name}/><strong>{owner.code}</strong></div>
   {partners.map((r,i)=>{const angle=(i/partners.length)*Math.PI*2-Math.PI/2,x=50+Math.cos(angle)*35,y=50+Math.sin(angle)*35;return <button key={r.id} className="network-partner" data-external={(r.counterparty?.id??'external:').startsWith('external:')} data-active={active===r.id} style={{left:`${x}%`,top:`${y}%`}} onClick={()=>setActive(r.id)} onMouseEnter={()=>setHover(r.id)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(r.id)} onBlur={()=>setHover(null)} aria-label={`${r.name}, ${relationLabel(r,owner.id)}${relationAmount(r,owner.id)?', '+relationAmount(r,owner.id):''}`} aria-pressed={active===r.id}>
    <CompanyLogo src={r.counterparty?.logo} name={r.name}/><span>{r.name}</span>
   </button>;})}
  </div>
  {partners.length<new Set(relationships.map(r=>r.from===owner.id?r.to:r.from)).size&&<p className="relationships-scope">Six counterparties shown. The list includes every disclosed link in this view.</p>}
  {selected&&<article className="relationship-evidence" aria-live="polite"><h4>{selected.name} · {relationLabel(selected,owner.id)}</h4>{relationAmount(selected,owner.id)&&<p className="relationship-amount">{relationAmount(selected,owner.id)}</p>}<p className="relationship-confirmation">{selected.basis==='wikidata'?'Ownership link from Wikidata':selected.status==='confirmed'?'Confirmed in both companies’ filings':`Disclosed by ${selected.evidence[0].disclosedBy===owner.id?owner.name:selected.evidence[0].disclosedBy}`}{selected.period?` · ${selected.period}`:''}</p>{selected.evidence.map((e,i)=><BusinessQuote key={i} evidence={e}/>)}</article>}
  <ul className="relationship-list" aria-label="Disclosed relationships list">{relationships.map(r=><li key={r.id}><button onClick={()=>{setHover(null);setActive(r.id);}} aria-pressed={active===r.id}><span>{r.name}<small>{relationLabel(r,owner.id)}</small></span><span>{relationAmount(r,owner.id)||'↗'}</span></button></li>)}</ul>
 </div>;
}
