'use client';
import {useEffect,useRef} from 'react';

/** Give a transient overlay one Back step, without changing its shareable URL. */
export function useOverlayHistory(open:boolean,onClose:()=>void){
 const callback=useRef(onClose);
 callback.current=onClose;
 useEffect(()=>{
  if(!open)return;
  const url=location.href,token=crypto.randomUUID();
  let owned=false;
  // Defer registration so Strict Mode's trial mount cannot add a history entry.
  const timer=setTimeout(()=>{
   history.pushState({...history.state,overlay:token},'',url);
   owned=true;
  },0);
  const back=()=>{
   if(owned&&history.state?.overlay!==token){owned=false;callback.current();}
  };
  window.addEventListener('popstate',back);
  return()=>{
   clearTimeout(timer);
   window.removeEventListener('popstate',back);
   // A company link may already have navigated; never undo that navigation.
   if(owned&&location.href===url&&history.state?.overlay===token)history.back();
  };
 },[open]);
}
