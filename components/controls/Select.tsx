'use client';
import {useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';
import './select.css';

type Option = [value:string,label:string,count?:number];
type SelectProps = {
  label:string; value:string; options:Option[]; onChange:(value:string)=>void;
  inline?:boolean; searchable?:boolean; details?:Record<string,string>;
};

/** One local option list, presented in a popover or directly in a filter sheet. */
export function Select({label,value,options,onChange,inline=false,searchable=true,details}:SelectProps) {
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState<string|null>(null);
  const [keyboard,setKeyboard]=useState(false);
  const id=useId(),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),input=useRef<HTMLInputElement>(null),scroll=useRef<HTMLDivElement>(null);
  const typeahead=useRef({text:'',at:0});
  const expanded=inline||open;
  const normalized=query.trim().toLocaleLowerCase();
  const reset=options.find(([key])=>key==='');
  const matches=options.filter(([key,text])=>key!==''&&`${text} ${key}`.toLocaleLowerCase().includes(normalized));
  const visible=reset?[reset,...matches]:matches;
  const current=visible.findIndex(([key])=>key===active);
  const selected=options.find(([key])=>key===value);
  // Size against the complete list so narrowing the query never shrinks the menu.
  const width=Math.max(28,...options.map(([,text,count])=>text.length+(count===undefined?7:String(count).length+9)));
  useEffect(()=>{if(open)input.current?.focus();},[open]);
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[open]);
  useEffect(()=>{
    const box=scroll.current,option=box?.querySelector<HTMLElement>('[data-active=true]');
    if(!box||!option||(!keyboard&&active!==value))return;
    const a=option.getBoundingClientRect(),b=box.getBoundingClientRect();
    if(a.top<b.top)box.scrollTop-=b.top-a.top;
    else if(a.bottom>b.bottom)box.scrollTop+=a.bottom-b.bottom;
  },[active,keyboard,query,expanded,value]);
  const close=()=>{setOpen(false);setActive(null);trigger.current?.focus();};
  const choose=(key:string)=>{onChange(key);if(!inline)close();};
  const show=(text='',edge?:'first'|'last')=>{
    setQuery(text);setKeyboard(!!text||!!edge);
    setActive(text?options.find(([key,name])=>key!==''&&`${name} ${key}`.toLowerCase().includes(text.toLowerCase()))?.[0]??null:edge==='last'?options.at(-1)?.[0]??null:edge==='first'?options[0]?.[0]??null:value);
    setOpen(true);
  };
  const navigate=(e:KeyboardEvent)=>{
    if(e.nativeEvent.isComposing)return;
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
      e.preventDefault();setKeyboard(true);
      const index=e.key==='Home'?0:e.key==='End'?visible.length-1:Math.max(0,Math.min(visible.length-1,current+(e.key==='ArrowDown'?1:-1)));
      setActive(visible[index]?.[0]??null);
    }else if(e.key==='Enter'&&current>=0){e.preventDefault();choose(visible[current][0]);}
    else if(e.target!==input.current&&e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
      e.preventDefault();
      const now=performance.now(),text=(now-typeahead.current.at<600?typeahead.current.text:'')+e.key.toLowerCase();
      typeahead.current={text,at:now};setKeyboard(true);
      setActive(visible.find(([,name])=>name.toLowerCase().startsWith(text))?.[0]??active);
    }
  };
  const option=([key,text,count]:Option,index:number)=><div key={key} id={`${id}-${index}`} role="option" aria-selected={key===value} data-active={key===active} data-keyboard={keyboard} className={key===''?'filter-option filter-reset':'filter-option'} onPointerMove={()=>{setKeyboard(false);setActive(key);}} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(key)}>
    <span className="option-check" aria-hidden="true">{key===value?'✓':''}</span><span className="option-name">{text}</span>{count!==undefined&&<span className="option-count" aria-label={`${count} companies`}>{count.toLocaleString('en-US')}</span>}{inline&&details?.[key]&&<span className="option-detail">{details[key]}</span>}
  </div>;
  return <div ref={root} className={`design-select${inline?' inline-select':''}`} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)){setOpen(false);setActive(null);}}} onKeyDown={e=>{
    if(e.key==='Escape'&&open&&!inline){e.preventDefault();e.stopPropagation();close();}
  }}>
    {inline?<h3 id={`${id}-label`}>{label}</h3>:<button ref={trigger} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-controls={expanded?`${id}-list`:undefined} aria-haspopup="listbox" className="filter-trigger" onClick={()=>open?close():show()} onKeyDown={e=>{
      if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();show('',e.key==='ArrowUp'||e.key==='End'?'last':'first');}
      else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key!==' '){e.preventDefault();show(e.key);}
    }}><span className="filter-label">{label}</span><span className="filter-value">{selected?.[1]??label}</span><svg className="filter-chevron" aria-hidden="true" width="12" height="12" viewBox="0 0 12 12"><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1"/></svg></button>}
    {expanded&&<div className={`design-options filter-options${inline?' filter-options-inline':''}`} style={inline?undefined:{width:`${width}ch`}}>
      {searchable&&<input ref={input} className="filter-search" role="combobox" aria-label={`Search ${label}`} aria-expanded="true" aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={current>=0?`${id}-${current}`:undefined} placeholder="Search" autoComplete="off" spellCheck={false} value={query} onChange={e=>{
        const text=e.target.value;setQuery(text);setKeyboard(true);
        setActive(options.find(([key,name])=>key!==''&&`${name} ${key}`.toLocaleLowerCase().includes(text.trim().toLocaleLowerCase()))?.[0]??null);
        if(scroll.current)scroll.current.scrollTop=0;
      }} onKeyDown={navigate}/>}
      <div id={`${id}-list`} role="listbox" aria-label={label} tabIndex={searchable?-1:0} aria-activedescendant={!searchable&&current>=0?`${id}-${current}`:undefined} onKeyDown={navigate}>
        {reset&&option(reset,0)}
        <div ref={scroll} className="filter-scroll">{matches.map((item,i)=>option(item,i+(reset?1:0)))}</div>
      </div>
      {!matches.length&&<p className="filter-empty" role="status">No matches for “{query}”</p>}
    </div>}
  </div>;
}
