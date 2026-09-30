'use client';
import {useId,useState,type ReactNode} from 'react';
export function PanelTabs({tabs}:{tabs:Array<{label:string;content:ReactNode}>}){
 const [selected,setSelected]=useState(0);const id=useId();
 return <div className="panel-tabs"><div role="tablist" aria-label="Details">{tabs.map((tab,i)=><button key={tab.label} role="tab" id={`${id}-tab-${i}`} aria-controls={`${id}-panel-${i}`} aria-selected={selected===i} tabIndex={selected===i?0:-1} onClick={()=>setSelected(i)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setSelected(n);document.getElementById(`${id}-tab-${n}`)?.focus();}}}>{tab.label}</button>)}</div><section role="tabpanel" id={`${id}-panel-${selected}`} aria-labelledby={`${id}-tab-${selected}`} key={selected}>{tabs[selected].content}</section></div>;
}
export function PagedItems({items,size=4}:{items:ReactNode[];size?:number}){
 const [page,setPage]=useState(0),last=Math.max(0,Math.ceil(items.length/size)-1),current=Math.min(page,last);
 return <div className="paged-items"><div>{items.slice(current*size,(current+1)*size).map((item,i)=><div key={i}>{item}</div>)}</div>{last>0&&<nav aria-label="Detail pages"><button disabled={!current} onClick={()=>setPage(current-1)} aria-label="Previous detail page">←</button><span>{current+1} / {last+1}</span><button disabled={current===last} onClick={()=>setPage(current+1)} aria-label="Next detail page">→</button></nav>}</div>;
}
