import type {Evidence} from '@/lib/value/judgement/types';
export function BusinessQuote({evidence,compact=false}:{evidence:Evidence;compact?:boolean}){
 const text=evidence.quote,short=text.length>150?text.slice(0,text.lastIndexOf(' ',150))+'…':text;
 if(compact)return <details className="business-quote business-quote-compact"><summary>Full passage · {evidence.filed}</summary><blockquote>{text}</blockquote><a href={evidence.url} target="_blank" rel="noreferrer">{evidence.section==='Vendor company description'?'Company description':'Filing'} ↗</a></details>;
 return <div className="business-quote">{evidence.section.startsWith('Wikidata')?<p>{short}</p>:<blockquote>{short}</blockquote>}{text!==short&&<details><summary>Full passage</summary><blockquote>{text}</blockquote></details>}<a href={evidence.url} target="_blank" rel="noreferrer">{evidence.section.startsWith('Wikidata')?'Wikidata':evidence.section==='wiki'?'Company background':'Filing'} · {evidence.filed} ↗</a></div>;
}
