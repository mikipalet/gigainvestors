'use client';
import {useRef} from 'react';
import {useWidth} from '@/lib/value/viz/use-width';
import type {PublicThesis} from '@/lib/value/thesis/types';
import {PagedItems} from './PanelTabs';

/** Keep every word of the cited passage reachable within the fitted drawer. */
function pages(text:string,limit:number){
 const words=text.split(/\s+/),result:string[]=[];let page='';
 for(const word of words){if(page&&(page+' '+word).length>limit){result.push(page);page=word;}else page+=(page?' ':'')+word;}
 if(page)result.push(page);return result;
}
export function ThesisDisclosure({thesis}:{thesis:PublicThesis}){
 const {ref,width,height}=useWidth(),heading=useRef<HTMLParagraphElement>(null);
 const font=Math.min(26,Math.max(20,(height+102)*.022));
 const limit=Math.max(240,Math.floor(Math.max(100,height-(heading.current?.clientHeight??80)-130)/(font*1.45)*(width/(font*.55))));
 const evidence=[...thesis.evidence,...(thesis.guidance?[thesis.guidance.evidence]:[])];
 const unique=evidence.filter((e,i)=>evidence.findIndex(other=>other.url===e.url&&other.quote===e.quote)===i);
 return <article ref={ref} className="thesis-panel"><p ref={heading} className="panel-answer">{thesis.reason}</p>{thesis.guidance&&<p>{thesis.guidance.reason}</p>}<PagedItems size={1} items={unique.flatMap(e=>pages(e.quote,limit).map((text,i)=><blockquote key={`${e.url}-${i}`} className="thesis-evidence"><p>{text}</p><a href={e.url}>Filing · {e.filed}{i?' · continued':''} ↗</a></blockquote>))}/></article>;
}
