'use client';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

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
  document.documentElement.dataset.quarter=query.q??'';
  window.dispatchEvent(new Event('site-quarter'));
  // WebKit rate-limits history writes hard while scrubbing.
  const timer=setTimeout(()=>{
   const url=new URL(window.location.href);url.search=new URLSearchParams(query).toString();
   if(url.href!==window.location.href)window.history[historyMode === 'push' ? 'pushState' : 'replaceState'](null,'',url);
  },350);
  return()=>clearTimeout(timer);
 },[query,ready,historyMode]);
 return [query,setQuery] as const;
}

export function useQuarter(quarters:string[],fallback?:string,initialQuarter?:string) {
 const [query,setQuery]=useDebouncedQuery(initialQuarter?{q:initialQuarter}:{});
 const q=quarters.find(q=>q.replace(/\s/g,'')===query.q?.replace(/\s/g,''))??fallback??quarters[quarters.length-1];
 const change=useCallback((next:string)=>setQuery(current=>{const query={...current};if(next==='Today')delete query.q;else query.q=next.replace(/\s/g,'');return query;}),[setQuery]);
 return [q,change] as const;
}

const subscribeQuarter=(notify:()=>void)=>{window.addEventListener('site-quarter',notify);window.addEventListener('popstate',notify);return()=>{window.removeEventListener('site-quarter',notify);window.removeEventListener('popstate',notify);};};
export const selectedQuarter=()=>document.documentElement.dataset.quarter??new URLSearchParams(location.search).get('q')??'';
export function useSelectedQuarter(){return useSyncExternalStore(subscribeQuarter,selectedQuarter,()=>'');}
