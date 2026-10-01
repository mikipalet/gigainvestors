'use client';
import {useId} from 'react';
import {MEMO_QUESTIONS,type MemoLine} from '@/lib/value/owner-memo';
import {formatMetric} from '@/lib/value/metric-labels';
import type {Analysis} from '@/lib/value/types';
import type {Evidence} from '@/lib/value/judgement/types';
import {MiniSeries} from './viz/MiniSeries';
function SourceLink({evidence}:{evidence:Evidence}){
 const computed=evidence.section.startsWith('Calculated');
 const id=useId();
 return <span className="memo-source"><button popoverTarget={id} aria-label={computed?"Read calculation":"Read source quote"}>{computed?"Calculation":"Quote"} ↗</button><span id={id} popover="auto" className="memo-quote">{computed?<p>{evidence.quote}</p>:<blockquote>{evidence.quote}</blockquote>}<a href={evidence.url} target="_blank" rel="noreferrer">{evidence.section} · {evidence.filed.slice(0,10)} ↗</a></span><a href={evidence.url} target="_blank" rel="noreferrer" aria-label="Open original source">Source ↗</a></span>;
}
function Answer({line,selected,currency}:{line:MemoLine;selected:string;currency:string}){
 return <article className="memo-evidence" data-selected={selected===String(line.question)}>
  <h3>{MEMO_QUESTIONS[line.question-1]}</h3><p>{line.answer}</p>
  {line.chart&&<MiniSeries series={line.chart.points} label={line.chart.label} format={line.chart.unit==='percent'?'pct':line.chart.unit==='ratio'?'x':'money'} currency={currency} height={140}/>}
  {line.chart&&<table className="memo-years"><thead><tr><th>Year</th><th>{line.chart.label}</th></tr></thead><tbody>{line.chart.points.slice(-10).map(([fy,value])=><tr key={fy}><th>FY{fy}</th><td>{formatMetric({value,format:line.chart!.unit==='percent'?'pct':line.chart!.unit==='ratio'?'x':'money',currency})}</td></tr>)}</tbody></table>}
  <footer>{line.evidence.map((e,i)=><SourceLink key={i} evidence={e}/>)}</footer>
 </article>;
}
export function BusinessDepth({analysis,selected}:{analysis:Analysis;selected:string}){
 const lines=analysis.ownerMemo?.lines??[],currency=analysis.reportingCurrency??analysis.company.currency;
 return <div className="owner-memo-depth">
  {[[1,2,3],[4,5],[6,7]].map((questions,i)=><section key={i} className="memo-column" aria-label={['Business and customers','Capital and managers','Risk and price'][i]}>
   {lines.filter(l=>questions.includes(l.question)).map(l=><Answer key={l.question} line={l} selected={selected} currency={currency}/>)}
  </section>)}
 </div>;
}
