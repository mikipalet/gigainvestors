'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {fetchValueData} from '@/lib/value/data-source';
import {valueHits,type ValueHit} from '@/lib/search/value-source';
import {shardOf} from '@/lib/value/shard';
import {MEMO_QUESTIONS} from '@/lib/value/owner-memo';
import {displayName} from '@/lib/value/presentation';
import {testLabels} from './TestChips';
import type {Dossier,IndexRow} from '@/lib/value/types';
import {SidePanel} from './SidePanel';
import {ValueLink} from './ValueLink';
import {CompanyLogo} from './CompanyLogo';
import {MiniSeries} from './viz/MiniSeries';
export function ValueSearchPanel({close,initialQuery=''}:{close:()=>void;initialQuery?:string}){
 const [query,setQuery]=useState(initialQuery),[directory,setDirectory]=useState<IndexRow[]>([]),[hits,setHits]=useState<ValueHit[]>([]),[selected,setSelected]=useState(''),[dossier,setDossier]=useState<Dossier|null>(null);
 useEffect(()=>{let active=true;fetchValueData<IndexRow[]>('index/default.json').then(rows=>{if(active)setDirectory(rows);}).catch(()=>{});return()=>{active=false;};},[]);
 useEffect(()=>{let active=true;if(!query.trim()){setHits([]);return;}valueHits(query).then(rows=>{if(active){setHits(rows);setSelected(rows[0]?.row[0]??'');}}).catch(()=>{});return()=>{active=false;};},[query]);
 const matches=query.trim()?hits.slice(0,10).map(h=>({id:h.row[0],name:displayName(h.row[1]),logo:directory.find(d=>d.id===h.row[0])?.lg})):[];
 const suggestions=directory.filter(d=>!matches.some(m=>m.id===d.id)).slice(0,Math.max(0,10-matches.length)).map(d=>({id:d.id,name:displayName(d.n),logo:d.lg}));
 const rows=[...matches,...suggestions],id=rows.some(r=>r.id===selected)?selected:rows[0]?.id;
 useEffect(()=>{let active=true;setDossier(null);if(id)fetchValueData<Record<string,Dossier>>(`dossiers/${shardOf(id)}.json`).then(rows=>{if(active)setDossier(rows[id]??null);}).catch(()=>{});return()=>{active=false;};},[id]);
 const host=document.querySelector('.value-page');if(!host)return null;
 return createPortal(<SidePanel title="Search companies" onClose={close}><div className="company-search">
  <input autoFocus aria-label="Search company or ticker" placeholder="Company or ticker" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{const at=rows.findIndex(r=>r.id===id);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setSelected(rows[Math.max(0,Math.min(rows.length-1,at+(e.key==='ArrowDown'?1:-1)))]?.id??'');}}}/>
  <div className="company-search-body"><nav aria-label="Company results">{query.trim()&&<p>{matches.length?`${matches.length} matches`:'Explore companies'}</p>}{rows.map(r=><button key={r.id} data-selected={r.id===id} onClick={()=>setSelected(r.id)}><CompanyLogo src={r.logo} name={r.name}/><span>{r.name}<small>{r.id}</small></span></button>)}</nav>
  {dossier&&<article className="search-preview"><header><h3>{displayName(dossier.company.name)}</h3><ValueLink href={`/${dossier.id.toLowerCase()}`} onClick={close}>Open company ↗</ValueLink></header>
   <dl>{dossier.ownerMemo?.lines.map(l=><div key={l.question}><dt>{MEMO_QUESTIONS[l.question-1]}</dt><dd>{l.answer}</dd></div>)}</dl>
   <section><h3>Five quality tests</h3>{Object.values(dossier.tests).filter(t=>t.key!=='price').map(t=><p key={t.key}><span>{testLabels[t.key]}</span><strong>{t.result==='pass'?'Pass':t.result==='fail'?'Fail':''}</strong></p>)}</section>
   {dossier.series.ownerEarningsPerShare?.length>1&&<MiniSeries series={dossier.series.ownerEarningsPerShare.slice(-10)} label="Owner earnings per share" format="money" currency={dossier.reportingCurrency??dossier.company.currency} height={120} fluid/>}
  </article>}
  </div></div></SidePanel>,host);
}
