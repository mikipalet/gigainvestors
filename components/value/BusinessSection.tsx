'use client';
import {useState} from 'react';
import dynamic from 'next/dynamic';
import {numericJudgementReason} from '@/lib/value/judgement/apply';
import {businessLines} from '@/lib/value/flags/presentation';
import type {Analysis,TestOutcome} from '@/lib/value/types';
import {SidePanel} from './SidePanel';
const BusinessDepth=dynamic(()=>import('./BusinessDepth').then(m=>m.BusinessDepth));
export function JudgementLine({test,onExplain}:{test:TestOutcome;onExplain?:()=>void}){
 const j=test.judgement??{result:test.result,reason:numericJudgementReason(test),override:false};
 if(onExplain)return <button className="human-judgement judgement-compact" data-override={j.override} onClick={onExplain} title={j.reason} aria-label={`Judgement: ${j.result}. Read why`}><strong>Judgement: {j.result==='pass'?'passes':j.result==='fail'?'fails':'still open'}</strong><span aria-hidden="true">↗</span></button>;
 return <div className="human-judgement" data-override={j.override}><p><strong>Judgement: {j.result==='pass'?'passes':j.result==='fail'?'fails':'still open'}</strong> — {j.reason}</p>{j.evidence&&<details><summary>Why we read it this way</summary><blockquote>{j.evidence.quote}</blockquote><a href={j.evidence.url} target="_blank" rel="noreferrer">Filing · {j.evidence.filed} ↗</a></details>}</div>;
}

export function BusinessSection({analysis}:{analysis:Analysis}){
 const [selected,setSelected]=useState<string|null>(null);
 const lines=businessLines(analysis);
 if(!lines.length&&!analysis.judgement?.business.length)return null;
 return <section className="business-section" aria-label="The business" data-testid="the-business">
  <header><h2>The business</h2><button className="business-open" onClick={()=>setSelected('overview')}>In depth <span aria-hidden="true">↗</span></button></header>
  <ul className="business-lines">{lines.map((line,i)=><li key={line.id} data-line-index={i}>
   <button className="business-line" data-tone={line.tone} aria-describedby={`business-why-${i}`} onClick={()=>setSelected(line.id)}>
    {line.tone&&<><i className={`flag-dot ${line.tone}`} aria-hidden="true"/><span className="sr-only">{line.tone==='red'?'Risk: ':'Strength: '}</span></>}<span>{line.text}</span>
   </button><span role="tooltip" id={`business-why-${i}`} className="business-tooltip">{line.why.length>240?line.why.slice(0,line.why.lastIndexOf(' ',240))+'…':line.why}</span>
  </li>)}</ul>
  {selected&&<SidePanel title="The business, in depth" wide onClose={()=>setSelected(null)}><BusinessDepth analysis={analysis} selected={selected}/></SidePanel>}
 </section>;
}
