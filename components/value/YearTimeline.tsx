'use client';
import {useEffect,useRef,useState} from 'react';
export function YearTimeline({years,value,onChange,onPrefetch}:{years:number[];value:string;onChange:(year:string,immediate?:boolean)=>void;onPrefetch?:(year:string)=>void}){
 const dragging=useRef(false);
 const choices=[...years.slice(0,-1).map(String),'Today'];
 const index=Math.max(0,choices.indexOf(value)),ref=useRef<HTMLDivElement>(null),[width,setWidth]=useState(1000);
 useEffect(()=>{if(!ref.current)return;const observer=new ResizeObserver(([e])=>setWidth(e.contentRect.width));observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const step=width/Math.max(1,choices.length-1),stride=choices.length>15?5:step<42?5:step<70?2:1;
 return <div ref={ref} onPointerMove={e=>{if(!dragging.current)return;const r=e.currentTarget.getBoundingClientRect();const i=Math.round((e.clientX-r.left)/r.width*(choices.length-1));const next=choices[i];if(next)onPrefetch?.(next);}} className="annual-timeline" aria-label="Time travel"><div className="annual-track">
  <input type="range" aria-label="Fiscal year" aria-valuetext={value==='Today'?'Today':`Fiscal year ${value}`} min={0} max={choices.length-1} value={index} onPointerDown={()=>{dragging.current=true;}} onPointerUp={()=>{dragging.current=false;}} onPointerCancel={()=>{dragging.current=false;}} onKeyDown={()=>{dragging.current=false;}} onChange={e=>onChange(choices[Number(e.target.value)],!dragging.current)}/>
  <div className="annual-rule"/>
  {choices.map((y,i)=><i className="annual-tick" key={y} style={{left:`${i/Math.max(1,choices.length-1)*100}%`}}>{y!=='Today'&&Number(y)%stride===0&&<span>{y}</span>}</i>)}
  <output style={{left:`clamp(30px,${index/Math.max(1,choices.length-1)*100}%,calc(100% - 30px))`}}>{value==='Today'?'Today':`FY${value}`}</output>
 </div></div>;
}
