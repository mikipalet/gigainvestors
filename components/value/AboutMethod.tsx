'use client';
import {useState} from 'react';
import {SidePanel} from './SidePanel';
import {ValueLink} from './ValueLink';
function MethodSummary({author}:{author?:string}) {
 const sections=[
  {label:'The decision',content:<><h3>All five quality tests must pass.</h3><p>Predictable profits, lasting advantage, cash for owners, capital allocation and honest accounts. One failure rules out Buy now.</p><p>Judgement can correct a financial input only with quoted evidence. The adjusted numbers must still meet the bar.</p></>},
  {label:'The price',content:<><h3>Discount the same future cash used for returns.</h3><p>Owner earnings fund ten years of projected cash flows. Growth fades to a long-run rate. Add excess cash and divide by shares.</p><dl className="panel-numbers"><div><dt>Long-run growth</dt><dd>3%</dd></div><div><dt>Return floor</dt><dd>10%</dd></div><div><dt>Safety discount</dt><dd>15–50%</dd></div></dl><p>The required return is the higher of 10% or the local ten-year government bond yield plus four percentage points. The price must meet both this return and the safety discount.</p></>},
  {label:'Different businesses',content:<p>Banks and insurers use common equity and distributable earnings. Investment holdings use net asset value. Drawers show each model’s inputs and annual observations.</p>},
  {label:'The lists',content:<><p>Buy now ranks qualifying companies by expected annual return. Next closest ranks distance to the buy price. The rest contains companies beyond the grid.</p><p>ROIC and ROE show ten-year medians, capped at &gt;100%. Holdings reflect today’s listings.</p></>},
  {label:'Time travel',content:<><h3>A hindsight simulation.</h3><p>The timeline uses accounts and a price after each year’s filing. Gains run to the latest quote, excluding dividends, fees and taxes.</p><p>Rules designed in 2026, restated accounts and today’s membership can flatter results. Historical tests exclude AI filing readings.</p></>},
  {label:'Sources',content:<><p>SEC, EDINET and ESEF filings; EODHD accounts; Yahoo prices. Memo answers link their sources.</p><p>These rules are inspired by Buffett, not his recommendations. Debt and currency changes can materially alter value.</p>{author&&<p>By {author}</p>}<ValueLink href="/forward">Forward record ↗</ValueLink> · <ValueLink href="/method">Full method & sources ↗</ValueLink></>},
 ];
 return <article className="method-sections">{sections.map(s=><section key={s.label}><h3>{s.label}</h3>{s.content}</section>)}</article>;
}
export function AboutMethod({author}:{author?:string}){
 const [open,setOpen]=useState(false);return <><button className="about-method" onClick={()=>setOpen(true)}>Method</button>{open&&<SidePanel title="Method" onClose={()=>setOpen(false)}><MethodSummary author={author}/></SidePanel>}</>;
}
