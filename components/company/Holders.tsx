'use client';
import {useEffect,useState} from 'react';
import type {StockData} from '@/lib/types';
import {Face} from '@/components/Face';
import {ChangeBadge,effectiveActivity} from '@/components/ChangeBadge';
import {SidePanel} from '@/components/value/SidePanel';
import {StackedBars} from '@/components/StackedBars';
import {formatMoney,formatPct} from '@/lib/format';
export type InvestorMeta=Record<string,{slug:string;person:string;sketch:boolean}>;
export function Holders({stock,investors,q,onQuarter}:{stock:StockData;investors:InvestorMeta;q:string;onQuarter:(q:string)=>void}){
 const [open,setOpen]=useState(false),[page,setPage]=useState(0),[height,setHeight]=useState(0);
 useEffect(()=>{const resize=()=>setHeight(innerHeight);resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 const quarter=stock.quarters.find(x=>x.q.replace(/\s/g,'')===q.replace(/\s/g,''))??(q==='Today'?stock.quarters.at(-1):undefined);
 const holders=(quarter?.holders??[]).filter(h=>investors[h.code]).sort((a,b)=>b.value-a.value);
 const live=holders.filter(h=>h.activity!=='sold');
 useEffect(()=>setPage(0),[q]);
 if(!live.length)return null;
 const pages=Math.ceil(holders.length/8),shown=holders.slice(page*8,page*8+8);
 const historyRows=Math.max(0,Math.min(16,Math.floor((height-188-shown.length*Math.max(54,Math.min(74,height*.063))-210)/32)));
 const recent=stock.quarters.filter(x=>x.q<=quarter!.q).slice(-historyRows);
 const held=(x:StockData['quarters'][number])=>x.holders.filter(h=>h.activity!=='sold').reduce((sum,h)=>sum+h.value,0);
 return <>
  <button className="company-holders-strip" onClick={()=>setOpen(true)} aria-label={`Open all ${live.length} holders`}>
   <span className="holders-count">{live.length} holders ↗<small>{quarter!.q}</small></span>
   {live.slice(0,4).map(h=><span className="strip-holder" key={h.code}>
    {investors[h.code].sketch&&<span className="strip-face"><Face slug={investors[h.code].slug} size={320} sizes="36px"/></span>}
    <span>{investors[h.code].person}<small>{formatPct(h.pct)} of portfolio</small></span>
    <ChangeBadge activity={effectiveActivity(h.activity,h.change)} change={h.change} size={16}/>
   </span>)}
  </button>
  {open&&<SidePanel kind="holders" title={`${stock.ticker} · ${live.length} holders · ${quarter!.q}`} onClose={()=>setOpen(false)}>
   <div className="company-holders-panel" style={{'--holder-rows':shown.length} as React.CSSProperties}>
    <div className="holders-chart"><StackedBars quarters={stock.quarters} prices={stock.quarters.map(x=>x.price)} labels={stock.quarters.map(x=>x.q)} index={stock.quarters.findIndex(x=>x.q===quarter!.q)} caption="shares held · price" format={formatMoney} people={Object.fromEntries(Object.entries(investors).map(([k,v])=>[k,v.person]))} onSeek={i=>onQuarter(stock.quarters[i].q.replace(/\s/g,''))}/></div>
    <table className="company-holders-table"><thead><tr><th>Investor</th><th>Portfolio</th><th>Value held</th><th>Shares change</th></tr></thead><tbody>{shown.map(h=><tr key={h.code} data-activity={h.activity}><th><a href={`/${h.code}?q=${quarter!.q.replace(/\s/g,'')}`}>
      {investors[h.code].sketch&&<span className="table-face"><Face slug={investors[h.code].slug} size={320} sizes="48px"/></span>}<span>{investors[h.code].person}<small>First held {stock.quarters.find(quarter=>quarter.holders.some(holder=>holder.code===h.code&&holder.activity!=='sold'))?.q.slice(0,4)}</small></span></a></th><td>{formatPct(h.pct)}</td><td>{formatMoney(h.value)}{quarter!.price&&<small>{new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(h.value/quarter!.price)} shares</small>}</td><td><ChangeBadge activity={effectiveActivity(h.activity,h.change)} change={h.change} size={16}/>{effectiveActivity(h.activity,h.change)==='hold'&&'Unchanged'}</td></tr>)}</tbody></table>
    {historyRows>0&&<table className="holders-recent"><thead><tr><th>Quarter</th><th>Value held</th><th>Shares held</th><th>Price</th></tr></thead><tbody>{recent.map(x=><tr key={x.q}><th>{x.q}</th><td>{formatMoney(held(x))}</td><td>{x.price?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(held(x)/x.price):'—'}</td><td>{x.price?x.price.toLocaleString('en-US',{style:'currency',currency:'USD'}):'—'}</td></tr>)}</tbody></table>}
    {pages>1&&<nav aria-label="Holders pages"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>← Previous</button><span>{page+1} / {pages}</span><button disabled={page===pages-1} onClick={()=>setPage(p=>p+1)}>Next →</button></nav>}
   </div>
  </SidePanel>}
 </>;
}
