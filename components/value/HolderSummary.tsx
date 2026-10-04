'use client';
import {compactNumber,formatPct,formatChange} from '@/lib/format';
import {useState,useEffect,useRef} from 'react';
import {SidePanel} from './SidePanel';
import {ChartInteraction} from './viz/ChartInteraction';
type Holder={name:string;code:string;firm?:string;position?:{q:string;pct:number;shares:number;value:number;first:string;activity:string;change:number|null;lastChange:{q:string;activity:string;change:number|null}|null;history:Array<{q:string;pct:number;shares:number}>}};
const number=compactNumber;
function WeightHistory({holder}:{holder:Holder}){
 const rows=holder.position?.history.slice(-20)??[],max=Math.max(1,...rows.map(r=>r.pct));
 const points=rows.map((r,i)=>({x:8+i*284/Math.max(1,rows.length-1),y:26-r.pct/max*22,text:`${r.q} · ${formatPct(r.pct)} of portfolio · ${number(r.shares)} shares`}));
 return points.length>1?<ChartInteraction width={300} height={30} label={`${holder.name}, portfolio weight`} points={points}><svg viewBox="0 0 300 30" role="img" aria-label="Reported portfolio weight by quarter"><polyline points={points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2"/></svg></ChartInteraction>:null;
}
export function HolderSummary({holders}:{holders:Holder[]}){
 const [open,setOpen]=useState(false),[size,setSize]=useState(12),[page,setPage]=useState(0),[quarterCount,setQuarterCount]=useState(10);
 useEffect(()=>{const resize=()=>{setSize(Math.max(4,Math.floor((innerHeight-500)/70)));setQuarterCount(innerWidth<768?8:Math.max(6,Math.floor((innerHeight-500)/30)));};resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 const historyRef=useRef<HTMLElement>(null);
 useEffect(()=>{
  const history=historyRef.current;if(!open||!history||innerWidth<768)return;
  let frame=0;
  const fit=()=>{if(frame)return;frame=requestAnimationFrame(()=>{
   frame=0;const table=history.querySelector('table');if(!table)return;
   const rowHeight=Math.max(38,...[...table.querySelectorAll('tbody tr')].map(row=>row.getBoundingClientRect().height));
   const heading=history.querySelector('h3')?.getBoundingClientRect().height??24;
   const head=table.querySelector('thead')?.getBoundingClientRect().height??24;
   setQuarterCount(Math.max(1,Math.floor((history.clientHeight-heading-head-12)/rowHeight)));
  });};
  const observer=new ResizeObserver(fit);observer.observe(history);const table=history.querySelector('table');if(table)observer.observe(table);fit();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);};
 },[open,size,page]);
 const sorted=[...holders].sort((a,b)=>(b.position?.pct??-1)-(a.position?.pct??-1)),pages=Math.ceil(sorted.length/size),current=Math.min(page,pages-1),rows=sorted.slice(current*size,(current+1)*size);
 const quarters=[...new Set(rows.flatMap(h=>h.position?.history.map(p=>p.q)??[]))].sort().slice(-quarterCount);
 return <><button className="holder-summary" onClick={()=>setOpen(true)}>{holders.length} tracked investor{holders.length===1?'':'s'} ↗</button>{open&&<SidePanel title="Investors" onClose={()=>setOpen(false)}><section className="investor-panel"><header><p className="panel-answer">{holders.length} tracked investor{holders.length===1?'':'s'}.</p><p>Largest portfolio weight first · reported quarters shown per holder</p></header><div className="holdings-table"><table><thead><tr><th>Investor</th><th>Weight</th><th>Shares</th><th>Value · USD</th><th>First held</th><th>Last change</th></tr></thead><tbody>{rows.map(h=><tr key={h.code}><th><a href={`https://gigainvestors.com/${encodeURIComponent(h.code)}`}>{h.name} · {h.code} ↗</a><small>{h.firm}</small>{rows.length<=5&&<WeightHistory holder={h}/>}</th><td>{h.position&&formatPct(h.position.pct)}</td><td title={h.position?.shares.toLocaleString('en-US')}>{h.position&&number(h.position.shares)}</td><td title={h.position?.value.toLocaleString('en-US')}>{h.position&&number(h.position.value)}</td><td>{h.position?.first}</td><td>{h.position&&<>{h.position.lastChange?.activity??'Held'}{h.position.lastChange?.change!=null&&` ${formatChange(h.position.lastChange.change)}`}<small>{h.position.lastChange?.q??h.position.q}</small></>}</td></tr>)}</tbody></table></div><section ref={historyRef} className="holding-history" data-full-shares={rows.length<=3}><h3>Portfolio weight · shares</h3><table><thead><tr><th>Quarter</th>{rows.slice(0,5).map(h=><th key={h.code}>{h.code}</th>)}</tr></thead><tbody>{quarters.map(q=><tr key={q}><th scope="row">{q}</th>{rows.slice(0,5).map(h=><td key={h.code}><span className="holding-history-name">{h.code} </span>{h.position?.history.find(p=>p.q===q)?<>{formatPct(h.position.history.find(p=>p.q===q)!.pct)}<small title="Shares held">{rows.length<=3?h.position.history.find(p=>p.q===q)!.shares.toLocaleString('en-US'):number(h.position.history.find(p=>p.q===q)!.shares)}</small></>:'—'}</td>)}</tr>)}</tbody></table></section>{pages>1&&<nav aria-label="Investor pages"><button disabled={current===0} onClick={()=>setPage(current-1)}>←</button><span>{current+1} / {pages}</span><button disabled={current===pages-1} onClick={()=>setPage(current+1)}>→</button></nav>}<footer>Quarterly 13F holdings. First held is the first quarter in the tracked history; share changes can include corporate actions.</footer></section></SidePanel>}</>;
}
