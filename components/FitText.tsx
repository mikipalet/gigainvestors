'use client';
import {useLayoutEffect,useRef,type ReactNode} from 'react';
/** Small treemap cells show only complete labels; the tile's accessible name retains detail. */
export function FitText({children,className='',style}:{children:ReactNode;className?:string;style?:React.CSSProperties}){
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const el=ref.current;if(!el)return;
  const fit=()=>{
   const range=document.createRange();range.selectNodeContents(el);const text=range.getBoundingClientRect(),tile=el.closest('.tile-edge')?.getBoundingClientRect();
   const cut=el.scrollWidth>el.clientWidth+1||!!tile&&(text.bottom>tile.bottom+1||text.right>tile.right+1||text.top<tile.top-1);
   el.style.visibility=cut?'hidden':'visible';
  };
  fit();const observer=new ResizeObserver(fit);observer.observe(el);document.fonts.ready.then(fit);
  return()=>observer.disconnect();
 },[children]);
 return <div ref={ref} className={className} style={{...style,whiteSpace:'nowrap'}}>{children}</div>;
}
