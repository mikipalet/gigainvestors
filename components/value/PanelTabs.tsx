'use client';
import {useState,type ReactNode} from 'react';
export function PagedItems({items,size=4}:{items:ReactNode[];size?:number}){
 const [page,setPage]=useState(0),last=Math.max(0,Math.ceil(items.length/size)-1),current=Math.min(page,last);
 return <div className="paged-items"><div>{items.slice(current*size,(current+1)*size).map((item,i)=><div key={i}>{item}</div>)}</div>{last>0&&<nav aria-label="Detail pages"><button disabled={!current} onClick={()=>setPage(current-1)} aria-label="Previous detail page">←</button><span>{current+1} / {last+1}</span><button disabled={current===last} onClick={()=>setPage(current+1)} aria-label="Next detail page">→</button></nav>}</div>;
}
