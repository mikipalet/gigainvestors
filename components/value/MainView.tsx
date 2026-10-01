'use client';
import { PointerTooltip } from '@/components/PointerTooltip';
import { sharePrice } from '@/lib/value/listing-details';
import { distanceLabel,distancePosition,mainCompanies,mainZones,nextLayout,returnLabel,type MainCompany } from '@/lib/value/main-layout';
import type { ResultEntry } from '@/lib/value/result-entry';
import { useEffect,useMemo,useRef,useState } from 'react';
import { CompanyLogo } from './CompanyLogo';
import { PagedItems } from './PanelTabs';
import { SidePanel } from './SidePanel';
import { ValueLink } from './ValueLink';

type List = 'buy'|'next'|'middle'|'far';
const titles:Record<List,string>={buy:'Buy now',next:'Next closest',middle:'1.5–3× buy price',far:'3×+ buy price'};
export function MainView({entries,year,loading=false}:{entries:ResultEntry[];year:string;loading?:boolean}){
 const historical=year!=='Today';
 const companies=useMemo(()=>mainCompanies(entries),[entries]);
 const basis=companies.some(c=>c.basis==='value')?'estimated value':'buy price';
 const bandTitle=(band:List)=>titles[band].replace('buy price',basis==='estimated value'?'value':basis);
 const zones=useMemo(()=>mainZones(companies),[companies]);
 const [list,setList]=useState<List|null>(null);
 const [hover,setHover]=useState<{company:MainCompany;x:number;y:number}|null>(null);
 const ref=useRef<HTMLElement>(null),[size,setSize]=useState({width:0,height:0,phone:true});
 useEffect(()=>{const node=ref.current;if(!node)return;const observer=new ResizeObserver(([e])=>setSize({width:e.contentRect.width,height:e.contentRect.height,phone:window.innerWidth<1024}));observer.observe(node);return()=>observer.disconnect();},[]);
 const compactBuy=zones.buy.length<=3;
 const layout=nextLayout(size.width,size.height,zones.next.length,size.phone,compactBuy);
 const buyCapacity=size.phone?3:Math.min(8,Math.max(1,Math.floor((size.height-88)/44)));
 const [failedLogos,setFailedLogos]=useState<Set<string>>(()=>new Set());
 const logos=(band:'middle'|'far')=>zones[band].filter(c=>c.entry.row.lg).slice(0,size.phone?4:6).filter(c=>!failedLogos.has(c.entry.row.lg!));
 const logoCount=Math.max(...(['middle','far'] as const).map(band=>zones[band].filter(c=>c.entry.row.lg).slice(0,6).filter(c=>!failedLogos.has(c.entry.row.lg!)).length));
 const restWidth=Math.max(190,Math.min(280,logoCount*35-9+24));
 const shown=zones.next.slice(0,layout.capacity);
 const metric=historical?'Gain since then':'Expected return/yr';
 const open=(key:List)=>{setHover(null);setList(key);};
 const active=list;
 const listed=active?zones[active]:[];
 const events=(c:MainCompany)=>({
  onPointerEnter:(e:React.PointerEvent<HTMLElement>)=>{if(e.pointerType!=='touch')setHover({company:c,x:e.clientX,y:e.clientY});},
  onPointerMove:(e:React.PointerEvent<HTMLElement>)=>{if(e.pointerType!=='touch')setHover({company:c,x:e.clientX,y:e.clientY});},
  onPointerLeave:()=>setHover(null),
  onFocus:(e:React.FocusEvent<HTMLElement>)=>{const r=e.currentTarget.getBoundingClientRect();setHover({company:c,x:r.left+r.width/2,y:r.bottom});},
  onBlur:()=>setHover(null),onKeyDown:(e:React.KeyboardEvent<HTMLElement>)=>{if(e.key==='Escape')setHover(null);},
 });
 const row=(c:MainCompany,kind:'buy'|'next'|'list',rank=0)=><ValueLink key={c.id} href={`/${c.id.toLowerCase()}`} className={`main-company main-${kind}-row`} data-testid="company-tile" data-company={c.id} data-return={c.returnValue??''} data-ratio={c.ratio??''} data-priority={kind==='buy'&&rank===0&&(!historical||(c.returnValue!==null&&c.returnValue>=0))} aria-label={`${c.name}. ${distanceLabel(c.ratio)}. ${metric}: ${returnLabel(c.returnValue)}. Open dossier.`} {...events(c)}>
  <CompanyLogo src={c.entry.row.lg} name={c.name} fallback="none"/>
  <span className="main-name">{c.name}</span>
  {kind!=='buy'&&<><span className="main-distance-bar" aria-hidden="true"><i/><b style={{width:`${distancePosition(c.ratio??1)*100}%`}}/><em style={{left:`${distancePosition(c.ratio??1)*100}%`}}/></span><span className="main-distance">{distanceLabel(c.ratio)}</span></>}
  <strong className="main-return" data-negative={c.returnValue!==null&&c.returnValue<0}>{returnLabel(c.returnValue)}</strong>
 </ValueLink>;
 return <section className={`main-view${zones.buy.length?'':' main-no-buys'}${compactBuy?' main-few-buys':''}`} style={{'--rest-width':`${restWidth}px`} as React.CSSProperties} aria-busy={loading} data-measured={size.width>0} data-frame={year} data-total={companies.length} data-buy-count={zones.buy.length} aria-label="Buying opportunities">
  <section className="main-buys" aria-label={historical?'Buy then':'Buy now'}>
   {zones.buy.length?<><header className="main-zone-heading"><h2>{historical?'Buy then':'Buy now'} <span>{zones.buy.length}</span></h2><span>{metric}</span></header><div className="main-buy-rows">{zones.buy.slice(0,buyCapacity).map((c,i)=>row(c,'buy',i))}</div>{zones.buy.length>buyCapacity&&<button className="main-more" onClick={()=>open('buy')}>+{zones.buy.length-buyCapacity} more ↗</button>}</>:<p className="main-empty-buy">{historical?'Buy then':'Buy now'} · No picks in this view.</p>}
  </section>
  <section className="main-next" ref={ref} aria-label="Next closest">
   <header className="main-zone-heading"><h2>Next closest <span>{zones.next.length}</span></h2><span>{metric}</span></header>
   <div className="main-next-columns" data-sparse={zones.next.length<=10} style={{gridTemplateColumns:`repeat(${layout.columns},minmax(0,1fr))`,'--next-rows':layout.rows,'--initial-wide-rows':Math.ceil(Math.min(zones.next.length,20)/2),'--initial-narrow-rows':Math.min(zones.next.length,20)} as React.CSSProperties}>
    {Array.from({length:layout.columns},(_,column)=><div className="main-next-column" key={column}>
     <div className="main-distance-axis"><span>{basis}</span><span>+50%</span></div>
     {shown.slice(column*layout.rows,(column+1)*layout.rows).map(c=>row(c,'next'))}
    </div>)}
   </div>
   {!zones.next.length&&<p className="main-empty">No companies within 50% of {basis}.</p>}
   {zones.next.length>shown.length&&<button className="main-more" onClick={()=>open('next')}>+{zones.next.length-shown.length} more ↗</button>}
  </section>
  <section className="main-rest" aria-label="The rest"><header className="main-zone-heading"><h2>The rest</h2></header>
   {(['middle','far'] as const).map(band=><div className="main-rest-band" key={band} data-band={band}>
    <button className="main-band-title" onClick={()=>open(band)}><span>{bandTitle(band)}</span><strong>{zones[band].length} <span aria-hidden="true">↗</span></strong></button>
    <div className="main-logo-strip">{logos(band).map(c=><span key={c.id} className="main-logo-item" {...events(c)}><CompanyLogo src={c.entry.row.lg} name={c.name} fallback="none" onUnavailable={()=>setFailedLogos(previous=>new Set([...previous,c.entry.row.lg!]))}/></span>)}</div>
   </div>)}
  </section>
  {active&&<SidePanel wide title={`${active==='buy'&&historical?'Buy then':bandTitle(active)} · ${listed.length}`} onClose={()=>{setList(null);setHover(null);}}><div className="main-full-list"><div className="main-list-heading"><span>Company · distance to {basis}{historical?` in ${year}`:''}</span><span>{metric}</span></div><PagedItems key={active} size={size.phone?6:Math.max(4,Math.floor((size.height-100)/56))} items={listed.map(c=>row(c,'list'))}/></div></SidePanel>}
  {hover&&<PointerTooltip x={hover.x} y={hover.y}><strong>{hover.company.name}</strong>{hover.company.price!==null&&<div>{historical?`Price in ${year}`:'Price'} · {sharePrice(hover.company.price,hover.company.entry.row.cur)}</div>}{hover.company.buyPrice!==null&&<div>Buy price · {sharePrice(hover.company.buyPrice,hover.company.entry.row.cur)}</div>}{hover.company.ratio!==null&&<div>{distanceLabel(hover.company.ratio)} {hover.company.basis==='value'?'estimated value':'buy price'}</div>}{hover.company.returnValue!==null&&<div>{metric} · {returnLabel(hover.company.returnValue)}</div>}{historical&&<div>Price gain, excluding dividends.</div>}</PointerTooltip>}
 </section>;
}
