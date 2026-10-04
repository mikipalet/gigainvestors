"use client";
import {AgentQuarterMetadata} from '@/components/AgentQuarterMetadata';
import {siteUrl} from '@/lib/agents/urls';
import {checklistMarkdown} from "@/lib/agents/checklist-content";

import {historyHeadline} from '@/lib/value/since-return';
import { ForwardLine } from '@/components/value/ForwardLine';
import {onValueIdle} from '@/lib/value/prefetch';
import { Select } from '@/components/controls/Select';
import { Toggle } from '@/components/controls/Toggle';
import { MainView } from '@/components/value/MainView';
import { MarketScopeToggle } from '@/components/value/MarketScopeToggle';
import { QuarterSlider } from '@/components/QuarterSlider';
import { createPortal } from 'react-dom';
import { useDebouncedQuery } from "@/lib/use-quarter";
import { matchesView } from '@/lib/value/view-filter';
import { historyFrame,quarterEnd,type HistoryIndex } from '@/lib/value/time-travel';
import { memo,useCallback,useEffect,useMemo,useRef,useState,useTransition } from "react";

import { SidePanel } from '@/components/value/SidePanel';

import { QUALITY_TESTS,type StoreMeta } from "@/lib/value/types";

import { columns,type Sort } from '@/lib/value/list-sort';
import { priceValue, dateLabel } from '@/lib/value/presentation';
import { type FilterState } from './_components/Filters';

import { fetchValueData as fetchRows } from '@/lib/value/data-source';

import { primeValueSearch } from '@/lib/search/value-source';
import { unpackView,type BrowserPayload,type BrowserRow } from '@/lib/value/browser-view';
import dynamic from 'next/dynamic';
const loadTable=()=>import('./_components/ResultsTable');
const MemoMainView=memo(MainView);
const LazyResultsTable=dynamic(()=>loadTable().then(m=>m.ResultsTable));

export default function ValueIndex({ rows, todayRows, initialFilter, tags, meta, initialHistory }: { rows: BrowserRow[]; todayRows?:BrowserRow[]; initialFilter: FilterState; tags: Record<string, string>; meta: StoreMeta | null; initialHistory: HistoryIndex | null }) {
  const history=initialHistory;
  const quarters=useMemo(()=>history?.quarters??history?.years.map(y=>`${y}Q4`)??[],[history]);
  const initialFrame=historyFrame(initialFilter,quarters);
  const [timelineSlot,setTimelineSlot]=useState<HTMLElement|null>(null);
  useEffect(()=>{setTimelineSlot(document.getElementById("value-timeline"));},[]);
  useEffect(()=>{if(todayRows||initialFrame==='Today')primeValueSearch(todayRows??rows);},[rows,todayRows,initialFrame]);
  const [filter, setFilter] = useDebouncedQuery(initialFilter,"push");
  const [views,setViews]=useState<Record<string,BrowserRow[]>>({...(todayRows?{Today:todayRows}:{}),[initialFrame]:rows});
  const memory=useRef(views);
  const loads=useRef(new Map<string,Promise<BrowserRow[]>>());
  const [frame,setFrame]=useState(initialFrame);
  const [historyError,setHistoryError]=useState('');
  const [pending,startTransition]=useTransition();
  const [table,setTable]=useState(false),[filtersOpen,setFiltersOpen]=useState(false);
  const allMarkets=filter.markets==='all';
  const scopedHistory=history ? {...history,perYear:allMarkets?history.perYear:history.western?.perYear??{},perQuarter:allMarkets?history.perQuarter:history.western?.perQuarter??{}} : null;
  const year=historyFrame(filter,quarters);
  const search=filter.search??(!/^\d{4}Q[1-4]$/.test(filter.q??'')?filter.q:'');
  const historical=frame!=='Today';
  const country=filter.country??'';
  const loadYear=useCallback(async (key:string)=>{
    if(memory.current[key])return memory.current[key];
    const file=key==='Today'?meta?.views?.current:meta?.views?.quarters?.[key]??(key.endsWith('Q4')?meta?.views?.years[key.slice(0,4)]:undefined);
    if(!file)return;
    if(!loads.current.has(key))loads.current.set(key,fetchRows<BrowserPayload>(file).then(unpackView).then(data=>{memory.current[key]=data;if(key==='Today')primeValueSearch(data);return data;}).catch(error=>{loads.current.delete(key);throw error;}));
    return loads.current.get(key)!;
  },[meta?.views]);
  const prefetchCancel=useRef<(()=>void)|null>(null);
  const preload=useCallback((key:string)=>{
    prefetchCancel.current?.();
    prefetchCancel.current=onValueIdle(()=>{void loadYear(key).catch(()=>{});},150);
  },[loadYear]);
  useEffect(()=>()=>prefetchCancel.current?.(),[]);
  useEffect(()=>{
    if(frame===year)return;
    let current=true;
    setHistoryError('');
    const cached=memory.current[year];
    if(cached){startTransition(()=>{setViews(v=>v[year]===cached?v:{...v,[year]:cached});setFrame(year);});return;}
    void loadYear(year).then(data=>{if(current&&data)startTransition(()=>{setViews(v=>({...v,[year]:data}));setFrame(year);});}).catch(()=>{if(current)setHistoryError('Could not load this view. Try again.');});
    return()=>{current=false;};
  },[year,frame,loadYear]);
  useEffect(()=>{
    const years=[...quarters,'Today'];
    const i=years.indexOf(year);
    return onValueIdle(()=>{for(const key of [years[i-1],years[i+1]].filter(Boolean))void loadYear(key).catch(()=>{});},year===(initialFrame)?1200:0);
  },[year,quarters,loadYear,initialFrame]);
  const deferredLoads=useRef(new Map<string,Promise<void>>());
  const [extraLoading,setExtraLoading]=useState(false);
  const [prefetchDeferred,setPrefetchDeferred]=useState(false);
  const needsDeferred=prefetchDeferred||filtersOpen||table||!!country||filter.near==='1'||filter.awaiting==='1'||filter.gate!==undefined||QUALITY_TESTS.some(key=>!!filter[key]);
  useEffect(()=>{
    if(!needsDeferred)return;
    let active=true;
    const files=frame==='Today'?(meta?.views?.deferred??(meta?.views?.current?[meta.views.current]:[])):meta?.views?.quarterDeferred?.[frame]??(frame.endsWith('Q4')?meta?.views?.yearDeferred?.[frame.slice(0,4)]:undefined);
    if(!files?.length)return;
    setExtraLoading(true);
    if(!deferredLoads.current.has(frame))deferredLoads.current.set(frame,Promise.all(files.map(file=>fetchRows<BrowserPayload>(file).then(unpackView))).then(parts=>{
      const complete=[...new Map([...(memory.current[frame]??[]),...parts.flat()].map(row=>[row.id,row])).values()];
      memory.current[frame]=complete;
      if(frame==='Today')primeValueSearch(complete);
      setViews(v=>({...v,[frame]:complete}));
    }).catch(error=>{deferredLoads.current.delete(frame);throw error;}));
    void deferredLoads.current.get(frame)!.catch(()=>{if(active)setHistoryError('Could not load this view. Try again.');}).finally(()=>{if(active)setExtraLoading(false);});
    return()=>{active=false;};
  },[needsDeferred,frame,meta?.views]);
  const source=useMemo(()=>{
    return views[frame]??rows;
  },[views,frame,rows]);
  const loading=pending||frame!==year||(needsDeferred&&extraLoading);
  const sort = columns.some(([key]) => key === filter.sort) ? filter.sort as Sort : "mos";
  const direction = filter.direction === "asc" ? 1 : -1;

  useEffect(()=>{ const onFilter=(event:Event)=>change('search',(event as CustomEvent<string>).detail);window.addEventListener('filter-value-list',onFilter);return ()=>window.removeEventListener('filter-value-list',onFilter);},[]);
  const change=useCallback((key: string, value: string) => {
    setFilter((current) => { const next = { ...current }; delete next.gate; if (value) next[key] = value; else delete next[key]; return next; });
  },[setFilter]);
  const [fast,setFast]=useState(false),lastScrub=useRef(0),scrubTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(scrubTimer.current)clearTimeout(scrubTimer.current);},[]);
  function changeYear(value:string,immediate=false) {
    const now=performance.now();
    if(immediate||now-lastScrub.current<140)setFast(true);
    lastScrub.current=now;
    if(scrubTimer.current)clearTimeout(scrubTimer.current);
    scrubTimer.current=setTimeout(()=>setFast(false),180);
    setFilter(current=>{const next={...current};delete next.year;delete next.q;if(value!=='Today')next.q=value;return next;});
    const cached=memory.current[value];
    if(cached){
      const show=()=>{setViews(v=>v[value]===cached?v:{...v,[value]:cached});setFrame(value);};
      // A discrete cached key step can commit with the thumb in one paint.
      // Uncached drags retain the prior frame until their single payload arrives.
      show();
    }
  }
  function sortBy(key: Sort) {
    setFilter((current) => ({ ...current, sort: key, direction: sort === key ? direction === 1 ? "desc" : "asc" : key === "name" || key === "country" ? "asc" : "desc" }));
  }
  const countries = useMemo(()=>[...new Set([...Object.keys(meta?.funnel?.byCountry ?? {}), ...rows.map(row=>row.c)])].sort(),[meta,rows]);
  const countryNames=useMemo(()=>{const names=new Intl.DisplayNames(['en'],{type:'region'});return Object.fromEntries(countries.map(c=>[c,names.of(c)??c]));},[countries]);
  const allEntries = useMemo(() => source.map(row => {
    const quote=historical?null:row.quote?.[0]??null;
    const ratio=historical?row.pm??null:priceValue({price:quote,mid:row.v?.[1]??null});
    return {row,quote,historical,outcome:row.outcome,basis:row.basis,historicalReturn:historical?row.gain??null:null,historicalPrice:row.historicalPrice,expected:row.expected,seed:!historical&&row.quote?.[2]==='seed',date:historical?null:row.quote?.[1],mos:row.st==='i'||ratio===null?null:1-ratio};
  }),[source,historical]);
  const gate = filter.gate !== undefined && /^[0-6]$/.test(filter.gate) ? Number(filter.gate) : null;
  const population = allMarkets ? meta?.funnel : meta?.western?.funnel;
  const counts = population ? [population.analysed, ...population.gates.map(g=>g.passing)] : [meta?.counts.analysed ?? rows.length, ...Array(4).fill(0),rows.filter(r=>r.t==='PPPPP').length,0];
  const displayed = useMemo(() => {
    return allEntries.filter(({row})=>matchesView(row,filter)).sort((a, b) => {
      if ((a.row.t==='PPPPP')!==(b.row.t==='PPPPP')) return (a.row.t==='PPPPP'?-1:1)*(filter.near==='1'?-1:1);
      if (a.row.st !== b.row.st) return a.row.st === "i" ? 1 : -1;
      const av = sort === "name" ? a.row.nameEn??a.row.n : sort === "country" ? a.row.c : sort === "cap" ? a.row.mc : sort === "holders" ? a.row.h : sort === "return" ? a.expected??a.row.returnInfo?.sort : sort === "flags" ? Number(a.seed) : a.mos;
      const bv = sort === "name" ? b.row.nameEn??b.row.n : sort === "country" ? b.row.c : sort === "cap" ? b.row.mc : sort === "holders" ? b.row.h : sort === "return" ? b.expected??b.row.returnInfo?.sort : sort === "flags" ? Number(b.seed) : b.mos;
      if (av == null || bv == null) return av == null && bv == null ? (b.row.t.match(/P/g)?.length??0)-(a.row.t.match(/P/g)?.length??0)||a.row.id.localeCompare(b.row.id) : av == null ? 1 : -1;
      return (typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : Number(av) - Number(bv)) * direction || a.row.id.localeCompare(b.row.id);
    });
  }, [allEntries, filter.q, filter.search, filter.markets, filter.sector, filter.held, filter.tags, filter.awaiting, filter.near, filter.understandable, filter.moat, filter.economics, filter.management, filter.accounting, sort, direction, country, gate, historical, allMarkets]);
  const countryOptions=useMemo((): [string,string,number][]=>{
    const count=(country:string)=>source.filter(row=>matchesView(row,{...filter,country,gate:''})).length;
    return [["","All countries",count('')],...countries.map(c=>[c,countryNames[c],count(c)] as [string,string,number]).sort((a,b)=>a[1].localeCompare(b[1]))];
  },[source,filter,countries,countryNames]);
  const sectorOptions=useMemo((): [string,string,number][]=>{
    const sectors=[...new Set(source.map(row=>row.s).filter((sector):sector is string=>!!sector))].sort();
    const count=(sector:string)=>source.filter(row=>matchesView(row,{...filter,sector,gate:''})).length;
    return [["","All sectors",count('')],...sectors.map(s=>[s,s,count(s)] as [string,string,number])];
  },[source,filter]);
  const optionDetails=useMemo(()=>{
    const describe=(key:'country'|'sector',values:string[])=>Object.fromEntries(values.filter(Boolean).map(value=>{
      const selected=source.filter(row=>matchesView(row,{...filter,[key]:value,gate:''}));
      return [value,`${selected.filter(row=>row.b).length} buy · ${selected.filter(row=>row.h>0).length} held`];
    }));
    return {countries:describe('country',countryOptions.map(([key])=>key)),sectors:describe('sector',sectorOptions.map(([key])=>key))};
  },[source,filter,countryOptions,sectorOptions]);
  const marketSwitch=<MarketScopeToggle all={allMarkets} onChange={all=>change('markets',all?'all':'')}/>;
  const switches=<><Toggle label="Near misses" checked={filter.near==='1'} onChange={()=>change('near',filter.near==='1'?'':'1')}/><Toggle label="Held by superinvestors" checked={filter.held==='1'} onChange={()=>change('held',filter.held==='1'?'':'1')}/>{marketSwitch}</>;
  const filterBar=<><Select label="Country" value={country} onChange={value=>change('country',value)} options={countryOptions}/><Select label="Sector" value={filter.sector??''} onChange={value=>change('sector',value)} options={sectorOptions}/>{switches}</>;

  const summary=historical?scopedHistory?.perQuarter?.[frame]??scopedHistory?.perYear[frame.slice(0,4)]:null;
  const story=(allMarkets?meta?.story:meta?.western?.story)??{analysed:counts[0],qualityPasses:counts[5],atBuy:counts[6],qualityShare:counts[0]?counts[5]/counts[0]:0};
  const total=summary?.analysed??story.analysed, quality=summary?.qualityPasses??story.qualityPasses, buys=summary?.atBuy??story.atBuy;
  return <div className="one-index locks-scroll" data-quality-count={quality} data-buy-count={buys} data-analysed-count={total}>
    <AgentQuarterMetadata canonical={siteUrl("value")} quarter={historical?frame:undefined}/>
    <section className="sr-only" aria-label="Published checklist data"><pre>{checklistMarkdown(source,meta,historical?frame:undefined,filter)}</pre></section>
    <section className="index-story"><h1 data-historical={historical}>{historical?historyHeadline(frame,summary??{atBuy:buys,avgReturnAtBuy:null,avgReturnAll:null}):`${buys} great ${buys===1?'business':'businesses'} at a fair price.`}</h1></section>
    <div className="map-toolbar"><div className="desktop-filters" onFocusCapture={event=>{if(!event.target.closest('.market-scope'))setPrefetchDeferred(true);}}>{filterBar}</div><button className="mobile-filter-button shared-filter-button" onClick={()=>setFiltersOpen(true)}>Filters</button><div className="mobile-market-scope">{marketSwitch}</div><button className="table-toggle" onPointerEnter={()=>void loadTable()} onFocus={()=>void loadTable()} onClick={()=>setTable(true)}>All companies ↗</button>{search&&<button onClick={()=>{change('search','');if(filter.q===search)change('q','');}}>Clear “{search}” ×</button>}{gate!==null&&<button onClick={()=>change('gate','')}>Reset gate ×</button>}</div>

    {historyError&&<p role="status" className="map-error">{historyError}</p>}
    <MemoMainView entries={displayed} year={frame} fast={fast} loading={loading}/>
    <ForwardLine record={meta?.forward} scope={allMarkets?'all':'western'}/>
    {timelineSlot&&createPortal(<QuarterSlider embedded globalKeys period="quarter" onPrefetch={preload} quarters={[...quarters,"Today"]} note={historical?`Prices ${dateLabel(quarterEnd(frame))} · Filed annual reports for quality · Filed trailing earnings for value`:undefined} q={year} onChange={changeYear}/>,timelineSlot)}
    {table&&<SidePanel title={`${displayed.length} companies`} compact onClose={()=>setTable(false)}><LazyResultsTable entries={displayed} sort={sort} direction={direction} sortBy={sortBy}/></SidePanel>}
    {filtersOpen&&<SidePanel title="Filter companies" onClose={()=>setFiltersOpen(false)}><div className="panel-filters" onFocusCapture={()=>setPrefetchDeferred(true)}><Select inline details={optionDetails.countries} label="Countries" value={country} onChange={value=>change('country',value)} options={countryOptions}/><Select inline details={optionDetails.sectors} searchable={false} label="Sectors" value={filter.sector??''} onChange={value=>change('sector',value)} options={sectorOptions}/><section className="filter-toggles" aria-label="More filters"><h3>More filters</h3>{switches}</section></div><footer className="filter-footer"><button className="filter-apply" onClick={()=>setFiltersOpen(false)}>Show {displayed.length} companies <span aria-hidden="true">→</span></button></footer></SidePanel>}
  </div>;
}
