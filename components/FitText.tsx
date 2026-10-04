'use client';
import {useLayoutEffect,useRef,type ReactNode} from 'react';

// A quarter changes many labels at once. Read the entire batch before changing
// visibility so each tile does not force the next tile's style/layout pass.
const pending=new Set<HTMLElement>();
let scheduled=false;
function scheduleFit(el:HTMLElement){
 pending.add(el);
 if(scheduled)return;
 scheduled=true;
 queueMicrotask(()=>{
  scheduled=false;
  const updates=[...pending].filter(el=>el.isConnected).map(el=>{
   const range=document.createRange();range.selectNodeContents(el);
   const text=range.getBoundingClientRect(),tile=el.closest('.tile-edge')?.getBoundingClientRect();
   const cut=el.scrollWidth>el.clientWidth+1||!!tile&&(text.bottom>tile.bottom+1||text.right>tile.right+1||text.top<tile.top-1);
   return [el,cut?'hidden':'visible'] as const;
  });
  pending.clear();
  for(const [el,visibility]of updates)if(el.style.visibility!==visibility)el.style.visibility=visibility;
 });
}
/** Small treemap cells show only complete labels; the tile's accessible name retains detail. */
export function FitText({children,className='',style}:{children:ReactNode;className?:string;style?:React.CSSProperties}){
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const el=ref.current;if(!el)return;
  scheduleFit(el);const observer=new ResizeObserver(()=>scheduleFit(el));observer.observe(el);
  if(document.fonts.status==='loading')void document.fonts.ready.then(()=>{if(el.isConnected)scheduleFit(el);});
  return()=>{observer.disconnect();pending.delete(el);};
 },[children]);
 return <div ref={ref} className={className} style={{...style,whiteSpace:'nowrap'}}>{children}</div>;
}
