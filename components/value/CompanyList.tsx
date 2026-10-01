'use client';
import {useEffect,useMemo,useState} from 'react';
import {mainCompanies,distancePosition,dropToBuy,returnLabel} from '@/lib/value/main-layout';
import {formatMetric} from '@/lib/value/metric-labels';
import type {ResultEntry} from '@/lib/value/result-entry';
import {CompanyLogo} from './CompanyLogo';
import {ValueLink} from './ValueLink';
type Column='name'|'return'|'needs'|'quality';
const columns:Array<[Column,string]>=[['name','Company'],['return','Return / yr'],['needs','Price to buy'],['quality','ROIC / ROE']];
/** Every list surface uses the same rows and quality definition as the home shelf. */
export function CompanyList({entries}:{entries:ResultEntry[]}) {
 const [sort,setSort]=useState<Column>('return'),[direction,setDirection]=useState(-1),[page,setPage]=useState(0),[size,setSize]=useState(10);
 useEffect(()=>{const resize=()=>setSize(Math.max(3,Math.floor((window.innerHeight-174)/(window.innerWidth<768?68:48))));resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 const companies=useMemo(()=>mainCompanies(entries).sort((a,b)=>{
  if(sort==='name')return direction*a.name.localeCompare(b.name);
  const quality=(c:typeof a)=>c.entry.row.quality?.value==='unlimited'?Infinity:c.entry.row.quality?.value??null;
  const x=sort==='return'?a.returnValue:sort==='needs'?a.ratio:quality(a),y=sort==='return'?b.returnValue:sort==='needs'?b.ratio:quality(b);
  return x===null?y===null?a.name.localeCompare(b.name):1:y===null?-1:direction*(x-y)||a.name.localeCompare(b.name);
 }),[entries,sort,direction]);
 const pages=Math.max(1,Math.ceil(companies.length/size)),current=Math.min(page,pages-1);
 const historical=entries[0]?.historical;
 return <div className="compact-company-list" data-testid="results-scroll"><table data-testid="results-table" aria-rowcount={companies.length+1}><thead><tr>{columns.map(([key,label])=><th key={key} aria-sort={sort===key?direction===1?'ascending':'descending':'none'}><button onClick={()=>{setSort(key);setDirection(sort===key?-direction:key==='name'||key==='needs'?1:-1);setPage(0);}}>{key==='return'&&historical?'Gain since':label} {sort===key?direction===1?'↑':'↓':'↕'}</button></th>)}</tr></thead><tbody>{companies.slice(current*size,(current+1)*size).map(c=>{
 const q=c.entry.row.quality,status=c.entry.row.businessChanged?'Disclosure':c.entry.row.t.includes('F')?'Fails quality':c.entry.row.historyYears!==undefined&&c.entry.row.historyYears<7?'Not enough history yet':c.buy?'At buy price':dropToBuy(c.ratio)||'—';
 return <tr key={c.id} data-company-row data-company={c.id} data-return={c.returnValue??''} data-ratio={c.ratio??''}><th scope="row"><ValueLink href={`/${c.id.toLowerCase()}`}><CompanyLogo src={c.entry.row.lg} name={c.name}/><span>{c.name}<small>{c.id}</small></span></ValueLink></th><td>{returnLabel(c.returnValue)||'—'}</td><td><span className="compact-needs" title={c.entry.row.thesisReason}>{status}</span>{c.ratio!==null&&<span className="compact-distance" role="img" aria-label={`${Math.max(0,(c.ratio-1)*100).toFixed(1)}% above buy price; scale 0 to 60%`}><i style={{width:`${distancePosition(c.ratio)*100}%`}}/></span>}</td><td title={q?.basis==='including-acquisitions'?'Ten-year ROIC including acquisitions':q?.label}>{q?`${q.label} ${q.value==='unlimited'?'>100%':formatMetric({value:q.value,format:'pct',returnRatio:true})}`:'—'}</td></tr>;
 })}</tbody></table>{pages>1&&<nav aria-label="Company pages"><button disabled={!current} onClick={()=>setPage(current-1)}>←</button><span>{current*size+1}–{Math.min((current+1)*size,companies.length)} of {companies.length}</span><button disabled={current===pages-1} onClick={()=>setPage(current+1)}>→</button></nav>}{!companies.length&&<p>No companies match these filters.</p>}</div>;
}
