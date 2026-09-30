'use client';
import { useLayoutEffect,useRef,useState,type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Portal escapes transformed treemap ancestors; offsets are viewport/pointer coordinates. */
export function PointerTooltip({x,y,children}:{x:number;y:number;children:ReactNode}) {
 const ref=useRef<HTMLDivElement>(null),[size,setSize]=useState({w:240,h:90});
 useLayoutEffect(()=>{const r=ref.current?.getBoundingClientRect();if(r)setSize({w:r.width,h:r.height});},[children]);
 const left=Math.max(8,Math.min(window.innerWidth-size.w-8,x+12+size.w>window.innerWidth-8?x-size.w-12:x+12));
 const top=Math.max(8,Math.min(window.innerHeight-size.h-8,y+12+size.h>window.innerHeight-8?y-size.h-12:y+12));
 // Native dialogs occupy the browser top layer; their tooltips must join it.
 const container=document.querySelector('dialog[open]')??document.body;
 return createPortal(<div ref={ref} role="tooltip" className="pointer-tooltip" style={{position:'fixed',left,top,pointerEvents:'none',zIndex:100,maxWidth:'min(280px, calc(100vw - 16px))',background:'var(--paper)',color:'var(--ink)',border:'1px solid var(--ink)',padding:'10px 12px',fontSize:13,lineHeight:1.5,boxShadow:'0 4px 18px #1112'}}>{children}</div>,container);
}
