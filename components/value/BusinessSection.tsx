import {numericJudgementReason} from '@/lib/value/judgement/apply';
import type { Analysis, TestOutcome } from '@/lib/value/types';
import { TOPICS } from '@/lib/value/judgement/questions';
const readingCopy:Record<string,string>={brand:'Customers recognise and trust the brand.',network:'The network becomes more useful as it grows.',switching:'Changing providers would disrupt customers’ work.',cost:'Lower costs give it room to compete.',regulation:'Permission to operate limits new competitors.',scale:'Its reach gives it an advantage over smaller rivals.',demonstrated:'The filing describes higher prices with resilient demand.',pressured:'Higher prices have cost it demand.',concentrated:'A small group of customers or suppliers matters.',diversified:'Sales are spread across customers.',admission:'Management acknowledges a shortcoming.',buybacks:'Management is returning cash through buybacks.',dividends:'Management is returning cash through dividends.',acquisitions:'Management is buying other businesses.',reinvestment:'Management is putting money back into the business.',mixed:'Management splits cash between several uses.'};

function Quote({text}:{text:string}){
 const limit=420;
 if(text.length<=limit)return <blockquote>{text}</blockquote>;
 const end=text.slice(0,limit).lastIndexOf(' ');
 return <><blockquote>{text.slice(0,end>0?end:limit)}…</blockquote><details className="full-business-quote"><summary>Read the full passage</summary><blockquote>{text}</blockquote></details></>;
}

export function JudgementLine({test}:{test:TestOutcome}){
 const j=test.judgement??{result:test.result,reason:numericJudgementReason(test),override:false};
 return <div className="human-judgement" data-override={j.override}><p><strong>Judgement: {j.result==='pass'?'passes':j.result==='fail'?'fails':'still open'}</strong> — {j.reason}</p>{j.evidence&&<details><summary>Why we read it this way</summary><blockquote>{j.evidence.quote}</blockquote><a href={j.evidence.url} target="_blank" rel="noreferrer">Filing · {j.evidence.filed} ↗</a></details>}</div>;
}
export function BusinessSection({analysis}:{analysis:Analysis}){
 const j=analysis.judgement;
 return <section className="business-section" aria-label="The business" data-testid="the-business"><header><h2>The business</h2><p>What the company says about its customers, choices and risks.</p></header>
 <div className="business-readings">{j?.business.map(r=><article key={r.id}><h3>{TOPICS[r.id]?.label??r.id}</h3>{readingCopy[r.value]&&<p>{readingCopy[r.value]}</p>}<Quote text={r.evidence!.quote}/><a href={r.evidence!.url} target="_blank" rel="noreferrer">{r.evidence!.section==='wiki'?'Company background':'Annual report'} · {r.evidence!.filed} ↗</a></article>)}</div>
 {j?.adjustments.length?<div className="business-adjustments"><h3>What changes our reading</h3>{j.adjustments.map((a,i)=><p key={i}>{a.reason}{a.amountEvidence&&<><br/><q>{a.amountEvidence.quote}</q> <a href={a.amountEvidence.url}>Filing ↗</a></>}</p>)}<p>The capex estimate applies to the current filing’s three-year reporting window. Earlier years keep the original calculation.</p>{[...new Map(j.adjustments.map(a=>[a.evidence.quote,a.evidence])).values()].map(e=><div key={e.quote}><Quote text={e.quote}/><a href={e.url}>Annual report · {e.filed} ↗</a></div>)}</div>:null}
 {j?.facts.length? <p className="business-facts">{j.facts.filter(f=>!j.business.some(r=>r.evidence?.url===f.url)).map((f,i)=><span key={f.url+i}>{f.text} <a href={f.url} target="_blank" rel="noreferrer">Source ↗</a> </span>)}</p>:null}
 {!j?.business.length&&analysis.company.description&&<p>{analysis.company.description.split(/(?<=\.)\s+(?=[A-Z])/)[0]}</p>}
 </section>;
}
