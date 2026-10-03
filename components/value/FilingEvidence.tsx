import type {ReactNode} from 'react';
import type {Dossier,TestOutcome} from '@/lib/value/types';
import excerpts from '@/lib/value/filing-excerpts.json';
import {displayReturnText} from '@/lib/value/metric-labels';
import {humanLabel} from '@/lib/value/presentation';

type Excerpt={quote:string;url:string;year:string;label:string;context?:string};
const reviewed:Record<string,Record<string,Excerpt>>=excerpts;
/** Excerpts are verbatim passages; model readings remain separately labelled. */
export function FilingEvidence({dossier,test,children}:{dossier:Dossier;test?:TestOutcome;children?:ReactNode}){
 const key=test?.key??'valuation',selected=reviewed[dossier.id]?.[key];
 const quotes:Excerpt[]=selected?[selected]:test?.jev.filter(a=>a.evidence&&dossier.report.url).slice(0,2).map(a=>({quote:a.evidence!.length>240?a.evidence!.slice(0,240).replace(/\s+\S*$/,'')+'…':a.evidence!,url:dossier.report.url!,year:(dossier.report.period??dossier.report.filed??'').slice(0,4),label:'Annual report'}))??[];
 const predecessors=Object.values((dossier.predecessorHistory??[]).reduce<Record<string,{parent:string;source:string;basis:string;years:number[]}>>((groups,row)=>{const k=row.source;const g=groups[k]??={parent:row.parent,source:row.source,basis:row.basis,years:[]};g.years.push(row.fy);return groups;},{}));
 const trusted=test?.jev.filter(a=>test.key==='accounting'?a.probability!==null&&a.value!==null:a.trusted)??[];
 return <section className="filing-evidence"><h3>From the filing</h3>{predecessors.map(p=><p className="drawer-table-note" style={{fontSize:13,lineHeight:1.35}} key={p.source}>FY{Math.min(...p.years)}{p.years.length>1?`–${Math.max(...p.years)}`:''} · before the spin-off: {p.parent} segment · <a href={p.source}>{p.basis==='combined'?'combined accounts':'segment report'} ↗</a></p>)}<div className="filing-quotes">{quotes.map((q,i)=><blockquote key={i}>{q.context&&<p className="quote-context">{q.context}</p>}<p>“{q.quote}”</p>{!quotes.slice(i+1).some(next=>next.url===q.url)&&<a href={q.url}>{q.label} · {q.year} ↗</a>}</blockquote>)}</div>{!quotes.length&&dossier.report.url&&<a className="filing-source" href={dossier.report.url}>Original filing · {(dossier.report.period??dossier.report.filed??'').slice(0,4)} ↗</a>}{trusted.length>0&&<div className="jev-readings"><h4>Jev readings · {trusted.some(a=>a.section==='description')?'company description':'filing assessment'}</h4><ul>{trusted.map(a=><li key={a.q}><span>{a.label}{a.kind==='choice'&&typeof a.value==='string'?`: ${humanLabel(a.value)}`:''}</span><b title={a.kind==='noul'?'Likelihood':'Model confidence'}>{a.probability==null?'':`${Math.round(a.probability*100)}%`}</b></li>)}</ul></div>}{children}{test&&<div className="drawer-rules">{test.reasons.filter(r=>!/^\$1 retained|^ROIC first|informational/.test(r)&&!(predecessors.length&&/^ROIC (median|worst years) below threshold/.test(r))).slice(0,2).map((r,i)=><p key={i} style={predecessors.length?{display:'block'}:undefined}>{displayReturnText(r)}</p>)}</div>}</section>;
}
