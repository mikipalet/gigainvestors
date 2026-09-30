'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { ResultEntry } from '@/app/value/_components/ResultRow';
import { companyName } from '@/lib/value/presentation';
import { ownerReturn } from '@/lib/value/owner-return';
import { bandFor, bands, packSwarm, packFacets, pricePosition, priceTicks, returnPosition, returnTicks, shortName } from '@/lib/value/viz-layout';
import { Select } from '@/components/controls/Select';
import { CompanyLogo } from './CompanyLogo';
import { ValueLink } from './ValueLink';
import { PointerTooltip } from '@/components/PointerTooltip';

export const vizOptions=[['z','Treemap'],['a','Price swarm'],['b','Price bands'],['c','Ranked list'],['d','Return swarm']] as const;
type Company={entry:ResultEntry;id:string;name:string;ratio:number|null;expected:number|null;buy:boolean};
type Hover={company:Company;x:number;y:number};
type MarkProps={company:Company;children?:ReactNode;className?:string;style?:CSSProperties;priority?:boolean};
const pct=(n:number|null)=>n===null?'—':`${(n*100).toFixed(1)}%`;
const multiple=(n:number|null)=>n===null?'No comparable price':`${n.toFixed(2)}× buy price`;
function useSize(){
 const ref=useRef<HTMLDivElement>(null),[size,setSize]=useState({width:0,height:0});
 useEffect(()=>{const node=ref.current;if(!node)return;const observer=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(node);return()=>observer.disconnect();},[]);
 return {ref,...size};
}

export function VizLab({variant,entries,expectedReturns,year}:{variant:'a'|'b'|'c'|'d';entries:ResultEntry[];expectedReturns:Record<string,number|null>;year:string}){
 const [hover,setHover]=useState<Hover|null>(null);
 const companies=useMemo(()=>entries.map(entry=>{
  const {row,mos}=entry,ratio=mos===null?null:(1-mos)/(1-(row.m??.25));
  const expected=entry.historical?null:ownerReturn(row.ownerReturnInputs?.valuation??null,row.cur,row.ownerReturnInputs?.marketCapUsd??null,entry.quote)?.expected??expectedReturns[row.id]??null;
  return {entry,id:row.id,name:companyName(row),ratio:ratio!==null&&Number.isFinite(ratio)&&ratio>0?ratio:null,expected,buy:row.b===true&&row.t==='PPPPP'};
 }).sort((a,b)=>Number(b.buy)-Number(a.buy)||(a.buy&&b.buy?(b.expected??-Infinity)-(a.expected??-Infinity):0)||(a.ratio??Infinity)-(b.ratio??Infinity)||a.id.localeCompare(b.id)),[entries,expectedReturns]);
 const priority=companies.find(c=>c.buy)?.id;
 // A render function, not a nested component: logo state survives tooltip updates.
 const mark=({company:c,children,className='',style,priority:emphasis=false}:MarkProps)=><ValueLink key={c.id} href={`/${c.id.toLowerCase()}`} className={`lab-company ${className}`} style={style} data-company={c.id} data-buy={c.buy} data-priority={emphasis&&c.id===priority} aria-label={`${c.name}. ${c.buy?'Buy zone. ':''}${multiple(c.ratio)}. ${c.expected===null?'Expected annual return unavailable':`${pct(c.expected)} expected per year`}. Open company dossier.`} onPointerEnter={e=>setHover({company:c,x:e.clientX,y:e.clientY})} onPointerMove={e=>setHover({company:c,x:e.clientX,y:e.clientY})} onPointerLeave={()=>setHover(null)} onFocus={e=>{const r=e.currentTarget.getBoundingClientRect();setHover({company:c,x:r.left+r.width/2,y:r.top+r.height/2});}} onBlur={()=>setHover(null)} onKeyDown={e=>{if(e.key==='Escape')setHover(null);}}><CompanyLogo src={c.entry.row.lg} name={c.name} initials={1}/>{children}</ValueLink>;
 return <section className={`viz-lab lab-${variant}`} aria-label={`${vizOptions.find(([key])=>key===variant)?.[1]} visualization`} data-total={companies.length}>
  {variant==='b'?<BandView companies={companies} mark={mark} historical={year!=='Today'}/>:variant==='c'?<ListView companies={companies} mark={mark} historical={year!=='Today'}/>:<SwarmView companies={companies} mark={mark} returns={variant==='d'} historical={year!=='Today'}/>}
  {!companies.length&&<p className="lab-empty">No companies match. Try another filter or year.</p>}
  {hover&&<PointerTooltip x={hover.x} y={hover.y}><strong>{hover.company.name}</strong><div>{hover.company.buy?'Buy zone · passes quality + price':hover.company.ratio!==null&&hover.company.ratio<=1?'Below buy price · below the return hurdle':'Waiting for a better price'}</div><div>{multiple(hover.company.ratio)}</div><div>{hover.company.expected===null?'Expected annual return unavailable':`${pct(hover.company.expected)} expected / year (cash yield + growth)`}</div>{year!=='Today'&&<div>FY{year}; price ratio uses today’s buy discount. {pct(hover.company.entry.historicalReturn??null)} price gain since then, not annualised. Click for today’s dossier.</div>}<div>{hover.company.id} · {hover.company.entry.row.s??'Sector unavailable'}</div>{hover.company.entry.seed&&<div>Price estimated from market value.</div>}</PointerTooltip>}
 </section>;
}
type ViewProps={companies:Company[];mark:(props:MarkProps)=>ReactNode};
function Pager({page,pages,setPage,label}:{page:number;pages:number;setPage:(n:number)=>void;label:string}){
 return pages>1?<nav className="lab-pager" aria-label={label}><button aria-label={`Previous ${label}`} disabled={!page} onClick={()=>setPage(page-1)}>←</button><span>{page+1} / {pages}</span><button aria-label={`Next ${label}`} disabled={page>=pages-1} onClick={()=>setPage(page+1)}>→</button></nav>:null;
}
function SwarmView({companies,mark,returns,historical}:ViewProps&{returns:boolean;historical:boolean}){
 const {ref,width,height}=useSize(),[page,setPage]=useState(0),[showMissing,setShowMissing]=useState(false),[facet,setFacet]=useState('');
 const phone=width<600,pad=phone?16:150;
 const picks=useMemo(()=>companies.filter(c=>c.buy),[companies]);
 const mapped=useMemo(()=>companies.filter(c=>(returns?c.expected:c.ratio)!==null),[companies,returns]);
 const missing=useMemo(()=>companies.filter(c=>(returns?c.expected:c.ratio)===null),[companies,returns]);
 const unplottable=showMissing||!mapped.length;
 const position=returns?returnPosition:pricePosition,threshold=position(returns?.1:1);
 const plotHeight=Math.max(24,height-46);
 const {packed,diameter,lanes}=useMemo(()=>{
  let diameter=phone?20:30,packed:ReturnType<typeof packSwarm>=[];
  do {
   packed=packSwarm(mapped.map(c=>{const labelWidth=!phone&&c.buy?Math.min(140,shortName(c.name,18).length*7+8):0;return {id:c.id,x:pad+position((returns?c.expected:c.ratio)!)*Math.max(0,width-2*pad-diameter)-labelWidth,width:diameter+labelWidth,height:diameter};}),plotHeight,phone?2:3);
   if(packed.every(p=>p.page===0)||diameter<=(phone||returns?18:20))break;
   diameter-=2;
  } while(true);
  if(facet){
   const result=packFacets(mapped.map(c=>{const p=packed.find(p=>p.id===c.id)!;return {...p,facet:facet==='sector'?c.entry.row.s??'Unclassified':new Intl.DisplayNames(['en'],{type:'region'}).of(c.entry.row.c||'ZZ')??c.entry.row.c};}),plotHeight,phone?100:80,3);
   return {packed:result.points,diameter,lanes:result.lanes};
  }
  return {packed,diameter,lanes:[]};
 },[mapped,width,plotHeight,pad,position,returns,phone,facet]);
 const pages=Math.max(1,...packed.map(p=>p.page+1)),active=Math.min(page,pages-1);
 const byId=new Map(companies.map(c=>[c.id,c]));
 const ticks=(returns?returnTicks:priceTicks).filter(t=>!(phone&&returns&&t.value===1));
 const missingCell=phone?22:32,missingCapacity=Math.max(1,Math.floor(width/missingCell)*Math.floor(plotHeight/missingCell));
 const missingPages=Math.max(1,Math.ceil(missing.length/missingCapacity)),missingPage=Math.min(page,missingPages-1);
 return <>
  <div className="lab-buy-strip"><strong>{historical?'Buy then':'Buy now'} · {picks.length}</strong><div>{(phone||unplottable?picks:[]).map(c=>mark({company:c,priority:true,className:'lab-pick',children:<><span>{shortName(c.name,phone?14:25)}</span><b>{returns?pct(c.expected):c.ratio===null?'—':`${c.ratio.toFixed(2)}×`}</b></>}))}{!phone&&!unplottable&&!!picks.length&&<span>Named companies qualify. Hover any logo to compare.</span>}{!picks.length&&<span>No qualifying businesses in this view.</span>}</div></div>
  <header className="lab-chart-title"><h2>{returns?'Expected return / year':historical?'Price / reference buy price':'Price / buy price'}</h2><span>{returns?'Higher is better →':'← Closer to a buying opportunity'}</span><div className="lab-chart-actions">{!unplottable&&<Select label="Rows" value={facet} onChange={v=>{setFacet(v);setPage(0);}} options={[['','No rows'],['sector','Sector rows'],['country','Country rows']]}/>} {missing.length>0&&mapped.length>0&&<button onClick={()=>{setShowMissing(!showMissing);setPage(0);}}>{showMissing?'Back to axis':`${missing.length} ${returns?'without estimate':'without price'} ↗`}</button>}<Pager page={unplottable?missingPage:active} pages={unplottable?missingPages:pages} setPage={setPage} label="swarm pages"/></div></header>
  <div className="lab-swarm" ref={ref} data-mapped={mapped.length} data-missing={missing.length}>
   {width>0&&(unplottable?<><p className="lab-unavailable">{historical&&returns?'Historical expected returns were not published. These are the quality companies found then.':'No comparable estimate. Open a company to inspect its evidence.'}</p><div className="lab-missing-grid" style={{gridTemplateColumns:`repeat(auto-fill,${missingCell}px)`}}>{missing.slice(missingPage*missingCapacity,(missingPage+1)*missingCapacity).map(c=>mark({company:c,className:'lab-dot',style:{width:missingCell-2,height:missingCell-2}}))}</div></>:<>
    <div className="lab-buy-shade" style={returns?{left:pad+diameter/2+threshold*(width-2*pad-diameter),right:pad}:{left:pad,right:width-(pad+diameter/2+threshold*(width-2*pad-diameter))}}/>
    <div className="lab-threshold" style={{left:pad+diameter/2+threshold*(width-2*pad-diameter),bottom:42}}/>
    {lanes.filter(l=>l.page===active).map(l=><div key={l.name} className="lab-facet-label" style={{top:l.y,height:l.height}}><span>{l.name}</span></div>)}
    {packed.filter(p=>p.page===active).map(p=>{const c=byId.get(p.id)!;return mark({company:c,priority:!phone,className:!phone&&c.buy?'lab-dot lab-labelled':'lab-dot',style:{left:p.x,top:p.y,width:p.width,height:diameter},children:!phone&&c.buy?<span>{shortName(c.name,18)}</span>:undefined});})}
    <div className="lab-axis">{ticks.map(t=><span key={t.value} className={t.value===(returns?.1:1)?'lab-threshold-label':''} style={{left:pad+diameter/2+position(t.value)*(width-2*pad-diameter)}}>{historical&&!returns&&t.value===1?(phone?'Ref. buy':'Reference buy'):t.label}</span>)}</div>
   </>)}
  </div>
  <div className="lab-footnote">{returns?'Buy zone also requires price below buy price.':historical?'Historical prices / today’s buy discount. Named picks qualified then.':'Expanded scale near buy price.'} {unplottable?`${missing.length} without ${returns?'return estimates':'comparable prices'}.`:`${packed.filter(p=>p.page===active).length} of ${companies.length} on this axis page${pages>1?' · more companies with arrows':''}.`}</div>
 </>;
}
function BandView({companies,mark,historical}:ViewProps&{historical:boolean}){
 const {ref,width,height}=useSize(),phone=width<600,[page,setPage]=useState(0);
 const groups=bands.map((band,i)=>({...band,companies:companies.filter(c=>bandFor(c.ratio,c.buy,historical)===i)})).filter((g,i)=>i<5||g.companies.length);
 // Phone uses complete-width rows: it makes much better use of the available area.
 let cell=phone?22:32;
 if(phone)while(cell>15&&groups.reduce((sum,g)=>sum+30+Math.max(1,Math.ceil((g.companies.length+(g.label==='Buy now'&&g.companies.length?Math.ceil(120/cell)-1:0))/Math.max(1,Math.floor(width/cell))))*cell,0)>height)cell-=1;
 const gridColumns=Math.max(1,Math.floor(width/cell));
 const naturalHeight=groups.reduce((sum,g)=>sum+30+Math.max(1,Math.ceil((g.companies.length+(g.label==='Buy now'&&g.companies.length?Math.ceil(120/cell)-1:0))/gridColumns))*cell,0);
 const phoneOverflow=phone&&naturalHeight>height;
 const extraRows=Math.max(0,Math.floor((height-groups.length*30)/cell)-groups.length);
 const capacities=groups.map((g,i)=>phoneOverflow?Math.max(1,(1+Math.floor(extraRows*g.companies.length/Math.max(1,companies.length)))*gridColumns-(i===0?Math.ceil(120/cell)-1:0)):phone?Math.max(1,g.companies.length):Math.max(1,Math.floor((width/groups.length-16)/18)*Math.floor((height-48)/18)));
 const pages=Math.max(1,...groups.map((g,i)=>Math.ceil(g.companies.length/capacities[i]))),active=Math.min(page,pages-1);
 return <><header className="lab-chart-title"><h2>How close to buy price?</h2><span>Closest first →</span><Pager page={active} pages={pages} setPage={setPage} label="band pages"/></header><div ref={ref} className={`lab-bands ${phone?'lab-bands-phone':''}`}>
  {width>0&&groups.map((g,i)=>{
   const groupWidth=phone?width:width/groups.length-16;
   const cols=Math.max(1,Math.floor(groupWidth/cell));
   const canName=!phone&&g.companies.length*30<height-50;
   const actualCell=phone?cell:Math.max(18,Math.min(cell,Math.floor((height-48)/Math.max(1,Math.ceil(g.companies.length/cols)))));
   return <section className="lab-band" key={g.label} data-band={i}><h3>{historical&&i===0?'Buy then':g.label} <span>{g.companies.length}</span></h3><div className={`lab-band-grid ${canName?'lab-band-named':''}`} style={canName?undefined:{gridTemplateColumns:`repeat(auto-fill,${actualCell}px)`,gridAutoRows:actualCell}}>
    {g.companies.slice(active*capacities[i],(active+1)*capacities[i]).map((c,j)=>{const lead=phone&&i===0&&j===0;return mark({company:c,priority:true,className:canName?'lab-band-name':lead?'lab-dot lab-band-leader':'lab-dot',style:canName?undefined:lead?{width:Math.ceil(120/actualCell)*actualCell-2,height:actualCell-2,gridColumn:`span ${Math.ceil(120/actualCell)}`}:{width:actualCell-2,height:actualCell-2},children:canName||lead?<span>{shortName(c.name,lead?12:Math.floor((groupWidth-40)/7.5))}</span>:undefined});})}
    {!g.companies.length&&<span className="lab-band-empty">None</span>}
   </div></section>;
  })}
 </div><div className="lab-footnote">{historical?'Buy then follows the published picks. Other bands use today’s buy discount.':phone?'Tap a logo for company details.':'Hover a logo for its name and price.'}</div></>;
}
function ListView({companies,mark,historical}:ViewProps&{historical:boolean}){
 const {ref,width,height}=useSize(),[page,setPage]=useState(0);
 const columns=width<650?1:width<1100?3:5,rowHeight=width<650?23:14;
 const rowCount=Math.max(1,Math.floor((height-26)/rowHeight)),capacity=columns*rowCount,pages=Math.max(1,Math.ceil(companies.length/capacity)),active=Math.min(page,pages-1),shown=companies.slice(active*capacity,(active+1)*capacity);
 const nameLength=Math.max(8,Math.floor(((width-(columns-1)*20)/columns-12-165)/7.5));
 return <><header className="lab-chart-title"><h2>Closest to a buying opportunity</h2><span>{active*capacity+1}–{Math.min((active+1)*capacity,companies.length)} of {companies.length}</span><Pager page={active} pages={pages} setPage={setPage} label="ranked pages"/></header><div className="lab-list" ref={ref}>
  {width>0&&Array.from({length:columns},(_,i)=><div className="lab-list-column" key={i}><div className="lab-list-label"><span>Company</span><span>{historical?'Ref · 1×':'Buy · 1×'}</span><span>Return/yr</span></div>{shown.slice(i*rowCount,(i+1)*rowCount).map(c=>mark({company:c,priority:true,className:'lab-list-row',style:{height:rowHeight},children:<><span className="lab-row-name">{shortName(c.name,nameLength)}</span><span className="lab-mini-axis" aria-hidden="true"><i style={{left:`${pricePosition(1)*100}%`}}/>{c.ratio!==null&&<><b style={{left:0,width:`${pricePosition(c.ratio)*100}%`}}/><em style={{left:`${pricePosition(c.ratio)*100}%`}}/></>}</span><span className="lab-row-return">{pct(c.expected)}</span></>}))}</div>)}
 </div><div className="lab-footnote">Buy-zone companies first; then ranked by price / buy price. {historical?'Historical expected returns unavailable.':'Return = estimated cash yield + growth.'}</div></>;
}
