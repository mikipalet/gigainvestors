'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import type {PublicThesis} from '@/lib/value/thesis/types';

type Passage={text:string;url:string;filed:string};
/** Paginate the quoted words against their rendered height, preserving every word. */
export function ThesisDisclosure({thesis}:{thesis:PublicThesis}){
 const body=useRef<HTMLDivElement>(null),measure=useRef<HTMLParagraphElement>(null);
 const [passages,setPassages]=useState<Passage[]>([]),[page,setPage]=useState(0);
 useLayoutEffect(()=>{
  const container=body.current,probe=measure.current;if(!container||!probe)return;
  let active=true;const fit=()=>{
   if(!active)return;
   const evidence=[...thesis.evidence,...(thesis.guidance?[thesis.guidance.evidence]:[])];
   const unique=evidence.filter((e,i)=>evidence.findIndex(other=>other.url===e.url&&other.quote===e.quote)===i);
   const available=container.clientHeight-66,result:Passage[]=[];
   for(const item of unique){
    const words=item.quote.split(/\s+/).filter(Boolean);let offset=0;
    while(offset<words.length){
     let low=1,high=words.length-offset;
     while(low<high){const middle=Math.ceil((low+high)/2);probe.textContent=words.slice(offset,offset+middle).join(' ');if(probe.scrollHeight<=available)low=middle;else high=middle-1;}
     result.push({text:words.slice(offset,offset+low).join(' '),url:item.url,filed:item.filed});offset+=low;
    }
   }
   probe.textContent='';setPassages(result);
  };
  fit();const observer=new ResizeObserver(fit);observer.observe(container);document.fonts.ready.then(fit);window.addEventListener('resize',fit);
  return()=>{active=false;observer.disconnect();window.removeEventListener('resize',fit);};
 },[thesis]);
 const current=Math.min(page,Math.max(0,passages.length-1)),passage=passages[current];
 return <article className="thesis-panel"><p className="panel-answer">{thesis.reason}</p>{thesis.guidance&&<p>{thesis.guidance.reason}</p>}<div className="thesis-pages" ref={body}><p className="thesis-measure" ref={measure} aria-hidden="true"/>{passage&&<blockquote className="thesis-evidence"><p>{passage.text}</p><a href={passage.url}>Filing · {passage.filed} ↗</a></blockquote>}<nav aria-label="Detail pages"><button disabled={!current} onClick={()=>setPage(current-1)} aria-label="Previous detail page">←</button><span>{current+1} / {passages.length||1}</span><button disabled={current>=passages.length-1} onClick={()=>setPage(current+1)} aria-label="Next detail page">→</button></nav></div></article>;
}
