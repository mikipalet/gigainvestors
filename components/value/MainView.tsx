'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ResultEntry } from '@/app/value/_components/ResultRow';
import { mainCompanies, mainZones, nextLayout, distanceLabel, distancePosition, returnLabel, type MainCompany } from '@/lib/value/main-layout';
import { sharePrice } from '@/lib/value/listing-details';
import { CompanyLogo } from './CompanyLogo';
import { ValueLink } from './ValueLink';
import { SidePanel } from './SidePanel';
import { PointerTooltip } from '@/components/PointerTooltip';

type List = 'next'|'middle'|'far'|'missing'|'all';
const titles:Record<List,string>={next:'Next closest',middle:'1.5–3× buy price',far:'3×+ buy price',missing:'Price unavailable',all:'All companies'};
export function MainView({entries,expectedReturns,year,allOpen,onCloseAll}:{entries:ResultEntry[];expectedReturns:Record<string,number|null>;year:string;allOpen:boolean;onCloseAll:()=>void}){
 const historical=year!=='Today';
 const companies=useMemo(()=>mainCompanies(entries,expectedReturns),[entries,expectedReturns]);
 const zones=useMemo(()=>mainZones(companies),[companies]);
 const [list,setList]=useState<List|null>(null);
 const [hover,setHover]=useState<{company:MainCompany;x:number;y:number}|null>(null);
 const ref=useRef<HTMLElement>(null),[size,setSize]=useState({width:0,height:0,phone:false});
 useEffect(()=>{const node=ref.current;if(!node)return;const observer=new ResizeObserver(([e])=>setSize({width:e.contentRect.width,height:e.contentRect.height,phone:window.innerWidth<768}));observer.observe(node);return()=>observer.disconnect();},[]);
 const layout=nextLayout(size.width,size.height,zones.next.length,size.phone);
 const shown=zones.next.slice(0,layout.capacity);
 const metric=historical?'Gain since then':'Expected return/yr';
 const open=(key:List)=>{setHover(null);setList(key);};
 const active=allOpen?'all':list;
 const listed=active==='all'?[...zones.buy,...zones.next,...zones.middle,...zones.far,...zones.missing]:active?zones[active]:[];
 const events=(c:MainCompany)=>({
  onPointerEnter:(e:React.PointerEvent<HTMLElement>)=>{if(e.pointerType!=='touch')setHover({company:c,x:e.clientX,y:e.clientY});},
  onPointerMove:(e:React.PointerEvent<HTMLElement>)=>{if(e.pointerType!=='touch')setHover({company:c,x:e.clientX,y:e.clientY});},
  onPointerLeave:()=>setHover(null),
  onFocus:(e:React.FocusEvent<HTMLElement>)=>{const r=e.currentTarget.getBoundingClientRect();setHover({company:c,x:r.left+r.width/2,y:r.bottom});},
  onBlur:()=>setHover(null),onKeyDown:(e:React.KeyboardEvent<HTMLElement>)=>{if(e.key==='Escape')setHover(null);},
 });
 const row=(c:MainCompany,kind:'buy'|'next'|'list',rank=0)=><ValueLink key={c.id} href={`/${c.id.toLowerCase()}`} className={`main-company main-${kind}-row`} data-company={c.id} data-return={c.returnValue??''} data-ratio={c.ratio??''} data-priority={kind==='buy'&&rank===0&&(!historical||(c.returnValue!==null&&c.returnValue>=0))} aria-label={`${c.name}. ${distanceLabel(c.ratio)}. ${metric}: ${returnLabel(c.returnValue)}. Open dossier.`} {...events(c)}>
  <CompanyLogo src={c.entry.row.lg} name={c.name} fallback="none"/>
  <span className="main-name">{c.name}</span>
  {kind!=='buy'&&<><span className="main-distance-bar" aria-hidden="true"><i/><b style={{width:`${distancePosition(c.ratio??1)*100}%`}}/><em style={{left:`${distancePosition(c.ratio??1)*100}%`}}/></span><span className="main-distance">{distanceLabel(c.ratio)}</span></>}
  <strong className="main-return" data-negative={c.returnValue!==null&&c.returnValue<0}>{returnLabel(c.returnValue)}</strong>
 </ValueLink>;
 return <section className={`main-view${zones.buy.length?'':' main-no-buys'}`} data-total={companies.length} data-buy-count={zones.buy.length} aria-label="Buying opportunities">
  <section className="main-buys" aria-label={historical?'Buy then':'Buy now'}>
   {zones.buy.length?<><header className="main-zone-heading"><h2>{historical?'Buy then':'Buy now'} <span>{zones.buy.length}</span></h2><span>{metric}</span></header><div className="main-buy-rows">{zones.buy.map((c,i)=>row(c,'buy',i))}</div></>:<p className="main-empty-buy">{historical?'Buy then':'Buy now'} · No picks in this view.</p>}
  </section>
  <section className="main-next" ref={ref} aria-label="Next closest">
   <header className="main-zone-heading"><h2>Next closest <span>{zones.next.length}</span></h2><span>{metric}</span></header>
   <div className="main-next-columns" style={{gridTemplateColumns:`repeat(${layout.columns},minmax(0,1fr))`}}>
    {Array.from({length:layout.columns},(_,column)=><div className="main-next-column" key={column}>
     <div className="main-distance-axis"><span>buy price</span><span>+20%</span><span>+50%</span></div>
     {shown.slice(column*layout.rows,(column+1)*layout.rows).map(c=>row(c,'next'))}
    </div>)}
   </div>
   {!zones.next.length&&<p className="main-empty">No companies within 50% of buy price.</p>}
   {zones.next.length>shown.length&&<button className="main-more" onClick={()=>open('next')}>+{zones.next.length-shown.length} more ↗</button>}
  </section>
  <section className="main-rest" aria-label="The rest"><header className="main-zone-heading"><h2>The rest</h2></header>
   {(['middle','far'] as const).map(band=><div className="main-rest-band" key={band} data-band={band}>
    <button className="main-band-title" onClick={()=>open(band)}><span>{titles[band]}</span><strong>{zones[band].length} <span aria-hidden="true">↗</span></strong></button>
    <div className="main-logo-strip">{zones[band].filter(c=>c.entry.row.lg).slice(0,40).map(c=><button key={c.id} className="main-logo-button" tabIndex={-1} aria-label={`${c.name}. Show ${titles[band]}`} onClick={()=>open(band)} {...events(c)}><CompanyLogo src={c.entry.row.lg} name={c.name} fallback="none"/></button>)}</div>
   </div>)}
   {!!zones.missing.length&&<button className="main-missing" onClick={()=>open('missing')}>{zones.missing.length} without a price ↗</button>}
  </section>
  {active&&<SidePanel wide title={`${titles[active]} · ${listed.length}`} onClose={()=>{setList(null);setHover(null);onCloseAll();}}><div className="main-full-list"><div className="main-list-heading"><span>Company · distance to buy price{historical?` in ${year}`:''}</span><span>{metric}</span></div>{listed.map(c=>row(c,'list'))}</div></SidePanel>}
  {hover&&<PointerTooltip x={hover.x} y={hover.y}><strong>{hover.company.name}</strong><div>{historical?`Price in ${year}`:'Price'} · {hover.company.price===null?'Unavailable':sharePrice(hover.company.price,hover.company.entry.row.cur)}</div><div>Buy price · {hover.company.buyPrice===null?'Unavailable':sharePrice(hover.company.buyPrice,hover.company.entry.row.cur)}</div><div>{distanceLabel(hover.company.ratio)}</div><div>{metric} · {returnLabel(hover.company.returnValue)}</div>{historical&&<div>Price gain, excluding dividends.</div>}</PointerTooltip>}
 </section>;
}
