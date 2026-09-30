'use client';
import {useEffect,useId,useRef,useState} from 'react';
import './select.css';
export type SelectOption = [value:string,label:string,count?:number];
export type SelectProps = {label:string;value:string;options:SelectOption[];onChange:(value:string)=>void};

/** Focus stays in the search field; the active option follows arrows and stays in view. */
export function SearchableCombobox({label,value,options,onChange}:SelectProps) {
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);
 const id=useId(),trigger=useRef<HTMLButtonElement>(null),input=useRef<HTMLInputElement>(null),list=useRef<HTMLDivElement>(null);
 const matches=options.filter(([key,text])=>`${text} ${key}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const current=Math.min(active,Math.max(0,matches.length-1));
 useEffect(()=>{if(open)input.current?.focus();},[open]);
 useEffect(()=>{list.current?.querySelector('[data-active="true"]')?.scrollIntoView({block:'nearest'});},[current,query,open]);
 const close=()=>{setOpen(false);trigger.current?.focus();};
 const choose=(index:number)=>{if(!matches[index])return;onChange(matches[index][0]);close();};
 const show=(text='')=>{setQuery(text);setActive(0);setOpen(true);};
 return <div className="design-select searchable-select" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{
  if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();close();}
 }}>
  <button ref={trigger} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" onClick={()=>open?close():show()} onKeyDown={e=>{
   if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();show();setActive(e.key==='End'||e.key==='ArrowUp'?options.length-1:0);}
   else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key!==' '){e.preventDefault();show(e.key);}
  }}>{options.find(o=>o[0]===value)?.[1]??label}<span aria-hidden="true">⌄</span></button>
  {open&&<div className="design-options search-options">
   <input ref={input} role="combobox" aria-label={`Search ${label}`} aria-expanded="true" aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={matches.length?`${id}-${current}`:undefined} placeholder={`Search ${label.toLowerCase()}…`} value={query} onChange={e=>{setQuery(e.target.value);setActive(0);}} onKeyDown={e=>{
    if(e.nativeEvent.isComposing)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setActive(Math.max(0,Math.min(matches.length-1,current+(e.key==='ArrowDown'?1:-1))));}
    if(e.key==='Home'||e.key==='End'){e.preventDefault();setActive(e.key==='Home'?0:Math.max(0,matches.length-1));}
    if(e.key==='Enter'){e.preventDefault();choose(current);}
   }}/>
   <div ref={list} id={`${id}-list`} role="listbox" aria-label={label}>{matches.map(([key,text,count],i)=><div id={`${id}-${i}`} key={key} role="option" aria-selected={key===value} data-active={current===i} onPointerMove={()=>setActive(i)} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(i)}><span>{text}</span>{count!==undefined&&<span className="option-count" aria-label={`${count} companies`}>{count.toLocaleString('en-US')}</span>}{key===value&&<span aria-hidden="true">✓</span>}</div>)}</div>
   {!matches.length&&<p role="status">No matches</p>}
  </div>}
 </div>;
}
