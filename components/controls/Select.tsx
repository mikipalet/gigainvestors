'use client';
import { useId, useRef, useState } from 'react';

/** Shared paper-and-ink listbox, usable on either host. Arrow keys, Home/End and Escape. */
export function Select({label,value,options,onChange}:{label:string;value:string;options:Array<[string,string]>;onChange:(value:string)=>void}) {
 const [open,setOpen]=useState(false),[active,setActive]=useState(0);
 const id=useId(),trigger=useRef<HTMLButtonElement>(null);
 const choose=(i:number)=>{onChange(options[i][0]);setOpen(false);trigger.current?.focus();};
 return <div className="design-select" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{
  if(e.key==='Escape'){e.stopPropagation();setOpen(false);trigger.current?.focus();}
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();setOpen(true);setActive(i=>e.key==='Home'?0:e.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,i+(e.key==='ArrowDown'?1:-1))));}
  if(open&&(e.key==='Enter'||e.key===' ')){e.preventDefault();choose(active);}
 }}><button ref={trigger} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-controls={id} aria-haspopup="listbox" aria-activedescendant={open?`${id}-${active}`:undefined} onClick={()=>{setActive(Math.max(0,options.findIndex(o=>o[0]===value)));setOpen(!open);}}>{options.find(o=>o[0]===value)?.[1]??label}<span aria-hidden="true">⌄</span></button>
 {open&&<div id={id} className="design-options" role="listbox" aria-label={label}>{options.map(([key,text],i)=><div id={`${id}-${i}`} role="option" aria-selected={key===value} data-active={active===i} key={key} onPointerMove={()=>setActive(i)} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(i)}>{text}{key===value&&<span aria-hidden="true">✓</span>}</div>)}</div>}</div>;
}
