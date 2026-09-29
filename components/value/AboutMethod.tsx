'use client';
import { useState } from 'react';
import { SidePanel } from './SidePanel';
import { ValueLink } from './ValueLink';
export function MethodSummary({author}:{author?:string}) {
 return <section className="method-summary"><h2>How we estimate value</h2><ol>
  <li>Start with normalized yearly cash left for owners after maintaining the business.</li>
  <li>Project ten years of growth, capped at 8%; assume 3% beyond that.</li>
  <li>Bring future cash into today’s money using at least a 10% required return, then add net cash.</li>
  <li>Set a buy price 25–50% below that estimate, allowing room for error.</li>
  <li>The track record is a simulation: no dividends, fees or taxes; missing delistings and revised data can flatter results.</li>
 </ol><p>Owner return is cash earnings divided by the price of the whole business. It is not a dividend or a promised investment return. Growth is an assumption. Banks and insurers use a book-value model instead.</p><p className="method-author" data-author-slot>{author?`By ${author}`:null}</p><ValueLink href="/method">Full method & sources ↗</ValueLink></section>;
}
export function AboutMethod({author}:{author?:string}) {
 const [open,setOpen]=useState(false);
 return <><button className="about-method" onClick={()=>setOpen(true)}>About the method ↗</button>{open&&<SidePanel title="About the method" onClose={()=>setOpen(false)}><MethodSummary author={author}/></SidePanel>}</>;
}
