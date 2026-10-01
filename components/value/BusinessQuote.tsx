import type {Evidence} from '@/lib/value/judgement/types';
export function BusinessQuote({evidence}:{evidence:Evidence}){
 const text=evidence.quote,short=text.length>440?text.slice(0,text.lastIndexOf(' ',440))+'…':text;
 return <div className="business-quote">{evidence.section.startsWith('Wikidata')?<p>{short}</p>:<blockquote>{short}</blockquote>}{text!==short&&<details><summary>Full passage</summary><blockquote>{text}</blockquote></details>}<a href={evidence.url} target="_blank" rel="noreferrer">{evidence.section.startsWith('Wikidata')?'Wikidata':evidence.section==='wiki'?'Company background':'Filing'} · {evidence.filed} ↗</a></div>;
}
