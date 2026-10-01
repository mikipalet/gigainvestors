'use client';
import { useCallback, useEffect, useState } from 'react';

/** Both timelines share URL restoration and one debounced write after a drag settles. */
export function useDebouncedQuery(initial:Record<string,string> = {}, historyMode: "replace" | "push" = "replace") {
 const [query,setQuery]=useState(initial),[ready,setReady]=useState(false);
 useEffect(()=>{
  const restore=()=>{setQuery(Object.fromEntries(new URLSearchParams(window.location.search)));setReady(true);};
  restore();window.addEventListener('popstate',restore);
  return()=>window.removeEventListener('popstate',restore);
 },[]);
 useEffect(()=>{
  if(!ready)return;
  // WebKit rate-limits history writes hard while scrubbing.
  const timer=setTimeout(()=>{
   const url=new URL(window.location.href);url.search=new URLSearchParams(query).toString();
   if(url.href!==window.location.href)window.history[historyMode === 'push' ? 'pushState' : 'replaceState'](null,'',url);
  },350);
  return()=>clearTimeout(timer);
 },[query,ready,historyMode]);
 return [query,setQuery] as const;
}

export function useQuarter(quarters:string[],fallback?:string) {
 const [query,setQuery]=useDebouncedQuery();
 const q=query.q&&quarters.includes(query.q)?query.q:fallback??quarters[quarters.length-1];
 const change=useCallback((next:string)=>setQuery(current=>({...current,q:next})),[setQuery]);
 return [q,change] as const;
}
