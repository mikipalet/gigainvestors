'use client';
import { useEffect, useRef, useState } from 'react';
import type { ResultEntry } from './ResultRow';
import { ValueLink } from '@/components/value/ValueLink';
import { displayName } from '@/lib/value/presentation';
import { compactMoney } from '@/lib/value/viz/layout';
export type Sort = 'name' | 'country' | 'cap' | 'mos' | 'holders' | 'return' | 'flags';
export const columns: Array<[Sort,string]> = [['name','Company'],['cap','Market cap'],['mos','Price / value'],['flags','Flags'],['return','Return']];
export function ResultsTable({ entries, sort, direction, sortBy }: { expanded?:boolean; entries:ResultEntry[]; sort:Sort;direction:number;sortBy:(key:Sort)=>void }) {
 const [scroll,setScroll]=useState(0),ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(ref.current)ref.current.scrollTop=0;setScroll(0);},[entries]);
 const rowHeight=36,start=Math.max(0,Math.floor(scroll/rowHeight)-4),end=Math.min(entries.length,start+36);
 return <div ref={ref} className="virtual-results" data-testid="results-scroll" onScroll={e=>setScroll(e.currentTarget.scrollTop)}><table data-testid="results-table" aria-rowcount={entries.length+1}><thead><tr>{columns.map(([key,label])=><th key={key} aria-sort={sort===key?(direction===1?'ascending':'descending'):'none'}><button onClick={()=>sortBy(key)}>{label} {sort===key?(direction===1?'↑':'↓'):'↕'}</button></th>)}</tr></thead><tbody>{start>0&&<tr aria-hidden="true"><td colSpan={5} style={{height:start*rowHeight,padding:0}}/></tr>}{entries.slice(start,end).map(({row,quote,seed},i)=><tr key={row.id} data-company-row aria-rowindex={start+i+2}><th scope="row"><ValueLink href={`/${row.id.toLowerCase()}`}>{displayName(row.n)}</ValueLink><span className="table-ticker">{row.id}</span></th><td>{row.mc==null?'Not reported':compactMoney(row.mc,'USD')}</td><td>{row.dataQualityFlags?.length?'Unverified':quote!==null&&row.v&&row.v[1]>0?`${(quote/row.v[1]).toFixed(2)}×${seed?' est.':''}`:'Not compared'}</td><td title={seed?'Price derived from market cap / shares':'Latest close'}>{seed?'est. · ':''}≤ {(1-(row.m??.25)).toFixed(2)}×</td><td>{row.returnInfo?`${row.k==='operating'?'ROIC':'ROE'} ${row.returnInfo.label.replace(/^ROE /,'')}`:'Not reported'}</td></tr>)}{end<entries.length&&<tr aria-hidden="true"><td colSpan={5} style={{height:(entries.length-end)*rowHeight,padding:0}}/></tr>}</tbody></table>{!entries.length&&<p>No companies match these filters.</p>}</div>;
}
