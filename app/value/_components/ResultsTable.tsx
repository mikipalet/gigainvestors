'use client';
import { useEffect, useRef, useState } from 'react';
import type { ResultEntry } from './ResultRow';
import { ValueLink } from '@/components/value/ValueLink';
import { companyName, priceFraming } from '@/lib/value/presentation';
import { compactMoney } from '@/lib/value/viz/layout';
import { columns, type Sort } from '@/lib/value/list-sort';
export { columns, type Sort } from '@/lib/value/list-sort';
export function ResultsTable({ entries, sort, direction, sortBy }: { expanded?:boolean; entries:ResultEntry[]; sort:Sort;direction:number;sortBy:(key:Sort)=>void }) {
 const [page,setPage]=useState(0),[size,setSize]=useState(6);
 useEffect(()=>{const update=()=>setSize(window.innerWidth<768?4:Math.max(3,Math.floor((window.innerHeight-210)/95)));update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
 useEffect(()=>setPage(0),[entries]);
 const pages=Math.max(1,Math.ceil(entries.length/size)),current=Math.min(page,pages-1),start=current*size,end=start+size;
 return <div className="virtual-results paginated-results" data-testid="results-scroll"><table data-testid="results-table" aria-rowcount={entries.length+1}><thead><tr>{columns.map(([key,label])=><th key={key} aria-sort={sort===key?(direction===1?'ascending':'descending'):'none'}><button onClick={()=>sortBy(key)}>{key==='return'&&entries[0]?.historical?'Return since':label} {sort===key?(direction===1?'↑':'↓'):'↕'}</button></th>)}</tr></thead><tbody>{entries.slice(start,end).map(({row,quote,seed,mos,historical,historicalReturn},i)=><tr key={row.id} data-company-row aria-rowindex={start+i+2}><th scope="row"><ValueLink href={`/${row.id.toLowerCase()}`}>{companyName(row)}</ValueLink><span className="table-ticker">{row.id}</span></th><td>{row.mc==null?'Not reported':compactMoney(row.mc,'USD')}</td><td>{mos!==null?priceFraming(1-mos,row.m).headline:'Not compared'}<small>{priceFraming(mos===null?null:1-mos,row.m).fall}</small></td><td title={seed?'Price derived from market cap / shares':'Latest close'}>{row.t.includes('F')?'Fails quality':row.historyYears!==undefined&&row.historyYears<10?'Not enough history yet':row.t!=='PPPPP'?'Quality evidence incomplete':row.b?'Buy zone':'Wait for a better price'}</td><td>{historical?historicalReturn==null?'Not reported':`${historicalReturn>=0?'+':''}${Math.round(historicalReturn*100)}%`:row.returnInfo?`${row.k==='operating'?'ROIC':'ROE'} ${row.returnInfo.label.replace(/^ROE /,'')}`:'Not reported'}</td></tr>)}</tbody></table><nav className="select-pages" aria-label="Company pages"><button disabled={!current} onClick={()=>setPage(current-1)}>←</button><span>{current+1} / {pages}</span><button disabled={current===pages-1} onClick={()=>setPage(current+1)}>→</button></nav>{!entries.length&&<p>No companies match these filters.</p>}</div>;
}
