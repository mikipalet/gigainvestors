'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** The portfolio sidebar pattern, with native modal focus containment and viewport-fitted evidence. */
export function SidePanel({ title, onClose, children, wide = false, compact = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; compact?:boolean }) {
  const [closing,setClosing]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const start=useRef<{x:number;y:number}|null>(null);
  const close=()=>{if(closing)return;setClosing(true);timer.current=setTimeout(onClose,matchMedia('(prefers-reduced-motion: reduce)').matches?0:180);};
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); queueMicrotask(() => previous?.focus()); };
  }, []);
  return <dialog ref={ref} className={`value-panel ${wide ? 'wide' : ''} ${compact?'compact-panel':''}`} data-side-panel data-closing={closing} aria-label={title} onKeyDownCapture={e=>{
    // A modal owns Escape, including when a chart tooltip has keyboard focus.
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
  }} onKeyDown={e=>{
    if(e.key!=='Tab')return;
    const controls=[...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]')].filter(el=>el.tabIndex>=0&&el.checkVisibility());
    const first=controls[0],last=controls.at(-1);
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===e.currentTarget)){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }} onCancel={e=>{e.preventDefault();close();}} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <div className="panel-shell"><header onPointerDown={e=>{if(e.pointerType!=="touch")return;start.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{if(start.current&&e.clientY-start.current.y>70&&Math.abs(e.clientX-start.current.x)<70)close();start.current=null;}}><i className="sheet-handle" aria-hidden="true"/><h2>{title}</h2><button aria-label="Close panel" onClick={close}>Close <span aria-hidden="true">×</span></button></header><div className="panel-content">{children}</div></div>
  </dialog>;
}
