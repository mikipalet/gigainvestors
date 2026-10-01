'use client';
import {useRef,useState,type KeyboardEvent,type PointerEvent} from 'react';
export type ChartPoint={x:number;y?:number;text:string;href?:string};
/** Shared nearest-point selection for mouse, keyboard and touch, in SVG coordinates. */
export function useChartInteraction(points:ChartPoint[],width:number,height:number,onActive?:(i:number|null)=>void){
 const ref=useRef<HTMLDivElement>(null),[active,setActive]=useState<number|null>(null),[pointer,setPointer]=useState<{x:number;y:number}|null>(null);
 const select=(i:number|null)=>{setActive(i);onActive?.(i);};
 const locate=(e:PointerEvent<HTMLDivElement>)=>{if(!points.length)return;const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*width,y=(e.clientY-r.top)/r.height*height;const i=points.reduce((best,p,i)=>Math.hypot(p.x-x,(p.y??y)-y)<Math.hypot(points[best].x-x,(points[best].y??y)-y)?i:best,0);select(i);setPointer({x:e.clientX,y:e.clientY});};
 const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){if(active!==null){e.preventDefault();e.stopPropagation();select(null);}return;}if(e.key==='Enter'&&active!==null&&points[active]?.href){window.location.assign(points[active].href!);return;}if(!points.length||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const i=e.key==='Home'?0:e.key==='End'?points.length-1:Math.max(0,Math.min(points.length-1,(active??0)+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)));select(i);setPointer(null);};
 const r=ref.current?.getBoundingClientRect(),p=active===null?null:points[active];
 return {ref,active,point:p,position:pointer??(r&&p?{x:r.left+p.x/width*r.width,y:r.top+(p.y??height/2)/height*r.height}:null),handlers:{onPointerMove:locate,onPointerDown:(e:PointerEvent<HTMLDivElement>)=>{e.stopPropagation();e.currentTarget.focus({preventScroll:true});locate(e);},onPointerLeave:(e:PointerEvent<HTMLDivElement>)=>{if(e.pointerType==='touch')return;select(null);setPointer(null);},onFocus:()=>{if(active===null)select(0);},onBlur:()=>select(null),onKeyDown:key}};
}
