'use client';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// Measured per screen height across the reference companies (widest content that fits at 14px); one width per drawer type.
const EVIDENCE_WIDTHS:Record<'short'|'mid'|'tall',Record<string,number>>={
  short:{understandable:400,moat:760,economics:600,management:640,accounting:600,price:620},
  mid:{understandable:300,moat:400,economics:340,management:480,accounting:480,price:560},
  tall:{understandable:320,moat:340,economics:380,management:360,accounting:340,price:440},
};
const evidenceWidth=(test:string)=>EVIDENCE_WIDTHS[innerHeight<850?'short':innerHeight<1050?'mid':'tall'][test]??400;
// Element boxes can omit overflowing inline text, buttons and definition lists.
// Measure painted text fragments against the actual clipping ancestors instead.
function textFits(root:Element,content:Element):boolean{
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),range=document.createRange();
  const boundary=content.getBoundingClientRect();
  const ancestors=new Map<Element,{box:DOMRect;clipX:boolean;clipY:boolean}>();
  const geometry=(el:Element)=>{
    let entry=ancestors.get(el);
    if(!entry){const style=getComputedStyle(el);entry={box:el.getBoundingClientRect(),clipX:/hidden|clip/.test(style.overflowX),clipY:/hidden|clip/.test(style.overflowY)};ancestors.set(el,entry);}
    return entry;
  };
  while(walker.nextNode()){
    const node=walker.currentNode,el=node.parentElement;
    if(!node.textContent?.trim()||!el||el.closest('svg,.sr-only,[popover]:not(:popover-open)'))continue;
    range.selectNodeContents(node);
    for(const rect of range.getClientRects()){
      if(!rect.width||!rect.height)continue;
      if(rect.bottom>boundary.bottom-8||rect.top<boundary.top||rect.left<boundary.left||rect.right>boundary.right)return false;
      for(let ancestor=el;ancestor!==content;ancestor=ancestor.parentElement!){
        const {box,clipX,clipY}=geometry(ancestor);
        if(clipY&&(rect.bottom>box.bottom+1||rect.top<box.top-1))return false;
        if(clipX&&(rect.right>box.right+1||rect.left<box.left-1))return false;
      }
    }
  }
  return true;
}
const lowestText=(root:Element)=>Math.max(0,...[...root.querySelectorAll('p,li,td,th,h3,h4,a,small,figcaption,blockquote')].map(el=>el.getBoundingClientRect().bottom));
const panelWidth=(share:number,min:number,max:number)=>Math.min(innerWidth,Math.round(Math.min(max,Math.max(min,innerWidth*share))/20)*20);
function largestFont(dialog:HTMLElement,property:string,fits:()=>boolean,max:number):number{
  let low=13,high=max;
  dialog.style.setProperty(property,`${low}px`);
  if(!fits())return 0;
  if(dialog.style.setProperty(property,`${high}px`),fits())return high;
  for(let i=0;i<3;i++){const mid=(low+high)/2;dialog.style.setProperty(property,`${mid}px`);if(fits())low=mid;else high=mid;}
  dialog.style.setProperty(property,`${low}px`);
  return low;
}

/** The portfolio sidebar pattern, with native modal focus containment and viewport-fitted evidence. */
export function SidePanel({ title, onClose, children, wide = false, compact = false, kind }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; compact?:boolean; kind?:string }) {
  const [closing,setClosing]=useState(false);
  // Method fits with CSS alone, so its complete contents can paint immediately.
  const [contentReady,setContentReady]=useState(kind==='method');
  // Keep modal focus/close responsive while the chart or table body mounts.
  useEffect(()=>{
    let active=true,timer:ReturnType<typeof setTimeout>|undefined;
    const frame=requestAnimationFrame(()=>{timer=setTimeout(()=>{if(active)setContentReady(true);},0);});
    return()=>{active=false;cancelAnimationFrame(frame);clearTimeout(timer);};
  },[]);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const start=useRef<{x:number;y:number}|null>(null);
  const close=()=>{if(closing)return;setClosing(true);timer.current=setTimeout(onClose,matchMedia('(prefers-reduced-motion: reduce)').matches?0:180);};
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    if(dialog&&innerWidth>=768){
      const article=dialog.querySelector<HTMLElement>('.evidence-layout');
      if(article){dialog.style.width=`${evidenceWidth(article.dataset.test??'price')}px`;dialog.dataset.readingColumns='1';dialog.style.setProperty('--reading-font','13px');}
      if(dialog.querySelector('.owner-memo-depth'))dialog.style.width=`${panelWidth(.35,560,620)}px`;
    }
    dialog?.showModal();
    return () => { dialog?.close(); queueMicrotask(() => previous?.focus()); };
  }, []);
  useLayoutEffect(() => {
    const dialog=ref.current;
    if(!dialog||!contentReady||kind==='method')return;
    let stillFits:(()=>boolean)|undefined;
    const fit=()=>{
      if(innerWidth<768){
        dialog.style.width='';delete dialog.dataset.readingColumns;delete dialog.dataset.compactMemo;
        for(const name of ['--reading-font','--memo-font','--memo-leading','--preview-font','--method-font'])dialog.style.removeProperty(name);
        const method=dialog.querySelector<HTMLElement>('.method-sections'),business=dialog.querySelector<HTMLElement>('.owner-memo-depth');
        if(method)method.style.columnCount='';if(business){business.style.gridTemplateColumns='';business.style.columnCount='';}
        return;
      }
      dialog.querySelector<HTMLElement>('.drawer-chart[data-expanded]')?.style.removeProperty('height');
      // Every fit starts from the same state, so a refit with unchanged content lands on the same size.
      dialog.style.width='';delete dialog.dataset.readingColumns;delete dialog.dataset.compactMemo;
      for(const name of ['--reading-font','--memo-font','--memo-leading','--preview-font'])dialog.style.removeProperty(name);
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
        // One width per screen for every company (owner rule); only columns and type size adapt to the memo.
        dialog.style.width=`${panelWidth(.35,560,620)}px`;
        const available=business.parentElement!.clientHeight-16;
        const fits=()=>business.scrollHeight<=available&&business.scrollWidth<=business.clientWidth+1&&[...business.children].every(child=>child.scrollWidth<=child.clientWidth+1)&&textFits(business,business.parentElement!);
        dialog.style.setProperty('--memo-leading',String(innerHeight<850?1.2:1.35));
        stillFits=fits;
        let best={columns:3,font:13,used:0};
        for(const compact of [false,true]){
          if(compact)dialog.dataset.compactMemo='true';
          for(let columns=Math.max(1,Math.min(3,business.children.length));columns>=1;columns--){
            business.style.columnCount=String(columns);
            const font=largestFont(dialog,'--memo-font',fits,20),used=business.scrollHeight;
            if(font&&fits()&&used>best.used)best={columns,font,used};
            if(font&&fits()&&used>=available*.92)break;
          }
          if(best.used)break;
        }
        business.style.columnCount=String(best.columns);dialog.style.setProperty('--memo-font',`${best.font}px`);
        return;
      }
      const article=dialog.querySelector<HTMLElement>('.evidence-layout');
      if(!article)return;
      const content=article.parentElement!;
      const available=content.clientHeight-28;
      // One width per drawer type and screen, the same for every company (owner rule), sized for that type's widest content.
      const width=Math.min(innerWidth,evidenceWidth(article.dataset.test??(article.dataset.valuation!==undefined?'price':'')));
      dialog.style.width=`${width}px`;
      const clipping=[...article.querySelectorAll<HTMLElement>('*')].filter(el=>!el.closest('svg')&&getComputedStyle(el).overflowY!=='visible');
      const fits=()=>article.scrollHeight<=available&&article.scrollWidth<=article.clientWidth+1&&[...article.querySelectorAll('th,td')].every(cell=>cell.scrollWidth<=cell.clientWidth+1)&&clipping.every(el=>el.scrollHeight<=el.clientHeight+1)&&content.scrollHeight<=content.clientHeight+1&&textFits(article,content);
      // The width is fixed; the inner layout takes whichever column count allows the larger type (two only on wide drawers).
      let best={columns:'1',font:0,used:0};
      for(const columns of width>=480?['1','2']:['1']){
        dialog.dataset.readingColumns=columns;
        const font=largestFont(dialog,'--reading-font',fits,24);
        const used=lowestText(article)-article.getBoundingClientRect().top;
        if(fits()&&(used>best.used+24||Math.abs(used-best.used)<24&&font>best.font))best={columns,font,used};
      }
      dialog.dataset.readingColumns=best.columns;dialog.style.setProperty('--reading-font',`${best.font||13}px`);
    };
    let active=true,settling=false,again=false,lastSize='';
    let observed:Element|null=null;
    const watch=()=>{const el=dialog.querySelector('.evidence-layout,.owner-memo-depth,.method-sections');if(el)observed=el;return el;};
    const fitted=watch();
    // Charts redraw a frame or two after a width change, so every fit repeats until the content size holds still (bounded).
    // Fitted panels stay hidden until the first settled fit; afterwards only window resizes and new content refit them.
    const frames=()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
    const size=()=>{const el=observed as HTMLElement|null;return el?`${el.scrollHeight}x${el.scrollWidth}`:'';};
    const settle=async()=>{
      if(settling){again=true;return;}
      settling=true;
      do{again=false;watch();for(let round=0;round<6&&active;round++){fit();const before=size();await frames();if(size()===before||stillFits?.())break;}}while(again&&active);
      const article=dialog.querySelector<HTMLElement>('.evidence-layout');
      const chart=article?.querySelector<HTMLElement>('.drawer-chart');
      if(active&&innerWidth>=768&&dialog.dataset.readingColumns==='1'&&article&&chart?.querySelector('[data-testid=threshold-series]')){
        const spare=article.parentElement!.getBoundingClientRect().bottom-lowestText(article)-32;
        if(spare>48){chart.dataset.expanded='true';chart.style.setProperty('height',`${chart.getBoundingClientRect().height+spare}px`,'important');await frames();}
      }
      lastSize=size();settling=false;
      if(active)delete dialog.dataset.fitting;
    };
    if(fitted)dialog.dataset.fitting='true';else fit();
    // Let the modal header and close control paint before the measured text fit.
    let started=false,startQueued=false;const start=()=>{if(startQueued||!active)return;startQueued=true;requestAnimationFrame(()=>setTimeout(()=>{if(active){started=true;void settle();}},0));};
    const fallback=setTimeout(start,1500);
    document.fonts.ready.then(()=>{clearTimeout(fallback);start();});
    const schedule=()=>{if(started)void settle();};
    // Responsive charts can change height after the two-frame settling window.
    // Ignore our own already-settled size, but refit subsequent layout changes.
    const resizeObserver=new ResizeObserver(()=>{if(!settling&&size()!==lastSize)schedule();});
    if(observed)resizeObserver.observe(observed);
    const observer=new MutationObserver(records=>{if(records.some(record=>!(record.target instanceof Element?record.target:record.target.parentElement)?.closest('svg,.chart-interaction')))schedule();});
    observer.observe(dialog,{childList:true,subtree:true});
    window.addEventListener('resize',schedule);
    return()=>{active=false;clearTimeout(fallback);observer.disconnect();resizeObserver.disconnect();window.removeEventListener('resize',schedule);};
  },[children,contentReady,kind]);
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
    <div className="panel-shell"><header onPointerDown={e=>{if(e.pointerType!=="touch")return;start.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{if(start.current&&e.clientY-start.current.y>70&&Math.abs(e.clientX-start.current.x)<70)close();start.current=null;}}><i className="sheet-handle" aria-hidden="true"/><h2>{title}</h2><button aria-label="Close panel" onClick={close}>Close <span aria-hidden="true">×</span></button></header><div className="panel-content" aria-busy={!contentReady}>{contentReady?children:kind==='business'?<div className="owner-memo-depth"/>:kind==='holders'?<div className="company-holders-panel"/>:kind?<div className="evidence-layout" data-test={kind}/>:null}</div></div>
  </dialog>;
}
