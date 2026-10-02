'use client';
import {Fragment,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {mainCompanies,distancePosition,dropToBuy,returnLabel} from '@/lib/value/main-layout';
import {sharePrice} from '@/lib/value/listing-details';
import {ChartInteraction} from './viz/ChartInteraction';
import {formatMetric} from '@/lib/value/metric-labels';
import {fetchValueData} from '@/lib/value/data-source';
import {shardOf} from '@/lib/value/shard';
import {QUALITY_TESTS,type Dossier,type Series} from '@/lib/value/types';
import {testLabels} from './TestChips';
import type {ResultEntry} from '@/lib/value/result-entry';
import {ListBusiness} from './ListBusiness';
import {CompanyLogo} from './CompanyLogo';
import {ValueLink} from './ValueLink';
type Column='name'|'return'|'needs'|'quality';
const columns:Array<[Column,string]>=[['name','Company'],['return','Return / yr'],['needs','Price to buy'],['quality','Quality']];
function GainBar({value,domain,legacy}:{value:number;domain:[number,number];legacy?:boolean}){
 const x=(n:number)=>4+(n-domain[0])/(domain[1]-domain[0])*292;
 const label=`${legacy?'Historical total gain':'Expected annual return'} ${formatMetric({value,format:'pct'})}`;
 return <span className="historical-gain-chart"><ChartInteraction width={300} height={18} label={legacy?"Historical gain · shared list scale":"Expected annual return · shared list scale"} points={[{x:x(value),y:9,text:label}]}><svg viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true"><path d={`M${x(0)} 2V16`} stroke="var(--viz-muted)"/><path d={`M${x(0)} 9H${x(value)}`} stroke={value<0?'var(--viz-sell)':'var(--viz-ink)'} strokeWidth="3"/><circle cx={x(value)} cy="9" r="3" fill="var(--viz-ink)"/></svg></ChartInteraction></span>;
}
/** Every list surface uses the same rows and quality definition as the home shelf. */
export function CompanyList({entries}:{entries:ResultEntry[]}) {
 const list=useRef<HTMLDivElement>(null),measuredPage=useRef(''),loaded=useRef(false),scheduleFit=useRef(()=>{}),measureNow=useRef(()=>{});
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  const root=list.current;if(!root)return;let frame=0,active=true;
  const measure=()=>{
   if(!active)return;if(innerWidth<768){root.style.removeProperty('--list-font');setReady(loaded.current);return;}
   root.style.setProperty('--list-font','16px');
   const textFits=()=>[...root.querySelectorAll('tbody th,tbody td')].every(cell=>{
    const bounds=cell.getBoundingClientRect(),walker=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT);
    let node:Node|null;
    while((node=walker.nextNode())){
     if(!node.textContent?.trim()||node.parentElement?.closest('svg,.chart-interaction')||!node.parentElement?.checkVisibility())continue;
     const range=document.createRange();range.selectNodeContents(node);
     if([...range.getClientRects()].some(r=>r.left<bounds.left-1||r.right>bounds.right+1))return false;
    }
    return true;
   });
   const dialog=root.closest('dialog');
   // The drawer takes its width once, on open; paging, sorting and hovering never resize it.
   if(dialog&&!dialog.dataset.listWidth){for(let width=dialog.clientWidth;!textFits()&&width<Math.min(innerWidth,700);width+=10)dialog.style.width=`${width+10}px`;if(root.querySelector('[data-company-row]'))dialog.dataset.listWidth='fixed';}
   // Measure intrinsic rows before distributing spare height across the table.
   root.dataset.measuring='true';
   const available=root.clientHeight-(root.querySelector('thead')?.getBoundingClientRect().height??40)-(root.querySelector('nav')?.getBoundingClientRect().height??0)-8;
   let used=0,rows=0;
   const rendered=[...root.querySelectorAll<HTMLElement>('[data-company-row]')];
   for(const row of rendered){
    used+=row.getBoundingClientRect().height;
    if(row.nextElementSibling?.classList.contains('company-context'))used+=row.nextElementSibling.getBoundingClientRect().height;
    if(used>available)break;rows++;
   }
   if(rows<rendered.length){delete root.dataset.measuring;setReady(false);setSize(Math.max(1,rows));return;}
   let low=16,high=24;
   for(let i=0;i<7;i++){const mid=(low+high)/2;root.style.setProperty('--list-font',`${mid}px`);if(root.scrollHeight<=root.clientHeight+1&&textFits())low=mid;else high=mid;}
   root.style.setProperty('--list-font',`${low}px`);delete root.dataset.measuring;setReady(loaded.current);
  };
  const fit=()=>{if(frame||!active)return;frame=requestAnimationFrame(()=>{frame=0;measure();});};
  scheduleFit.current=fit;measureNow.current=measure;
  const observer=new MutationObserver(records=>{if(records.some(record=>!(record.target instanceof Element?record.target:record.target.parentElement)?.closest('svg,.chart-interaction')))fit();});observer.observe(root,{childList:true,subtree:true});
  const resize=new ResizeObserver(fit);resize.observe(root);const table=root.querySelector('table');if(table)resize.observe(table);
  document.fonts.ready.then(fit);fit();
  return()=>{active=false;scheduleFit.current=()=>{};measureNow.current=()=>{};observer.disconnect();resize.disconnect();cancelAnimationFrame(frame);};
 },[]);
 const [sort,setSort]=useState<Column>('return'),[direction,setDirection]=useState(-1),[page,setPage]=useState(0),[size,setSize]=useState(10);
 useEffect(()=>{const resize=()=>{const dialog=list.current?.closest('dialog');if(dialog){delete dialog.dataset.listWidth;dialog.style.width='';}setReady(false);setSize(Math.max(3,Math.floor((window.innerHeight-120)/(window.innerWidth<768?60:55))));scheduleFit.current();};resize();window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 const companies=useMemo(()=>mainCompanies(entries).sort((a,b)=>{
  if(sort==='name')return direction*a.name.localeCompare(b.name);
  const quality=(c:typeof a)=>c.entry.row.quality?.value==='unlimited'?Infinity:c.entry.row.quality?.value??null;
  const x=sort==='return'?a.returnValue:sort==='needs'?a.ratio:quality(a),y=sort==='return'?b.returnValue:sort==='needs'?b.ratio:quality(b);
  return x===null?y===null?a.name.localeCompare(b.name):1:y===null?-1:direction*(x-y)||a.name.localeCompare(b.name);
 }),[entries,sort,direction]);
 const pages=Math.max(1,Math.ceil(companies.length/size)),current=Math.min(page,Math.max(0,companies.length-1));
 const historical=entries[0]?.historical;
 const legacy=historical&&!entries.some(e=>e.basis);
 const gains=companies.flatMap(c=>c.returnValue===null||!Number.isFinite(c.returnValue)?[]:[c.returnValue]),gainDomain:[number,number]=[Math.min(0,...gains),Math.max(.01,...gains)];
 const [dossiers,setDossiers]=useState<Record<string,Dossier>>({});
 const visibleIds=companies.slice(current,current+size).map(c=>c.id).join(',');
 useEffect(()=>{
  let live=true;loaded.current=false;setReady(false);
  const finish=()=>{if(live){loaded.current=true;scheduleFit.current();}};
  if(historical)finish();
  else Promise.all([...new Set(visibleIds.split(',').filter(Boolean).map(shardOf))].map(shard=>fetchValueData<Record<string,Dossier>>(`dossiers/${shard}.json`))).then(parts=>{
   if(!live)return;
   setDossiers(Object.assign({},...parts));
   const key=`${current}:${sort}:${direction}:${innerWidth}x${innerHeight}`;
   if(measuredPage.current!==key){measuredPage.current=key;setSize(Math.max(3,Math.floor((innerHeight-120)/(innerWidth<768?60:55))));}
   finish();
  }).catch(finish);
  return()=>{live=false;};
 },[visibleIds,historical,current,sort,direction]);
 useLayoutEffect(()=>{measureNow.current();},[dossiers,size,page,sort,direction]);
 return <div ref={list} className="compact-company-list" data-rich={companies.length<8} data-historical={historical} data-legacy={!!legacy} data-testid="results-scroll" aria-busy={!ready}><table data-testid="results-table" aria-rowcount={companies.length+1}><thead><tr>{columns.map(([key,label])=><th key={key} aria-sort={sort===key?direction===1?'ascending':'descending':'none'}><button onClick={()=>{setReady(false);setSort(key);setDirection(sort===key?-direction:key==='name'||key==='needs'?1:-1);setPage(0);}}>{key==='return'&&legacy?'Gain since':label} {sort===key?direction===1?'↑':'↓':'↕'}</button></th>)}</tr></thead><tbody>{companies.slice(current,current+size).map(c=>{
 const dossier=dossiers[c.id],required=c.entry.row.buyReturnInputs?.requiredReturn??dossier?.valuation?.discountRate;
 const nav=dossier?.valuation?.method==='nav',navReturn=nav?dossier.valuation?.navReturn?.uncappedCagr:null;
 const series:Series=nav?dossier.series.navPerShare??[]:c.entry.row.r?.length?c.entry.row.r.map((v,i)=>[(c.entry.row.fy??2025)-c.entry.row.r!.length+1+i,v]):dossier?.series.totalRoic??dossier?.series.roe??[];
 const shown=series.slice(-10),observations=shown.flatMap(([,v])=>v===null||!Number.isFinite(v)?[]:[v]),scaleLow=Math.min(0,...observations),scaleTop=Math.max(.01,...observations);
 const history=shown.flatMap(([fy,v],i)=>v===null||!Number.isFinite(v)?[]:[{x:4+i*92/Math.max(1,Math.min(10,series.length)-1),y:26-(v-scaleLow)/(scaleTop-scaleLow)*24,text:nav?`FY${fy}: NAV per share ${sharePrice(v,dossier.reportingCurrency??dossier.company.currency)}`:`FY${fy}: ${c.entry.row.quality?.label??'Return on capital'} ${(v*100).toFixed(1)}%`}]);

 const q=c.entry.row.quality,status=c.entry.row.businessChanged?'Disclosure':c.entry.row.t.includes('F')?'Fails quality':c.entry.row.historyYears!==undefined&&c.entry.row.historyYears<7?'Not enough history yet':c.buy?'At buy price':dropToBuy(c.ratio)||'—';
 return <Fragment key={c.id}><tr data-company-row data-company={c.id} data-return={c.returnValue??''} data-ratio={c.ratio??''}><th scope="row"><ValueLink href={`/${c.id.toLowerCase()}`}><CompanyLogo src={c.entry.row.lg} name={c.name}/><span>{c.name}<small>{c.id}{!historical&&c.entry.row.fy&&<> · FY{c.entry.row.fy}</>}</small>{!historical&&c.entry.row.s&&<small>{c.entry.row.s}</small>}{historical&&<small className="historical-context"> · {c.entry.row.c}{c.entry.row.s&&<> · {c.entry.row.s}</>}</small>}</span></ValueLink></th><td>{returnLabel(c.returnValue)||'—'}{!historical&&required!=null&&<small>Required {formatMetric({value:required,format:'pct'})}</small>}{historical&&c.returnValue!==null&&Number.isFinite(c.returnValue)&&<GainBar value={c.returnValue} domain={gainDomain} legacy={legacy}/>}</td><td><span className="compact-needs" title={c.entry.row.thesisReason}>{status}</span><small>{c.buyPrice!==null&&<>Buy ≤ {sharePrice(c.buyPrice,c.entry.row.cur)}</>}</small><small>{c.price!==null&&<>{historical?'Then':'Now'} {sharePrice(c.price,c.entry.row.cur)}</>}</small>{c.ratio!==null&&<span className="compact-distance" role="img" aria-label={`${Math.max(0,(c.ratio-1)*100).toFixed(1)}% above buy price; scale 0 to 60%`}><i style={{width:`${distancePosition(c.ratio)*100}%`}}/></span>}</td><td title={q?.basis==='including-acquisitions'?'Ten-year ROIC including acquisitions':q?.label}>{q?`${q.label} ${q.value==='unlimited'?'>100%':formatMetric({value:q.value,format:'pct',returnRatio:true})}`:navReturn!=null?`NAV + div. ${formatMetric({value:navReturn,format:'pct'})}`:<span className="list-quality-tests">{QUALITY_TESTS.map((test,index)=>{const status=c.entry.row.t[index];return status==='P'||status==='F'?<span key={test} title={testLabels[test]}>{['Profits','Moat','Cash','Value','Honest'][index]} {status==='P'?'✓':'×'}</span>:null;})}</span>}{!historical&&history.length>1&&<ChartInteraction width={100} height={30} label={nav?'Net asset value per share':`Ten-year ${q?.label??'return on capital'}${q?.label==='ROIC'?' including acquisitions':''}`} points={history}><svg viewBox="0 0 100 30" aria-hidden="true"><polyline points={history.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></ChartInteraction>}</td></tr>{companies.length<8&&!historical&&<tr className="company-context"><td colSpan={4}><ListBusiness id={c.id} buyPrice={c.buyPrice} currency={c.entry.row.cur}/></td></tr>}</Fragment>;
 })}</tbody></table>{pages>1&&<nav aria-label="Company pages"><button disabled={!ready||!current} onClick={()=>{setReady(false);setPage(Math.max(0,current-size));}}>←</button><span>{current+1}–{Math.min(current+size,companies.length)} of {companies.length}</span><button disabled={!ready||current+size>=companies.length} onClick={()=>{setReady(false);setPage(current+size);}}>→</button></nav>}{!companies.length&&<p>No companies match these filters.</p>}</div>;
}
