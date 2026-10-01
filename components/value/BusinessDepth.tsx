'use client';
import {publicBusiness} from '@/lib/value/flags/public';
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
 const j=analysis.judgement,depth=publicBusiness(analysis.businessDepth,analysis),flags=depth?.flags??[],relationships=depth?.relationships??[];
 const hasBusiness=Boolean(j?.business.length||analysis.businessOverview?.some(l=>l.kind!=='flag'&&l.kind!=='relationship'));
 useEffect(()=>{if(selected==='overview')return;const frame=requestAnimationFrame(()=>{const target=document.getElementById(`business-detail-${selected}`);const details=target?.querySelector<HTMLDetailsElement>('.flag-full');if(details)details.open=true;target?.scrollIntoView({block:'start'});});return()=>cancelAnimationFrame(frame);},[selected]);
 return <div className="business-depth" data-connections={relationships.length>0} data-columns={Number(hasBusiness)+Number(flags.length>0)+Number(relationships.length>0)}>
  {hasBusiness&&<section className="business-column business-readings" tabIndex={0} aria-label="Business evidence"><h3>Customers, choices &amp; risks</h3>
   {j?.business.map(r=>{const line=analysis.businessOverview?.find(l=>l.id===`reading-${r.id}`);return <article key={r.id} id={`business-detail-reading-${r.id}`}><h4>{TOPICS[r.id]?.label??r.id}</h4>{(line?.text??readingCopy[r.value])&&<p>{line?.text??readingCopy[r.value]}</p>}{line?.answer&&line.answer.evidence.quote!==r.evidence?.quote&&<BusinessQuote compact evidence={line.answer.evidence}/ >}{r.evidence&&r.evidence.section!=='wiki'&&<BusinessQuote compact={r.id!=='business'} evidence={r.evidence}/>}</article>;})}
   {analysis.businessOverview?.filter(l=>!j?.business.some(r=>l.id===`reading-${r.id}`)&&l.kind!=='flag').map(l=><article key={l.id} id={`business-detail-${l.id}`}><h4>{l.text}</h4>{l.answer&&<BusinessQuote compact evidence={l.answer.evidence}/>}</article>)}

   {j?.facts.filter(f=>!j.business.some(r=>r.evidence?.url===f.url)).slice(0,1).map((f,i)=><p key={i}><a href={f.url} target="_blank" rel="noreferrer">{f.text.startsWith('Official website:')?'Official website details':'Company background'} ↗</a></p>)}
  </section>}
  {flags.length>0&&<section className="business-column business-flags" tabIndex={0} aria-label="Flags by theme"><h3>Flags to understand <span>{flags.length}</span></h3>
   {THEMES.map(theme=>{const group=flags.filter(f=>f.theme===theme);return group.length?<section key={theme} className="flag-group"><h4>{theme}</h4>{group.map(f=><article key={f.id} className="flag-detail" id={`business-detail-${f.id}`} data-selected={selected===f.id}>
    <h5><i className={`flag-dot ${f.tone}`} aria-hidden="true"/><span className="sr-only">{f.tone==='red'?'Risk: ':'Strength: '}</span>{f.label}</h5><p>{f.why}</p><details className="flag-full"><summary>Evidence &amp; annual observations</summary><FlagChart flag={f}/>{f.evidence.map((e,i)=><BusinessQuote key={i} evidence={e}/>)}<p className="buffett-question"><strong>What Buffett would ask</strong>{f.question}</p></details>
   </article>)}</section>:null;})}
  </section>}
  {relationships.length>0&&<section className="business-column business-connections" tabIndex={0} id="business-detail-relationships" aria-label="Relationships disclosed in filings"><h3>Relationships disclosed in filings</h3><p className="relationships-scope">Economic dependencies and investments disclosed in filings. The map covers only the named links below.</p><RelationshipsMap owner={analysis.company} relationships={relationships}/></section>}
 </div>;
}
