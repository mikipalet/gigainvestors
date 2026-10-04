"use client";

import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {companyPath,withQuarter} from '@/lib/company-route';
import {plural} from '@/components/investor-legacy/format';
import {slugOf} from '@/lib/slug';
import {rank,type Hit} from '@/lib/search/rank';
import type {SearchIndex} from '@/lib/types';

let cached:Promise<SearchIndex>|undefined;
export function loadSearchIndex() {
 return cached??=fetch('/api/search').then(r=>{
  if(!r.ok)throw new Error('Search unavailable');
  return r.json() as Promise<SearchIndex>;
 }).then(index=>{rank(index,'\0');return index;}).catch(error=>{cached=undefined;throw error;});
}
const warm=()=>{void loadSearchIndex().catch(()=>{});};
export function SearchTrigger({query='',className='',label='Search'}:{query?:string;className?:string;label?:string;value?:boolean}) {
 return <button type="button" aria-label="Search" onPointerEnter={warm} onFocus={warm} onClick={()=>window.dispatchEvent(new CustomEvent('open-search',{detail:query}))}
  className={`house-action ${className}`}>
  {label} <span className="search-key" aria-hidden="true">/</span>
 </button>;
}

/** Original 9ebf2c7 investor palette: one renderer, independent of the route. */
export function Search() {
 const pathname=usePathname();
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[index,setIndex]=useState<SearchIndex|null>(null),[sel,setSel]=useState(0),[error,setError]=useState('');
 const results=useRef<HTMLUListElement>(null);
 const rowHeights=useRef(new Map<string,number>()),fitResults=useRef<(()=>void)|null>(null);
 const input=useRef<HTMLInputElement>(null),previousFocus=useRef<HTMLElement|null>(null);
 const hits=useMemo(()=>index?rank(index,query):[],[index,query]);
 useEffect(()=>{
  const show=(event?:Event)=>{previousFocus.current=document.activeElement as HTMLElement;setQuery((event as CustomEvent<string>)?.detail??'');setSel(0);setOpen(true);};
  const onKey=(e:KeyboardEvent)=>{
   const target=e.target as HTMLElement;
   const typing=target?.closest('input:not([type=range]),textarea,select,[contenteditable=true]');
   if((e.key==='/'&&!typing&&!e.metaKey&&!e.ctrlKey)||((e.metaKey||e.ctrlKey)&&e.key==='k')){e.preventDefault();show();}
   if(e.key==='Escape')setOpen(false);
  };
  window.addEventListener('open-search',show);window.addEventListener('keydown',onKey);
  // Start once after hydration, ahead of the first keystroke. The promise is
  // shared by every trigger and survives client-side navigation.
  warm();
  return ()=>{window.removeEventListener('open-search',show);window.removeEventListener('keydown',onKey);};
 },[]);
 useEffect(()=>{setOpen(false);},[pathname]);
 useEffect(()=>{
  if(!open)return;
  let active=true;setError('');
  loadSearchIndex().then(data=>{if(active)setIndex(data);}).catch(()=>{if(active)setError('Could not load search. Try again.');});
  input.current?.focus();
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  return ()=>{active=false;document.body.style.overflow=overflow;previousFocus.current?.focus();};
 },[open]);
 // Keep the original half-viewport scroll area, ending at a complete row.
 // Cache each row kind so typing does not force layout. Recheck decoded portraits.
 useLayoutEffect(()=>{
  const list=results.current;if(!list)return;
  const fit=()=>{
   const available=Math.max(0,Math.min(innerHeight/2,innerHeight*.82-64));
   let height=5,count=0;
   for(const [i,row] of Array.from(list.children).entries()){
    const kind=hits[i].kind;
    let next=rowHeights.current.get(kind);
    if(next===undefined){next=row.getBoundingClientRect().height;rowHeights.current.set(kind,next);}
    if(height+next>available)break;height+=next;count++;
   }
   const clipped=count<list.children.length;
   list.style.maxHeight=`${clipped?height:available}px`;
   list.style.paddingBottom=clipped?'0px':'';
  };
  fitResults.current=fit;fit();
  const resize=()=>{rowHeights.current.clear();fit();};
  window.addEventListener('resize',resize);
  return ()=>{fitResults.current=null;window.removeEventListener('resize',resize);};
 },[hits,open]);
 useEffect(()=>{document.getElementById(`search-hit-${sel}`)?.scrollIntoView({block:'nearest'});},[sel]);
 const go=(hit:Hit)=>{
  setOpen(false);
  const path=hit.kind==='munger'?'/munger':hit.kind==='investor'?`/${hit.code}`:companyPath(hit.ticker);
  window.location.assign(withQuarter(path,document.documentElement.dataset.quarter??new URLSearchParams(location.search).get('q')));
 };
 if(!open)return null;
 return <div className="fixed inset-0 z-50 flex items-start justify-center bg-paper/85 pt-[18vh]" onMouseDown={()=>setOpen(false)}>
  <div role="dialog" aria-modal="true" aria-label="Search" className="search-modal w-[min(560px,92vw)] bg-paper shadow-[0_0_0_1px_var(--ink)]" onMouseDown={e=>e.stopPropagation()}>
   <input ref={input} aria-label="Search investor, firm, ticker, company" role="combobox" aria-expanded="true" aria-controls="search-results" aria-activedescendant={hits[sel]?`search-hit-${sel}`:undefined}
    value={query} onChange={e=>{setQuery(e.target.value);setSel(0);}} onKeyDown={e=>{
     if(e.key==='ArrowDown'){e.preventDefault();setSel(s=>Math.min(s+1,Math.max(0,hits.length-1)));}
     if(e.key==='ArrowUp'){e.preventDefault();setSel(s=>Math.max(s-1,0));}
     if(e.key==='Enter'&&hits[sel])go(hits[sel]);
     if(e.key==='Tab'){e.preventDefault();input.current?.focus();}
    }} placeholder="investor, firm, ticker, company" className="w-full bg-transparent px-4 py-3 text-[16px] outline-none placeholder:opacity-35" spellCheck={false} autoComplete="off"/>
   {!query.trim()&&<div className="border-t border-ink/15 px-4 py-3 text-[12px] leading-relaxed opacity-45">Try an investor (Buffett, Ackman), a firm (Baupost), or a ticker (AAPL, GOOGL).</div>}
   {!hits.length&&query.trim().length>1&&index&&!error&&<div className="border-t border-ink/15 px-4 py-3 text-[13px] opacity-40">nothing filed under that</div>}
   {!index&&!error&&query.trim()&&<div role="status" className="border-t border-ink/15 px-4 py-3 text-[13px] opacity-40">searching…</div>}
   {error&&<div role="status" className="border-t border-ink/15 px-4 py-3 text-[13px] opacity-40">{error}</div>}
   {hits.length>0&&<ul ref={results} id="search-results" role="listbox" className="border-t border-ink/15 py-1 max-h-[50vh] overflow-y-auto">
    {hits.map((h,i)=><li key={h.kind==='munger'?'munger':h.kind==='investor'?`i${h.code}`:`s${h.ticker}`} id={`search-hit-${i}`} role="option" aria-selected={i===sel} data-company={h.kind==='stock'?h.ticker:undefined}
     onMouseEnter={()=>setSel(i)} onClick={()=>go(h)} className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-[13px] ${i===sel?'bg-ink text-paper':''}`}>
     {h.kind==='investor'&&<img src={`/faces/png/v2/${slugOf(h.title)}.png`} width={26} height={32} alt="" onLoad={()=>{rowHeights.current.delete('investor');fitResults.current?.();}} className="-my-1 block shrink-0"/>}
     <span className="shrink-0 whitespace-nowrap font-semibold">{h.kind==='munger'?'Charlie Munger':h.title}</span>
     <span className="truncate opacity-60" title={h.kind==='stock'?h.sub:undefined}>{h.kind==='munger'?'1924 – 2023':h.sub}</span>
     {h.kind==='stock'&&<span className="ml-auto shrink-0 opacity-60">{plural(h.holders,'holder')}</span>}
     {h.kind==='investor'&&<span className="ml-auto shrink-0 opacity-60">investor</span>}
     {h.kind==='munger'&&<span className="ml-auto shrink-0 opacity-60">the waiting</span>}
    </li>)}
   </ul>}
  </div>
 </div>;
}
export function SearchInput({query=''}:{query?:string}) {
 return <input className="recovery-search" aria-label="Search companies" placeholder="Search company or ticker…" defaultValue={query} onFocus={e=>window.dispatchEvent(new CustomEvent('open-search',{detail:e.currentTarget.value}))}/>;
}
