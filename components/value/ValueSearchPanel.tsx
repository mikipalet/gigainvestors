'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {fetchValueData} from '@/lib/value/data-source';
import {valueHits,type ValueHit} from '@/lib/search/value-source';
import {shardOf} from '@/lib/value/shard';
import {MEMO_QUESTIONS} from '@/lib/value/owner-memo';
import {formatMetric} from '@/lib/value/metric-labels';
import {displayName} from '@/lib/value/presentation';
import {primaryTileMetric,tileSentence} from '@/lib/value/tile-metric';
import {testLabels} from './TestChips';
import type {Dossier,IndexRow} from '@/lib/value/types';
import {SidePanel} from './SidePanel';
import {ValueLink} from './ValueLink';
import {CompanyLogo} from './CompanyLogo';
import {ChartInteraction} from './viz/ChartInteraction';
function SearchHistory({row}:{row?:IndexRow}){
 const series=row?.r??[],values=series.flatMap(v=>v===null?[]:[v]);
 if(values.length<2)return row?.quality?<span className="search-history"><small>{row.quality.label} {formatMetric({value:row.quality.value==='unlimited'?1.000001:row.quality.value,format:'pct',returnRatio:true})}</small></span>:null;
 const lo=Math.min(0,...values),hi=Math.max(.1,...values),points=series.flatMap((v,i)=>v===null?[]:[{x:2+i*156/Math.max(1,series.length-1),y:24-(v-lo)/(hi-lo)*22,text:`FY${(row?.fy??2025)-series.length+1+i} · ROIC including acquisitions ${(v*100).toFixed(1)}%`}]);
 return <span className="search-history"><small>ROIC incl. acq. {formatMetric({value:values.at(-1)??null,format:'pct',returnRatio:true})}</small><ChartInteraction width={160} height={26} label="ROIC including acquisitions, ten years" points={points}><svg viewBox="0 0 160 26" aria-hidden="true"><polyline points={points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></ChartInteraction><small>FY{(row?.fy??2025)-series.length+1}–{row?.fy??2025}</small></span>;
}
function SearchSummary({dossier}:{dossier?:Dossier}){
 const answers=dossier?.ownerMemo?.lines.filter(line=>[1,2,4,7].includes(line.question))??[];
 return answers.length?<span className="search-result-summary">{answers.map(line=><span key={line.question} className={line.question!==1?'search-summary-detail':undefined}>{line.answer} </span>)}</span>:null;
}

export function ValueSearchPanel({close,initialQuery=''}:{close:()=>void;initialQuery?:string}){
 const navigation=useRef<HTMLElement>(null),measureNow=useRef(()=>{});
 useEffect(()=>{
  const nav=navigation.current;if(!nav)return;let frame=0;
  const measure=()=>{
   if(innerWidth<768||!nav.clientHeight)return;
   nav.style.setProperty('--search-font','14px');
   if(nav.scrollHeight>nav.clientHeight+1){
    let used=nav.querySelector('p')?.getBoundingClientRect().height??0,rows=0;
    for(const button of nav.querySelectorAll(':scope>button')){used+=button.getBoundingClientRect().height;if(used>nav.clientHeight)break;rows++;}
    setCapacity(count=>Math.max(1,Math.min(count-1,rows)));return;
   }
   let low=14,high=24;
   for(let i=0;i<7;i++){const mid=(low+high)/2;nav.style.setProperty('--search-font',`${mid}px`);if(nav.scrollHeight<=nav.clientHeight+1)low=mid;else high=mid;}
   nav.style.setProperty('--search-font',`${low}px`);
  };
  const fit=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;measure();});};
  measureNow.current=measure;
  const resize=new ResizeObserver(fit);
  const observe=()=>{resize.disconnect();resize.observe(nav);for(const row of nav.querySelectorAll(':scope>button'))resize.observe(row);fit();};
  const observer=new MutationObserver(observe);observer.observe(nav,{childList:true,subtree:true});observe();
  return()=>{measureNow.current=()=>{};observer.disconnect();resize.disconnect();cancelAnimationFrame(frame);};
 },[]);
 const [summaries,setSummaries]=useState<Record<string,Dossier>>({});
 const [directoryError,setDirectoryError]=useState(false),[attempt,setAttempt]=useState(0);
 const [query,setQuery]=useState(initialQuery),[directory,setDirectory]=useState<IndexRow[]>([]),[hits,setHits]=useState<ValueHit[]>([]),[selected,setSelected]=useState(''),[dossier,setDossier]=useState<Dossier|null>(null),[capacity,setCapacity]=useState(8);
 useEffect(()=>{const resize=()=>{setCapacity(innerWidth<768?Math.max(6,Math.floor((innerHeight-130)/200)*2):Math.max(4,Math.floor((innerHeight-130)/140)));};resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 useEffect(()=>{let active=true;setDirectoryError(false);fetchValueData<IndexRow[]>('index/default.json').then(rows=>{if(active)setDirectory(rows);}).catch(()=>{if(active)setDirectoryError(true);});return()=>{active=false;};},[attempt]);
 useEffect(()=>{let active=true;if(!query.trim()){setHits([]);return;}valueHits(query).then(rows=>{if(active){setHits(rows);setSelected(rows[0]?.row[0]??'');}}).catch(()=>{});return()=>{active=false;};},[query]);
 const matches=query.trim()?hits.slice(0,capacity).map(h=>({id:h.row[0],name:displayName(h.row[1]),logo:directory.find(d=>d.id===h.row[0])?.lg})):[];
 const suggestions=directory.filter(d=>!matches.some(m=>m.id===d.id)).slice(0,Math.max(0,capacity-matches.length)).map(d=>({id:d.id,name:displayName(d.n),logo:d.lg}));
 const rows=[...matches,...suggestions],id=rows.some(r=>r.id===selected)?selected:rows[0]?.id;
 useEffect(()=>{let active=true;setDossier(null);if(id)fetchValueData<Record<string,Dossier>>(`dossiers/${shardOf(id)}.json`).then(rows=>{if(active)setDossier(rows[id]??null);}).catch(()=>{});return()=>{active=false;};},[id]);
 const visibleIds=rows.map(row=>row.id).join(',');
 useEffect(()=>{
  let active=true;
  const shards=[...new Set(visibleIds.split(',').filter(Boolean).map(shardOf))];
  Promise.all(shards.map(shard=>fetchValueData<Record<string,Dossier>>(`dossiers/${shard}.json`))).then(parts=>{if(active)setSummaries(previous=>Object.assign({},previous,...parts));}).catch(()=>{});
  return()=>{active=false;};
 },[visibleIds]);
 useLayoutEffect(()=>{measureNow.current();},[summaries,capacity,query,directory,dossier]);
 const host=document.querySelector('.value-page');if(!host)return null;
 return createPortal(<SidePanel title="Search companies" onClose={close}><div className="company-search">
  <input autoFocus aria-label="Search company or ticker" placeholder="Company or ticker" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{const at=rows.findIndex(r=>r.id===id);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setSelected(rows[Math.max(0,Math.min(rows.length-1,at+(e.key==='ArrowDown'?1:-1)))]?.id??'');}}}/>
  {directoryError&&<p role="alert">Company search could not load. <button onClick={()=>setAttempt(n=>n+1)}>Retry</button></p>}
  <div className="company-search-body"><nav ref={navigation} aria-label="Company results">{query.trim()&&<p>{matches.length?`${matches.length} matches`:'Explore companies'}</p>}{rows.map(r=><button key={r.id} data-selected={r.id===id} onClick={()=>setSelected(r.id)}><span className="search-result-body"><CompanyLogo src={r.logo} name={r.name}/><span className="search-result-name">{r.name}</span><small className="search-result-id">{r.id}</small><small className="search-result-sector">{directory.find(d=>d.id===r.id)?.c} · {directory.find(d=>d.id===r.id)?.s}</small><small>{(directory.find(d=>d.id===r.id)?.t.match(/P/g)??[]).length}/5 quality · {directory.find(d=>d.id===r.id)?.h??0} holders</small></span><SearchHistory row={directory.find(d=>d.id===r.id)}/><SearchSummary dossier={summaries[r.id]}/></button>)}</nav>
  {dossier&&<article className="search-preview"><header><h3>{displayName(dossier.company.name)}</h3><ValueLink href={`/${dossier.id.toLowerCase()}`} onClick={close}>Open company ↗</ValueLink></header>
   <dl>{dossier.ownerMemo?.lines.map(l=><div key={l.question}><dt>{MEMO_QUESTIONS[l.question-1]}</dt><dd>{l.answer}</dd></div>)}</dl>
   <section><h3>Five quality tests</h3>{Object.values(dossier.tests).filter(t=>t.key!=='price').map(t=>{const metric=primaryTileMetric(t,dossier.company.kind,dossier.tests.understandable.series.netIncome??dossier.series.netIncome);return <p key={t.key} title={tileSentence(t,metric,dossier.company.kind)}><span>{testLabels[t.key]}</span><strong>{t.result==='pass'?'Pass':t.result==='fail'?'Fail':''}</strong><small className="search-test-reason search-test-full">{tileSentence(t,metric,dossier.company.kind)}</small><small className="search-test-reason search-test-brief">{metric.value!==null&&<>{metric.label}: {formatMetric({value:metric.value,format:metric.id==='opMarginCv'?'pct':metric.format,currency:dossier.reportingCurrency??dossier.company.currency,returnRatio:/roic|roe|rote/i.test(metric.id)})}</>}</small></p>;})}</section>


  </article>}
  </div></div></SidePanel>,host);
}
