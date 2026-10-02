'use client';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** The portfolio sidebar pattern, with native modal focus containment and viewport-fitted evidence. */
export function SidePanel({ title, onClose, children, wide = false, compact = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; compact?:boolean }) {
  const [closing,setClosing]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const start=useRef<{x:number;y:number}|null>(null);
  const close=()=>{if(closing)return;setClosing(true);timer.current=setTimeout(onClose,matchMedia('(prefers-reduced-motion: reduce)').matches?0:180);};
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); queueMicrotask(() => previous?.focus()); };
  }, []);
  useLayoutEffect(() => {
    const dialog=ref.current;
    if(!dialog)return;
    const fit=()=>{
      if(innerWidth<768){
        dialog.style.width='';delete dialog.dataset.readingColumns;
        for(const name of ['--reading-font','--memo-font','--memo-leading','--preview-font'])dialog.style.removeProperty(name);
        const method=dialog.querySelector<HTMLElement>('.method-sections'),business=dialog.querySelector<HTMLElement>('.owner-memo-depth');
        if(method)method.style.columnCount='';if(business){business.style.gridTemplateColumns='';business.style.columnCount='';}
        return;
      }
      const method=dialog.querySelector<HTMLElement>('.method-sections');
      if(method){
        const columns=innerHeight<850?4:3;
        method.style.columnCount=String(columns);
        for(let width=columns*230;width<=Math.min(innerWidth,1400);width+=20){
          dialog.style.width=`${width}px`;
          const columnWidth=(method.clientWidth-(columns-1)*parseFloat(getComputedStyle(method).columnGap))/columns;
          if(method.scrollWidth<=method.clientWidth+1&&[...method.querySelectorAll('table')].every(table=>parseFloat(getComputedStyle(table).width)<=columnWidth+1))break;
        }
        return;
      }
      const preview=dialog.querySelector<HTMLElement>('.search-preview');
      if(preview){
        preview.style.height=`${innerHeight-preview.getBoundingClientRect().top-16}px`;
        const fits=()=>[...preview.children].every(child=>child.getBoundingClientRect().bottom<=Math.min(innerHeight-8,preview.getBoundingClientRect().bottom)-8);
        dialog.style.setProperty('--preview-font','13px');
        for(const width of [408,432,456,480,504,528,552,576,600,624,648,672,696,720]){
          dialog.style.width=`${width}px`;
          if(fits())break;
        }
        let low=13,high=22;
        for(let i=0;i<5;i++){
          const mid=(low+high)/2;dialog.style.setProperty('--preview-font',`${mid}px`);
          if(fits())low=mid;else high=mid;
        }
        dialog.style.setProperty('--preview-font',`${low}px`);

        return;
      }
      const business=dialog.querySelector<HTMLElement>('.owner-memo-depth');
      if(business){
        const available=business.parentElement!.clientHeight-16;
        const fits=()=>business.scrollHeight<=available&&[...business.children].every(child=>child.scrollWidth<=child.clientWidth+1);
        let best:{width:number;font:number;used:number;columns:number;leading:number}|undefined;
        for(const leading of innerHeight<850?[1.35,1.2]:[1.35]){
          dialog.style.setProperty('--memo-leading',String(leading));
          for(const columns of [1,2,3]){
            if(columns===1&&business.dataset.profile==='true')continue;
            business.style.columnCount=String(columns);
            for(let width=columns===1?280:columns*210;width<=Math.min(innerWidth,1400);width+=20){
              if(best&&best.used>=available*.94&&width>best.width*1.08)break;
              dialog.style.width=`${width}px`;dialog.style.setProperty('--memo-font','13px');
              if(!fits())continue;
              let low=13,high=24;
              for(let i=0;i<6;i++){const mid=(low+high)/2;dialog.style.setProperty('--memo-font',`${mid}px`);if(fits())low=mid;else high=mid;}
              dialog.style.setProperty('--memo-font',`${low}px`);
              // Compact leading is reserved for the smaller table type.
              if(leading===1.2&&low>=15)continue;
              const candidate={width,font:low,used:business.scrollHeight,columns,leading};
              if(leading===1.2&&best&&candidate.width>best.width*.95&&candidate.font<=best.font)continue;
              const full=candidate.used>=available*.94,previousFull=best&&best.used>=available*.94;
              if(!best||full&&!previousFull||full===!!previousFull&&(full?(candidate.width<best.width||candidate.width<=best.width*1.08&&candidate.font>best.font+1):candidate.used>best.used))best=candidate;
              if(candidate.used>=available*.94)break;
            }
          }
        }
        if(best){dialog.style.width=`${best.width}px`;dialog.style.setProperty('--memo-font',`${best.font}px`);dialog.style.setProperty('--memo-leading',String(best.leading));business.style.columnCount=String(best.columns);}
        return;
      }
      const article=dialog.querySelector<HTMLElement>('.evidence-layout');
      if(!article)return;
      const content=article.parentElement!;
      const available=content.clientHeight-16;
      // Fit the actual filing and table, then spend spare room on readable type.
      // Width changes are bounded; charts keep their own responsive SVG geometry.
      const fits=()=>article.scrollHeight<=available&&article.scrollWidth<=article.clientWidth+1&&[...article.querySelectorAll('th,td')].every(cell=>cell.scrollWidth<=cell.clientWidth+1);
      const preferredMinimum=innerHeight<850&&!['accounting','management'].includes(article.dataset.test??'')?13:14;
      // A larger starting size can rule out a useful narrow column. Retry the
      // permitted minimum when that leaves a gap or overflows after chart sizing.
      for(const minimum of preferredMinimum===14?[14,13]:[13]){
        let best={width:280,font:minimum,used:0};
        for(const width of Array.from({length:49},(_,i)=>280+i*10)){
          dialog.style.width=`${Math.min(innerWidth,width)}px`;
          dialog.dataset.readingColumns=width>=480?'2':'1';
          dialog.style.setProperty('--reading-font',`${minimum}px`);
          if(!fits())continue;
          let low=minimum,high=24;
          for(let i=0;i<6;i++){
            const mid=(low+high)/2;dialog.style.setProperty('--reading-font',`${mid}px`);
            if(fits())low=mid;else high=mid;
          }
          dialog.style.setProperty('--reading-font',`${low}px`);
          const used=article.scrollHeight;
          if(used>best.used)best={width,font:low,used};
          if(used>=available*.99)break;
        }
        dialog.style.width=`${best.width}px`;
        dialog.dataset.readingColumns=best.width>=480?'2':'1';
        dialog.style.setProperty('--reading-font',`${best.font}px`);
        if(article.scrollHeight<=available&&article.scrollHeight>=available*.92)break;
      }
    };
    let frame=0,active=true;
    const schedule=()=>{if(active&&!frame)frame=requestAnimationFrame(()=>{frame=0;fit();});};
    fit();
    const resize=new ResizeObserver(schedule);
    const fitted=dialog.querySelector('.evidence-layout,.owner-memo-depth,.method-sections');
    if(fitted)resize.observe(fitted);
    document.fonts.ready.then(schedule);
    const observer=new MutationObserver(records=>{if(records.some(record=>!(record.target instanceof Element?record.target:record.target.parentElement)?.closest('svg,.chart-interaction')))schedule();});
    observer.observe(dialog,{childList:true,subtree:true});
    window.addEventListener('resize',schedule);
    return()=>{active=false;observer.disconnect();resize.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);};
  },[children]);
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
