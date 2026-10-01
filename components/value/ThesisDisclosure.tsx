import type {PublicThesis} from '@/lib/value/thesis/types';
import {PagedItems} from './PanelTabs';

/** Keep every word of the cited passage reachable within the fitted drawer. */
function pages(text:string){
 const words=text.split(/\s+/),result:string[]=[];let page='';
 for(const word of words){if(page&&(page+' '+word).length>400){result.push(page);page=word;}else page+=(page?' ':'')+word;}
 if(page)result.push(page);return result;
}
export function ThesisDisclosure({thesis}:{thesis:PublicThesis}){
 const evidence=[...thesis.evidence,...(thesis.guidance?[thesis.guidance.evidence]:[])];
 const unique=evidence.filter((e,i)=>evidence.findIndex(other=>other.url===e.url&&other.quote===e.quote)===i);
 return <><p>{thesis.reason}</p>{thesis.guidance&&<p>{thesis.guidance.reason}</p>}<PagedItems size={1} items={unique.flatMap(e=>pages(e.quote).map((text,i)=><blockquote key={`${e.url}-${i}`} className="thesis-evidence"><p>{text}</p><a href={e.url}>Filing · {e.filed}{i?' · continued':''} ↗</a></blockquote>))}/></>;
}
