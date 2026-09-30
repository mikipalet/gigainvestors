'use client';
import {useEffect,useLayoutEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {PointerTooltip} from '@/components/PointerTooltip';
import {mainCompanies,mainZones,returnLabel,type MainCompany} from '@/lib/value/main-layout';
import {sharePrice} from '@/lib/value/listing-details';
import {dropToBuy,radialRadius,sectorAngles,SECTORS,seriesPath,spreadLabels,type LabHistory} from '@/lib/value/viz-lab-three';
import type {ResultEntry} from '@/lib/value/result-entry';
import {CompanyLogo} from './CompanyLogo';
import {ValueLink} from './ValueLink';
import {SidePanel} from './SidePanel';
import {PagedItems} from './PanelTabs';

type Variant='s'|'b'|'a'|'k';
type Mark=(c:MainCompany,kind:string,children:ReactNode,style?:CSSProperties)=>ReactNode;
type ViewProps={companies:MainCompany[];width:number;height:number;phone:boolean;mark:Mark;more:(companies:MainCompany[],label?:string)=>ReactNode;historical:boolean;history:LabHistory|null;year:number};
let historyRequest:Promise<LabHistory>|undefined;
function loadHistory(){return historyRequest??=fetch('/api/value/lab-history').then(r=>{if(!r.ok)throw new Error('History unavailable');return r.json();}).catch(e=>{historyRequest=undefined;throw e;});}
const ordered=(companies:MainCompany[])=>[...companies].sort((a,b)=>Number(b.buy)-Number(a.buy)||(a.buy?(b.returnValue??-Infinity)-(a.returnValue??-Infinity):(a.ratio??Infinity)-(b.ratio??Infinity))||a.id.localeCompare(b.id));
const value=(c:MainCompany)=>returnLabel(c.returnValue);
const identity=(c:MainCompany)=><><CompanyLogo src={c.entry.row.lg} name={c.name}/><span className="lab-name">{c.name}</span></>;
const metric=(historical:boolean)=>historical?'Gain since then':'Expected return / yr';

export function VizLabThree({entries,year,variant,fast,loading}:{entries:ResultEntry[];year:string;variant:Variant;fast:boolean;loading:boolean}){
 const ref=useRef<HTMLElement>(null),[size,setSize]=useState({width:1000,height:600,phone:false});
 const [history,setHistory]=useState<LabHistory|null>(null),[historyError,setHistoryError]=useState(false);
 const [list,setList]=useState<{companies:MainCompany[];label:string}|null>(null);
 const [hover,setHover]=useState<{c:MainCompany;x:number;y:number}|null>(null),touch=useRef<string|null>(null),touchNavigate=useRef(false);
 const historical=year!=='Today';
 const companies=useMemo(()=>mainCompanies(entries).map(c=>c.basis==='value'?{...c,ratio:null}:c),[entries]);
 useEffect(()=>{const el=ref.current;if(!el)return;const observer=new ResizeObserver(([r])=>setSize({width:r.contentRect.width,height:r.contentRect.height,phone:window.innerWidth<768}));observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(variant!=='a'&&variant!=='k')return;let active=true;loadHistory().then(h=>{if(active)setHistory(h);}).catch(()=>{if(active)setHistoryError(true);});return()=>{active=false;};},[variant]);
 useEffect(()=>{setHover(null);setList(null);touch.current=null;},[year,variant]);
 const previous=useRef(new Map<string,DOMRect>());
 useLayoutEffect(()=>{
  const el=ref.current;if(!el)return;
  const reduced=fast||size.phone||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const next=new Map<string,DOMRect>();
  el.querySelectorAll<HTMLElement>('[data-company]').forEach(node=>{
   node.getAnimations().forEach(a=>a.cancel());
   const now=node.getBoundingClientRect(),old=previous.current.get(node.dataset.motionKey!);next.set(node.dataset.motionKey!,now);
   if(old&&!reduced&&(old.x!==now.x||old.y!==now.y))node.animate([{translate:`${old.x-now.x}px ${old.y-now.y}px`},{translate:'0px 0px'}],{duration:350,easing:'cubic-bezier(.2,.7,.2,1)'});
  });
  previous.current=next;
 },[companies,variant,size,fast,history]);
 const mark:Mark=(c,kind,children,style)=><ValueLink key={c.id} href={`/${c.id.toLowerCase()}`} className={`lab-mark ${kind}`} data-company={c.id} data-motion-key={`${variant==='s'||variant==='k'?'tile':kind}:${c.id}`} data-buy={c.buy} data-ratio={c.ratio??''} style={style} aria-label={`${c.name}. ${c.buy?(historical?'Buy then':'Buy now'):dropToBuy(c.ratio)}. ${metric(historical)} ${value(c)}. Open dossier.`}
  onPointerEnter={e=>{if(e.pointerType!=='touch')setHover({c,x:e.clientX,y:e.clientY});}} onPointerMove={e=>{if(e.pointerType!=='touch')setHover({c,x:e.clientX,y:e.clientY});}} onPointerLeave={()=>{if(!touch.current)setHover(null);}}
  onFocus={e=>{const r=e.currentTarget.getBoundingClientRect();setHover({c,x:r.left+r.width/2,y:r.bottom});}} onBlur={()=>setHover(null)} onKeyDown={e=>{if(e.key==='Escape'){setHover(null);touch.current=null;}}}
  onPointerDown={e=>{if(e.pointerType==='touch'){touchNavigate.current=touch.current===c.id;touch.current=c.id;setHover({c,x:e.clientX,y:e.clientY});}}}
  onClick={e=>{if(e.nativeEvent instanceof PointerEvent&&e.nativeEvent.pointerType==='touch'&&!touchNavigate.current)e.preventDefault();}}>{children}</ValueLink>;
 const more=(items:MainCompany[],label?:string)=>items.length>0?<button className="lab-more" onClick={()=>{setHover(null);setList({companies:items,label:label??'More companies'});}}>+{items.length} {label??'more'} ↗</button>:null;
 const props:ViewProps={companies,...size,mark,more,historical,history,year:historical?Number(year):new Date().getFullYear()};
 return <section ref={ref} className={`lab-three lab-${variant}`} data-variant={variant} data-frame={year} data-fast={fast} data-total={companies.length} data-history={history?'ready':historyError?'error':'loading'} aria-busy={loading} aria-label={{s:'The Shelf',b:'The Bullseye',a:'Arrivals',k:'Small multiples'}[variant]}>
  {variant==='s'?<Shelf {...props}/>:variant==='b'?<Bullseye {...props}/>:variant==='a'?<Arrivals {...props}/>:<Multiples {...props}/>}
  {historyError&&<span className="lab-history-error">History unavailable</span>}
  {list&&<SidePanel wide title={list.label} onClose={()=>{setList(null);setHover(null);}}><PagedItems size={size.phone?7:12} items={list.companies.map(c=>mark(c,'lab-list-row',<>{identity(c)}<span>{c.buy?'Buy now':dropToBuy(c.ratio)}</span><strong>{value(c)}</strong></>))}/></SidePanel>}
  {hover&&<PointerTooltip x={hover.x} y={hover.y}><strong>{hover.c.name}</strong><div>{hover.c.buy?(historical?'Buy then':'Buy now'):dropToBuy(hover.c.ratio)}</div><div>{metric(historical)} · {value(hover.c)}</div><div>Price · {hover.c.price===null?'Unavailable':sharePrice(hover.c.price,hover.c.entry.row.cur)}</div><div>Buy below · {hover.c.buyPrice===null?'Unavailable':sharePrice(hover.c.buyPrice,hover.c.entry.row.cur)}</div>{historical&&<div>Price gain · excluding dividends</div>}</PointerTooltip>}
 </section>;
}
function BuyRail({companies,mark,more,historical,phone}:ViewProps){
 const buys=ordered(companies.filter(c=>c.buy)),limit=phone?3:5;
 return <aside className="lab-buy-rail"><header><h2>{historical?'Buy then':'Buy now'} <span>{buys.length}</span></h2><span>{metric(historical)}</span></header>
 {buys.slice(0,limit).map((c,i)=>mark(c,`lab-answer ${i===0?'lab-primary':''}`,<>{identity(c)}<strong>{value(c)}</strong></>))}
 {!buys.length&&<p>No buys in this view.</p>}{more(buys.slice(limit))}</aside>;
}
function Shelf(p:ViewProps){
 const {companies,phone,width,height,mark,more,historical}=p,zones=mainZones(companies),buys=zones.buy;
 const waiting=ordered(companies.filter(c=>!c.buy&&c.ratio!==null));
 const columns=phone?2:width>1800?6:5,rows=phone?2:Math.max(2,Math.floor((height-130)/140));
 const capacity=phone?(buys.length<=1?6:4):Math.min(30,columns*rows);
 const near=waiting.slice(0,capacity),rest=[...waiting.slice(capacity),...zones.missing];
 const logoCap=phone?5:Math.max(8,Math.floor((width-220)/38));
 return <><div className="shelf-body"><section className="shelf-buys"><header><h2>{historical?'Buy then':'Buy now'} <span>{buys.length}</span></h2><span>{metric(historical)}</span></header><div className="shelf-buy-grid">
 {buys.slice(0,phone?3:5).map((c,i)=>mark(c,`shelf-tile ${i===0?'shelf-hero lab-primary':'shelf-secondary'}`,<><CompanyLogo src={c.entry.row.lg} name={c.name}/><span className="lab-name">{c.name}</span><strong>{value(c)}</strong>{i===0&&<span className="shelf-price">Buy below {c.buyPrice===null?'—':sharePrice(c.buyPrice,c.entry.row.cur)}<span className="shelf-divider"> · </span><br/>{historical?'Then':'Now'} {c.price===null?'—':sharePrice(c.price,c.entry.row.cur)}</span>}</>))}
 {!buys.length&&<p className="shelf-empty">No buys in this view.</p>}{more(buys.slice(phone?3:5))}</div></section>
 <section className="shelf-near"><header><h2>Next closest</h2><span>Price drop to buy</span></header><div className="shelf-near-grid" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`,gridTemplateRows:`repeat(${Math.ceil(near.length/columns)||1},minmax(0,1fr))`}}>
 {near.map(c=>mark(c,'shelf-near-tile',<>{identity(c)}<span className="lab-chip">{dropToBuy(c.ratio)}</span></>))}</div></section></div>
 <div className="shelf-wall"><span>The rest <b>{rest.length}</b></span><div>{rest.slice(0,logoCap).map(c=>mark(c,'lab-logo-only',<CompanyLogo src={c.entry.row.lg} name={c.name}/>))}</div>{more(rest.slice(logoCap),'more')}</div></>;
}
function Bullseye(p:ViewProps){
 const {companies,phone,width,height,mark,more}=p;
 const buys=companies.filter(c=>c.buy).length;
 const w=phone?width:width-340,h=phone?Math.max(160,Math.min(width,height-(Math.min(buys,3)*55+145+(buys>3?24:0)))):height-96;
 const cx=w/2,cy=h/2,outer=Math.max(80,Math.min(w/2-60,h/2-38)),unit=outer/3;
 const sorted=ordered(companies),shown:MainCompany[]=[],positions:{c:MainCompany;x:number;y:number;size:number}[]=[];
 for(const c of sorted){
  if(c.ratio===null||c.ratio>3||positions.length>=(phone?24:80))continue;
  const radius=radialRadius(c.ratio,unit),size=c.buy?(phone?30:42):phone?21:30;
  const angle=sectorAngles(c.entry.row.s),hash=[...c.id].reduce((n,ch)=>n+ch.charCodeAt(0),0);
  for(let attempt=0;attempt<19;attempt++){
   const theta=angle+.23*Math.sin(hash+attempt*2.4);
   const x=cx+Math.cos(theta)*radius,y=cy+Math.sin(theta)*radius;
   if(positions.every(pt=>Math.hypot(pt.x-x,pt.y-y)>(pt.size+size)/2+3)){
    positions.push({c,x,y,size});shown.push(c);break;
   }
  }
 }
 const labels=new Map<string,{left:number;top:number;width:number;height:number}>();
 const reserved=[{left:cx-36,top:cy-8,width:72,height:26},
  ...[1.5,2,3].map(r=>({left:cx-r*unit-45,top:cy+(r===1.5?-20:r===2?-3:22)-15,width:40,height:20})),
  ...SECTORS.map(s=>{const angle=sectorAngles(s),x=cx+Math.cos(angle)*(outer+22),y=cy+Math.sin(angle)*(outer+22);return {left:x-(Math.cos(angle)>.2?0:Math.cos(angle)<-.2?70:35),top:y-15,width:70,height:20};})];
 if(!phone){
  for(const pt of positions.filter(pt=>pt.c.buy||pt.c.ratio!<=1.5)){
   const lw=Math.min(170,Math.max(90,pt.c.name.length*7)),lh=Math.ceil(pt.c.name.length*7/lw)*16+(pt.c.buy?18:0)+6;
   for(const [dx,dy] of [[pt.size/2+8,-lh/2],[-lw-pt.size/2-8,-lh/2],[-lw/2,pt.size/2+6],[-lw/2,-lh-pt.size/2-6],...[60,100,140,180,220,...(pt.c.buy?[300,380]:[])].flatMap(distance=>Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4)*distance-lw/2,Math.sin(i*Math.PI/4)*distance-lh/2]))]){
    const box={left:pt.x+dx,top:pt.y+dy,width:lw,height:lh};
    const overlap=(b:{left:number;top:number;width:number;height:number})=>box.left<b.left+b.width+3&&box.left+lw+3>b.left&&box.top<b.top+b.height+3&&box.top+lh+3>b.top;
    if(box.left<0||box.left+lw>w||box.top<0||box.top+lh>h||[...labels.values(),...reserved].some(overlap)||positions.some(o=>overlap({left:o.x-o.size/2,top:o.y-o.size/2,width:o.size,height:o.size})))continue;
    labels.set(pt.c.id,box);break;
   }
  }
 }
 const near=ordered(companies.filter(c=>c.ratio!==null&&c.ratio>1&&c.ratio<=1.5)).slice(0,phone?2:5);
 const visible=new Set([...shown,...near,...sorted.filter(c=>c.buy).slice(0,phone?3:5)].map(c=>c.id));
 const remaining=sorted.filter(c=>!visible.has(c.id));
 return <><BuyRail {...p}/><div className="bullseye-panel"><div className="lab-chart-caption"><strong>Closer to the centre, closer to buying</strong><span>{phone?'Green = buy zone':'Price ÷ buy price'}</span></div><div className="bullseye-canvas" style={{height:h}}>
 <svg width={w} height={h} aria-hidden="true"><circle cx={cx} cy={cy} r={unit} fill="var(--lab-green)" opacity=".13"/>
 {[1,1.5,2,3].map(r=><g key={r}><circle cx={cx} cy={cy} r={r*unit} fill="none" stroke={r===1?'var(--lab-green)':'#1113'} strokeDasharray={r===1?undefined:'2 4'}/>{(!phone||r!==1.5)&&<text x={r===1?cx:cx-r*unit-5} y={r===1?cy+10:cy+(r===1.5?-20:r===2?-3:22)} textAnchor={r===1?'middle':'end'}>{r===1?(phone?'':'Buy zone'):`${r}×`}</text>}</g>)}
 {!phone&&SECTORS.map((s,i)=>{const a=sectorAngles(s);return <text key={s} x={cx+Math.cos(a)*(outer+22)} y={cy+Math.sin(a)*(outer+22)} textAnchor={Math.cos(a)>.2?'start':Math.cos(a)<-.2?'end':'middle'}>{['Tech','Media','Consumer','Staples','Health','Finance','Industry','Materials','Energy','Utilities','Property','Other'][i]}</text>;})}
 </svg>
 {positions.map(({c,x,y,size})=>{const label=labels.get(c.id);return mark(c,'bullseye-mark',<>{label&&<svg width={1} height={1} className="bullseye-leader" style={{left:size/2,top:size/2}} aria-hidden="true"><line x1={0} y1={0} x2={label.left-x+label.width/2} y2={label.top-y+label.height/2} stroke="#1115"/></svg>}<CompanyLogo src={c.entry.row.lg} name={c.name}/>{label&&<span className="bullseye-label" style={{left:label.left-x+size/2,top:label.top-y+size/2,width:label.width}}><span className="lab-name">{c.name}</span>{c.buy&&<strong>{value(c)}</strong>}</span>}</>,{left:x-size/2,top:y-size/2,width:size,height:size});})}
 </div><div className="bullseye-key">{near.map(c=>mark(c,'bullseye-near',<>{identity(c)}<span>{dropToBuy(c.ratio)}</span></>))}{more(remaining,'more')}</div></div></>;
}
function Arrivals(p:ViewProps){
 const {companies,width,height,phone,mark,more,history,year}=p;
 const buys=companies.filter(c=>c.buy).length;
 const w=phone?width:width-340,h=phone?Math.max(180,height-(Math.min(buys,3)*55+120+(buys>3?24:0))):height-85;
 const left=phone?24:90,right=phone?w-185:w-285,top=30,bottom=h-18;
 const y=(r:number)=>bottom-Math.min(3,Math.max(0,r))/3*(bottom-top),buyY=y(1);
 const points=ordered(companies).flatMap(c=>{const before=history?.[c.id]?.find(p=>p.year===year-1);return before?.ratio!=null&&c.ratio!==null?[{c,before:before.ratio,arrived:c.buy&&!before.buy,left:!c.buy&&before.buy}]:[];});
 const shown=points.filter(p=>p.c.ratio!<=3&&p.before<=3).slice(0,phone?10:36);
 const spacing=phone?70:42,labelInset=phone?32:18,capacity=Math.max(1,Math.floor((bottom-top-labelInset*2)/spacing)+1);
 const selected=[...shown].sort((a,b)=>Number(b.c.buy)-Number(a.c.buy)||Number(b.arrived)-Number(a.arrived)||Number(b.left)-Number(a.left)||a.c.ratio!-b.c.ratio!).slice(0,capacity);
 const labelled=spreadLabels(selected.map(pt=>({y:y(pt.c.ratio!),c:pt.c})),top+labelInset,bottom-labelInset,spacing);
 const arrived=points.filter(p=>p.arrived).length,leftCount=points.filter(p=>p.left).length;
 const leftLogos:{y:number;c:MainCompany}[]=[];
 for(const pt of shown){const yy=y(pt.before);if(leftLogos.every(l=>Math.abs(l.y-yy)>30))leftLogos.push({y:yy,c:pt.c});}
 const named=new Set([...labelled,...leftLogos].map(p=>p.c.id));
 const rest=companies.filter(c=>!named.has(c.id)&&!c.buy);
 return <><BuyRail {...p}/><div className="arrivals-panel"><div className="lab-chart-caption"><strong>{arrived} arrived · {leftCount} left</strong><span>{year-1} → {p.historical?year:'Today'} · price ÷ buy price</span></div>
 <div className="arrivals-canvas" style={{height:h}}><svg width={w} height={h} aria-hidden="true"><rect x={left} y={buyY} width={right-left} height={bottom-buyY} fill="var(--lab-green)" opacity=".1"/>
 {[1,2,3].map(r=><g key={r}><line x1={left} x2={right} y1={y(r)} y2={y(r)} stroke={r===1?'var(--lab-green)':'#1112'}/><text x={right-6} y={r===1?bottom-8:y(r)+17} textAnchor="end">{r===1?'Buy zone':`${r}×`}</text></g>)}
 <text x={left} y={15}>{year-1}</text><text x={right} y={15}>{p.historical?year:'Today'}</text>
 {shown.map(({c,before,arrived})=><g key={c.id} className="arrival-line" data-arrived={arrived}><path style={{d:`path("M ${left+13} ${y(before)} L ${right} ${y(c.ratio!)}")`}} fill="none" stroke={c.buy?'var(--lab-green)':'var(--ink)'} opacity={c.buy?1:.17} strokeWidth={c.buy?2.5:1}/><circle cx={left+13} cy={y(before)} r={c.buy?4:2} fill={c.buy?'var(--lab-green)':'#999'}/></g>)}
 {labelled.map(({c,y:yy,labelY})=><path key={`label-${c.id}`} d={`M ${right} ${yy} L ${right+20} ${labelY} H ${right+30}`} stroke={c.buy?'var(--lab-green)':'#999'} fill="none"/>)}
 </svg>
 {leftLogos.map(({c,y:yy})=>mark(c,'arrival-start',<CompanyLogo src={c.entry.row.lg} name={c.name}/>,{left:left-2,top:yy-14}))}
 {labelled.map(({c,labelY})=>mark(c,'arrival-label',<>{identity(c)}<strong>{value(c)}</strong></>,{left:right+24,top:labelY-(phone?30:18),width:w-right-28}))}
 </div><div className="arrivals-foot"><span>{history?`${shown.length} lines · this view`:'Loading annual prices…'}</span>{more(rest,'more')}</div></div></>;
}
function Multiples(p:ViewProps){
 const {companies,width,height,phone,mark,more,history,year,historical}=p;
 const columns=phone?2:Math.max(4,Math.floor(width/235)),rows=phone?Math.max(2,Math.floor((height-42)/145)):Math.max(2,Math.floor((height-42)/175));
 const capacity=columns*rows,all=ordered(companies),shown=all.slice(0,capacity-(all.length>capacity?1:0));
 const [end,setEnd]=useState(year);
 useEffect(()=>{if(year>end)setEnd(year);else if(year<end-9)setEnd(year+9);},[year,end]);
 const start=end-9,playhead=Math.max(0,Math.min(240,(year-start)/9*240));
 return <><div className="multiples-heading"><strong>{historical?'Buy then':'Buy now'} first · {metric(historical)}</strong><span>{start}—{end} · annual price / buy price</span></div><div className="multiples-grid" style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`,gridTemplateRows:`repeat(${rows},minmax(0,1fr))`}}>
 {shown.map((c,i)=>{
  const points=Array.from({length:10},(_,i)=>{const y=start+i;return {year:y,ratio:y>year?null:y===year?c.ratio:history?.[c.id]?.find(p=>p.year===y)?.ratio??null};});
  const data=points.filter(p=>p.ratio!==null),path=seriesPath(points,start,end,240,72);
  return mark(c,`multiple-card ${c.buy?'multiple-buy':''} ${i===0&&c.buy?'lab-primary':''}`,<><div className="multiple-identity">{identity(c)}</div><div className="multiple-answer"><strong>{value(c)}</strong><span>{c.buy?(historical?'Buy then':'Buy now'):dropToBuy(c.ratio)}</span></div>
  <svg viewBox="0 0 240 82" preserveAspectRatio="none" role="img" aria-label={`${c.name}, annual price divided by buy price, ${start} to ${year}. ${data.length} annual observations.`}><rect x="0" y="54" width="240" height="18" fill="var(--lab-green)" opacity=".12"/><line x1="0" x2="240" y1="54" y2="54" stroke="var(--lab-green)" strokeWidth="1"/><path d={path} fill="none" stroke="currentColor" strokeWidth="1.7" vectorEffect="non-scaling-stroke"/>{data.map(pt=><circle key={pt.year} cx={(pt.year-start)/9*240} cy={72-Math.min(4,pt.ratio!)/4*72} r={pt.year===year?3:1.8} fill="currentColor"/>)}<g className="multiple-playhead" style={{transform:`translateX(${playhead}px)`}}><line x1="0" x2="0" y1="0" y2="72" stroke="currentColor" opacity=".35"/></g></svg><span className="multiple-years"><span>{start}</span><span>{data.some(d=>d.ratio!>4)?'4× cap · ':''}{end}</span></span></>);
 })}
 {all.length>shown.length&&<div className="multiple-more">{more(all.slice(shown.length))}<span>Sorted by price to buy</span></div>}
 </div></>;
}
