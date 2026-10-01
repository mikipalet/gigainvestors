'use client';
import {useEffect} from 'react';
import type {Analysis} from '@/lib/value/types';
import {BusinessQuote} from './BusinessQuote';
import {THEMES,type BusinessFlag} from '@/lib/value/flags/types';
import {readingCopy} from '@/lib/value/flags/presentation';
import {TOPICS} from '@/lib/value/judgement/questions';
import {RelationshipsMap} from './RelationshipsMap';

function FlagChart({flag}:{flag:BusinessFlag}){
 const points=flag.series.filter((p):p is [number,number]=>p[1]!==null&&Number.isFinite(p[1])).sort((a,b)=>a[0]-b[0]);
 if(!points.length)return null;
 const format=(v:number)=>flag.unit==='percent'?`${(v*100).toFixed(0)}%`:flag.unit==='ratio'?`${v.toFixed(1)}×`:flag.unit==='years'?`${v} yrs`:flag.unit==='money'?`${flag.currency??''} ${(v/(Math.abs(v)>=1e9?1e9:1e6)).toFixed(1)}${Math.abs(v)>=1e9?'bn':'m'}`:v>=1e6?`${(v/1e6).toFixed(0)}m`:String(v);
 const values=points.map(p=>p[1]),min=Math.min(...values),max=Math.max(...values),height=60;
 const coords=points.map((p,i)=>[points.length===1?145:12+i*266/(points.length-1),height-8-(p[1]-min)/(max-min||1)*(height-20)]);
 return <figure className="flag-chart" aria-label={`${flag.label}, reported history`}>
  <figcaption><span>FY{points[0][0]}{points.length>1?`–${points.at(-1)![0]}`:''}</span><strong>{format(points.at(-1)![1])}</strong></figcaption>
  <svg viewBox="0 0 290 65" role="img" aria-label={points.map(([fy,v])=>`${fy}: ${format(v)}`).join('; ')}><path d="M12 57H278" className="flag-baseline"/>{coords.length>1&&<polyline points={coords.map(p=>p.join(',')).join(' ')} fill="none"/>}{coords.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={3}><title>{points[i][0]}: {format(points[i][1])}</title></circle>)}</svg>
  {points.length===1?<p>Single-period disclosure</p>:<details><summary>Annual values</summary><table><tbody>{points.map(([fy,v])=><tr key={fy}><th>FY{fy}</th><td>{format(v)}</td></tr>)}</tbody></table></details>}
 </figure>;
}
export function BusinessDepth({analysis,selected}:{analysis:Analysis;selected:string}){
 const j=analysis.judgement,flags=analysis.businessDepth?.flags??[],relationships=analysis.businessDepth?.relationships??[];
 useEffect(()=>{if(selected==='overview')return;const frame=requestAnimationFrame(()=>document.getElementById(`business-detail-${selected}`)?.scrollIntoView({block:'start'}));return()=>cancelAnimationFrame(frame);},[selected]);
 return <div className="business-depth">
  <section className="business-column business-readings" aria-label="Business evidence"><h3>Customers, choices &amp; risks</h3>
   {j?.business.map(r=><article key={r.id} id={`business-detail-reading-${r.id}`}><h4>{TOPICS[r.id]?.label??r.id}</h4>{readingCopy[r.value]&&<p>{readingCopy[r.value]}</p>}{r.evidence&&<BusinessQuote evidence={r.evidence}/>}</article>)}
   {!j?.business.length&&analysis.company.description&&<p>{analysis.company.description}</p>}
   {j?.adjustments.length?<article><h4>What changes our reading</h4>{j.adjustments.map((a,i)=><div key={i}><p>{a.reason}</p><BusinessQuote evidence={a.amountEvidence??a.evidence}/></div>)}</article>:null}
   {j?.facts.filter(f=>!j.business.some(r=>r.evidence?.url===f.url)).map((f,i)=><p key={i}>{f.text} <a href={f.url} target="_blank" rel="noreferrer">Source ↗</a></p>)}
  </section>
  <section className="business-column business-flags" aria-label="Flags by theme"><h3>Flags to understand <span>{flags.length}</span></h3>
   {THEMES.map(theme=>{const group=flags.filter(f=>f.theme===theme);return group.length?<section key={theme} className="flag-group"><h4>{theme}</h4>{group.map(f=><article key={f.id} className="flag-detail" id={`business-detail-${f.id}`} data-selected={selected===f.id}>
    <h5><i className={`flag-dot ${f.tone}`} aria-hidden="true"/><span className="sr-only">{f.tone==='red'?'Risk: ':'Strength: '}</span>{f.label}</h5><p>{f.why}</p><FlagChart flag={f}/>{f.evidence.map((e,i)=><BusinessQuote key={i} evidence={e}/>)}<p className="buffett-question"><strong>What Buffett would ask</strong>{f.question}</p>
   </article>)}</section>:null;})}
  </section>
  <section className="business-column business-connections" id="business-detail-relationships" aria-label="Relationships disclosed in filings"><h3>Relationships disclosed in filings</h3><p className="relationships-scope">Disclosed counterparties, with ownership links from Wikidata labelled separately. This does not cover the full bond, project-finance or asset-backed financing network.</p><RelationshipsMap owner={analysis.company} relationships={relationships}/></section>
 </div>;
}
