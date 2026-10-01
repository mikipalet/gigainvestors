'use client';
import { useEffect,useLayoutEffect,useMemo,useRef,useState } from 'react';
import { PointerTooltip } from '@/components/PointerTooltip';
import { sharePrice } from '@/lib/value/listing-details';
import { distancePosition,dropToBuy,mainCompanies,mainZones,returnLabel,type MainCompany } from '@/lib/value/main-layout';
import type { ResultEntry } from '@/lib/value/result-entry';
import { CompanyLogo } from './CompanyLogo';
import { PagedItems } from './PanelTabs';
import { SidePanel } from './SidePanel';
import { ValueLink } from './ValueLink';

export function MainView({entries,year,fast=false,loading=false}:{entries:ResultEntry[];year:string;fast?:boolean;loading?:boolean}){
 const historical=year!=='Today',metric=historical?'Gain since then':'Expected return / yr';
 const companies=useMemo(()=>mainCompanies(entries),[entries]);
 const zones=useMemo(()=>mainZones(companies),[companies]);
 const root=useRef<HTMLElement>(null),grid=useRef<HTMLDivElement>(null);
 const [size,setSize]=useState({columns:2,rows:1,phone:false,width:0});
 const [list,setList]=useState<{companies:MainCompany[];title:string}|null>(null);
 const [hover,setHover]=useState<{c:MainCompany;x:number;y:number}|null>(null);
 const [failedLogos,setFailedLogos]=useState<Set<string>>(()=>new Set());
 useEffect(()=>{
  const node=grid.current;if(!node)return;
  const observer=new ResizeObserver(([e])=>{
   const phone=window.innerWidth<768;
   const style=getComputedStyle(node);
   const columns=Number(style.getPropertyValue('--shelf-columns'))||2;
   const rows=Number(style.getPropertyValue('--shelf-rows'))||1;
   setSize({columns,rows,phone,width:root.current?.clientWidth??1200});
  });observer.observe(node);return()=>observer.disconnect();
 },[historical]);
 useEffect(()=>{setHover(null);setList(null);},[year]);
 const previous=useRef(new Map<string,DOMRect>()),previousYear=useRef(year);
 useLayoutEffect(()=>{
  const el=root.current;if(!el)return;
  const reduced=fast||previousYear.current===year||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const next=new Map<string,DOMRect>();
  const nodes=[...el.querySelectorAll<HTMLElement>('[data-company]')];
  nodes.forEach(node=>node.getAnimations().forEach(a=>a.cancel()));
  // Read all positions before starting animations, avoiding a layout per card.
  const positions=nodes.map(node=>({node,key:node.dataset.company!,now:node.getBoundingClientRect()}));
  positions.forEach(({node,key,now})=>{
   const old=previous.current.get(key);next.set(key,now);
   if(old&&!reduced&&(old.x!==now.x||old.y!==now.y))node.animate([{transform:`translate(${old.x-now.x}px, ${old.y-now.y}px)`},{transform:'translate(0, 0)'}],{duration:350,easing:'cubic-bezier(.2,.7,.2,1)'});
  });previous.current=next;previousYear.current=year;
 },[companies,size,fast,year]);
 const near=zones.next.slice(0,size.columns*size.rows),rest=[...zones.next.slice(near.length),...zones.rest];
 const logoCap=!size.width?0:size.phone?4:Math.min(8,Math.max(1,Math.floor((size.width-270)/38)));
 const logos=rest.filter(c=>c.entry.row.lg&&!failedLogos.has(c.entry.row.lg)).slice(0,logoCap);
 const remaining=rest.filter(c=>!logos.some(l=>l.id===c.id));
 const open=(items:MainCompany[],title:string)=>{setHover(null);setList({companies:items,title});};
 const events=(c:MainCompany)=>({
  onPointerEnter:(e:React.PointerEvent<HTMLElement>)=>{if(e.pointerType!=='touch')setHover({c,x:e.clientX,y:e.clientY});},
  onPointerMove:(e:React.PointerEvent<HTMLElement>)=>{if(e.pointerType!=='touch')setHover({c,x:e.clientX,y:e.clientY});},
  onPointerLeave:()=>setHover(null),
  onFocus:(e:React.FocusEvent<HTMLElement>)=>{const r=e.currentTarget.getBoundingClientRect();setHover({c,x:r.left+r.width/2,y:r.bottom});},
  onBlur:()=>setHover(null),onKeyDown:(e:React.KeyboardEvent<HTMLElement>)=>{if(e.key==='Escape')setHover(null);},
 });
 const status=(c:MainCompany)=>c.entry.row.businessChanged?(c.entry.row.thesisReason??'Wait for disclosure resolution'):c.buy?(historical?'Buy then':'Buy now'):dropToBuy(c.ratio);
 const price=(n:number|null,c:MainCompany)=>n===null?'':sharePrice(n,c.entry.row.cur);
 const card=(c:MainCompany,kind:'buy'|'next'|'list',rank=0)=><ValueLink key={c.id} href={`/${c.id.toLowerCase()}`} className={`main-company main-${kind}-row${kind==='buy'&&rank===0?' shelf-hero':''}`} data-testid="company-tile" data-company={c.id} data-return={c.returnValue??''} data-ratio={c.ratio??''} data-priority={kind==='buy'&&rank===0} aria-label={`${c.name}. ${status(c)}. ${metric}: ${returnLabel(c.returnValue)}. Open dossier.`} {...events(c)}>
  <div className="shelf-identity"><CompanyLogo src={c.entry.row.lg} name={c.name}/><span className="main-name">{c.name}</span></div>
  <div className="shelf-answer"><strong className="main-return" data-negative={c.returnValue!==null&&c.returnValue<0}>{returnLabel(c.returnValue)}</strong>{kind!=='buy'&&<span className="shelf-chip" data-thesis={c.entry.row.businessChanged||undefined}>{status(c)}</span>}</div>
  {kind==='buy'?<span className="shelf-price">Buy below {price(c.buyPrice,c)} · {historical?'Then':'Now'} {price(c.price,c)}</span>:kind==='next'?<>
   <div className="shelf-gauge" role="img" aria-label={`Price ${c.ratio!==null?Math.round((c.ratio-1)*100):0}% above buy price. Shared scale zero to 60 percent${c.ratio!==null&&c.ratio>1.6?', capped at 60 percent':''}.`}><span className="shelf-track"><i/><b style={{width:`${distancePosition(c.ratio!)*100}%`}}/><em style={{left:`${distancePosition(c.ratio!)*100}%`}}/></span><span className="shelf-scale"><span>Buy price</span><span>+60%{c.ratio!>1.6?'+':''}</span></span></div>
   {c.entry.row.quality&&<span className="shelf-quality" title={c.entry.row.quality.basis==='including-acquisitions'?'Owner earnings return on capital including goodwill and acquired intangibles':undefined}>{c.entry.row.quality.label} 10y <b>{c.entry.row.quality.value==='unlimited'?'∞':`${Math.round(c.entry.row.quality.value*100)}%`}</b></span>}
  </>:null}
 </ValueLink>;
 const buyLimit=size.phone?3:5;
 return <section ref={root} className={`main-view${zones.buy.length?'':' main-no-buys'}`} data-historical={historical} data-frame={year} data-fast={fast} data-total={companies.length} data-buy-count={zones.buy.length} aria-busy={loading} aria-label="Buying opportunities">
  <div className="shelf-body">
   {zones.buy.length?<section className="main-buys" data-many-buys={zones.buy.length>=4}><header className="main-zone-heading"><h2>{historical?'Buy then':'Buy now'} <span>{zones.buy.length}</span></h2><span>{metric}</span></header><div className="shelf-buy-grid">{zones.buy.slice(0,buyLimit).map((c,i)=>card(c,'buy',i))}</div>{zones.buy.length>buyLimit&&<button className="main-more" onClick={()=>open(zones.buy.slice(buyLimit),historical?'Buy then':'Buy now')}>+{zones.buy.length-buyLimit} more ↗</button>}</section>:<p className="main-empty-buy">{historical?'Buy then':'Buy now'} · No picks in this view.</p>}
   <section className="main-next"><header className="main-zone-heading"><h2>Next closest</h2><span>{metric}</span></header><div ref={grid} className="shelf-near-grid">{near.map(c=>card(c,'next'))}{!near.length&&<p className="main-empty">No priced companies in this view.</p>}</div></section>
  </div>
  <section className="main-rest" aria-label="The rest"><span>The rest <b>{rest.length}</b></span><div className="main-logo-strip">{logos.map(c=><ValueLink key={c.id} href={`/${c.id.toLowerCase()}`} data-company={c.id} className="shelf-logo" aria-label={`${c.name}. Open dossier.`} {...events(c)}><CompanyLogo src={c.entry.row.lg} name={c.name} fallback="none" onUnavailable={()=>setFailedLogos(previous=>new Set([...previous,c.entry.row.lg!]))}/></ValueLink>)}</div>{remaining.length>0&&<button className="main-more" onClick={()=>open(remaining,'The rest')}>+{remaining.length} more ↗</button>}</section>
  {list&&<SidePanel wide title={`${list.title} · ${list.companies.length}`} onClose={()=>{setList(null);setHover(null);}}><div className="main-full-list"><div className="main-list-heading"><span>Company · price drop to buy</span><span>{metric}</span></div><PagedItems size={size.phone?6:10} items={list.companies.map(c=>card(c,'list'))}/></div></SidePanel>}
  {hover&&<PointerTooltip x={hover.x} y={hover.y}><strong>{hover.c.name}</strong><div>{status(hover.c)}</div><div>{metric} · {returnLabel(hover.c.returnValue)}</div><div>{historical?`Price in ${year}`:'Price'} · {price(hover.c.price,hover.c)}</div>{!hover.c.entry.row.businessChanged&&<div>Buy below · {price(hover.c.buyPrice,hover.c)}</div>}{historical&&<div>Price gain · excluding dividends</div>}</PointerTooltip>}
 </section>;
}
