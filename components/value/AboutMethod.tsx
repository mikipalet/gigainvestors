'use client';
import {useState} from 'react';
import {SidePanel} from './SidePanel';
import {MethodDetails,type MethodData} from './MethodDetails';
import {ValueLink} from './ValueLink';
function MethodSummary({author,meta,calibration}:MethodData & {author?:string}) {
 const sections=[
  {label:'How we decide',content:<><p>All five quality tests must pass: predictable profits, lasting advantage, cash for owners, capital allocation and honest accounts. One failure rules out Buy now.</p><p>Judgement can correct an input only with quoted evidence. The corrected numbers must still meet the bar.</p><p>Ten years of projected owner cash and terminal value determine both value and expected return. Long-run growth is 3%; the required return is the higher of 10% or local ten-year government yield plus four points.</p><p>A buy must also clear a safety discount of 15–50%. Banks and insurers use equity and distributable earnings; investment holdings use net asset value.</p></>},
  {label:'Reading the lists',content:<><p>Buy now ranks by expected annual return. Next closest ranks distance to the buy price. ROIC and ROE are ten-year medians.</p><p>Past quarters cover analysed index companies, excluding held companies outside indexes. Headline averages follow the market switch; list counts follow all filters. The funnel above is current.</p>{author&&<p>By {author}</p>}<ValueLink href="/forward">Forward record ↗</ValueLink> · <ValueLink href="/method">Full method ↗</ValueLink></>},
 ];
 return <article className="method-sections"><MethodDetails meta={meta} calibration={calibration}/>{sections.map(s=><section key={s.label}><h3>{s.label}</h3>{s.content}</section>)}</article>;
}
export function AboutMethod({author,meta=null,calibration=[]}:Partial<MethodData> & {author?:string}){
 const [open,setOpen]=useState(false);return <><button className="about-method" onClick={()=>setOpen(true)}>Method</button>{open&&<SidePanel kind="method" title="Method" onClose={()=>setOpen(false)}><MethodSummary author={author} meta={meta} calibration={calibration}/></SidePanel>}</>;
}
