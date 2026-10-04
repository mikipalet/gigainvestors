'use client';
import {compactJudgement} from '@/lib/value/judgement/presentation';
import type {Adjustment} from '@/lib/value/judgement/types';
import {useEffect,useState} from 'react';
import {numericJudgementReason} from '@/lib/value/judgement/apply';
import {MEMO_QUESTIONS} from '@/lib/value/owner-memo';
import type {Analysis,TestOutcome} from '@/lib/value/types';
import {SidePanel} from './SidePanel';
const loadDepth=()=>import('./BusinessDepth');
type Depth=Awaited<ReturnType<typeof loadDepth>>['BusinessDepth'];
export function JudgementLine({test,onExplain,adjustments,currency}:{test:TestOutcome;onExplain?:()=>void;adjustments?:Adjustment[];currency?:string}){
 if(!test.judgement?.override)return null;
 const j=test.judgement??{result:test.result,reason:numericJudgementReason(test),override:false};
 if(onExplain)return <button className="human-judgement judgement-compact" data-override={j.override} onClick={onExplain} title={j.reason} aria-label={`Judgement: ${j.result}. Read why`}><strong>{compactJudgement(test,adjustments,currency)}</strong><span aria-hidden="true">↗</span></button>;
 return <div className="human-judgement" data-override={j.override}><p className="numeric-reading">Numbers: {test.rawNumeric??test.numeric}{test.key==='economics'&&test.rawMetrics?.oeToNi!=null&&test.metrics.oeToNi!=null&&test.rawMetrics.oeToNi!==test.metrics.oeToNi?` · ${test.rawMetrics.oeToNi.toFixed(2)}× → ${test.metrics.oeToNi.toFixed(2)}×`:null}</p><p><strong>Judgement: {j.result==='pass'?'passes':j.result==='fail'?'fails':'still open'}</strong> — {j.reason}</p>{j.evidence&&<details><summary>Why we read it this way</summary><blockquote>{j.evidence.quote}</blockquote><a href={j.evidence.url} target="_blank" rel="noreferrer">Filing · {j.evidence.filed} ↗</a></details>}</div>;
}

export function BusinessSection({analysis,price=null}:{analysis:Analysis;price?:number|null}){
 const [selected,setSelected]=useState<string|null>(null),[Depth,setDepth]=useState<Depth|null>(null);
 // The drawer opens only with its content in hand; an empty drawer that fills in later re-fits visibly.
 useEffect(()=>{const timer=setTimeout(()=>void loadDepth().then(m=>setDepth(()=>m.BusinessDepth)),800);return()=>clearTimeout(timer);},[]);
 const open=(key:string)=>void loadDepth().then(m=>{setDepth(()=>m.BusinessDepth);setSelected(key);});
 const lines=analysis.ownerMemo?.lines??[];
 if(!lines.length)return null;
 return <section className="business-section owner-memo" aria-label="The business" data-testid="the-business" data-compact={lines.length<5}>
  <header><h2>The business</h2><button className="business-open" onClick={()=>open('overview')}><span className="memo-desktop">In depth</span><span className="memo-phone">More</span> <span aria-hidden="true">↗</span></button></header>
  <dl className="memo-lines">{lines.map(line=><div key={line.question} data-question={line.question}>
   <dt>{MEMO_QUESTIONS[line.question-1]}</dt><dd><button onClick={()=>open(String(line.question))}>{line.tone&&<i className={`flag-dot ${line.tone}`} aria-hidden="true"/>}{line.answer}</button></dd>
  </div>)}</dl>
  {selected&&Depth&&<SidePanel kind="business" title="The business, in depth" wide onClose={()=>setSelected(null)}><Depth analysis={analysis} price={price} selected={selected}/></SidePanel>}
 </section>;
}
