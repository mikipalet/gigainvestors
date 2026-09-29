"use client";

import { useEffect, useMemo, useState } from "react";
import { useDebouncedQuery } from "@/lib/use-quarter";
import { BuffettFunnel } from '@/components/value/viz/BuffettFunnel';
import { CompanyTreemap } from '@/components/value/CompanyTreemap';
import { Select } from '@/components/controls/Select';
import { Toggle } from '@/components/controls/Toggle';
import { QuarterSlider } from '@/components/QuarterSlider';
import type { HistoryIndex, SnapshotRow } from '@/lib/value/time-travel';
import { BUY_RAMP } from '@/lib/value/presentation';
import { SidePanel } from '@/components/value/SidePanel';

import { QUALITY_TESTS, type IndexRow, type PriceMap, type StoreMeta } from "@/lib/value/types";

import { priceValue, dateLabel } from '@/lib/value/presentation';
import { ValueLink } from '@/components/value/ValueLink';
import { type FilterState } from './_components/Filters';
import { ResultsTable, columns, type Sort } from './_components/ResultsTable';

import { fetchValueData as fetchRows } from '@/lib/value/data-source';

export default function ValueIndex({ rows, initialFilter, tags, meta }: { rows: IndexRow[]; initialFilter: FilterState; tags: Record<string, string>; meta: StoreMeta | null }) {
  const [history,setHistory]=useState<HistoryIndex|null>(null);
  const [snapshots,setSnapshots]=useState<Record<string,SnapshotRow[]>>({});
  const [historyMetadataError,setHistoryMetadataError]=useState('');
  const [historyError,setHistoryError]=useState('');
  const [method,setMethod]=useState(false);
  const [filter, setFilter] = useDebouncedQuery(initialFilter);
  const [countryRows, setCountryRows] = useState<Record<string, IndexRow[]>>({});
  const [prices, setPrices] = useState<Record<string, PriceMap>>({});
  const [countryError, setCountryError] = useState("");
  const [pricesPending, setPricesPending] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [table, setTable] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const year=filter.year??'Today';
  const historical=year!=='Today';
  useEffect(()=>{const controller=new AbortController();fetchRows<HistoryIndex>('history/index.json',controller.signal).then(setHistory).catch(()=>{});return()=>controller.abort();},[]);
  useEffect(()=>{
    setHistoryError('');
    if(!historical||snapshots[year])return;
    if(history&&!history.years.includes(Number(year))){setHistoryError('This fiscal year is unavailable. Choose another year or Today.');return;}
    const controller=new AbortController();
    fetchRows<SnapshotRow[]>(`history/${year}.json`,controller.signal).then(data=>setSnapshots(current=>({...current,[year]:data}))).catch(()=>{if(!controller.signal.aborted)setHistoryError('History is unavailable for this year. Choose another year or Today.');});
    return()=>controller.abort();
  },[year,historical,history,snapshots]);
  const country = filter.country ?? "";
  const [lastCountry, setLastCountry] = useState('');
  const currentSource = country ? countryRows[country] ?? countryRows[lastCountry] ?? rows : rows;
  const historyCountries=Object.keys(meta?.funnel?.byCountry??{}).sort().join(',');
  useEffect(()=>{
    if(!historical||country)return;
    const missing=historyCountries.split(',').filter(cc=>cc&&!countryRows[cc]);
    if(!missing.length)return;
    const controller=new AbortController();
    Promise.all(missing.map(async cc=>[cc,await fetchRows<IndexRow[]>(`index/${cc}.json`,controller.signal)] as const)).then(results=>{setHistoryMetadataError('');setCountryRows(current=>({...current,...Object.fromEntries(results)}));}).catch(()=>{if(!controller.signal.aborted)setHistoryMetadataError('Some company details are unavailable; historical results still include those listings.');});
    return()=>controller.abort();
  },[historical,country,historyCountries,countryRows]);
  const source=useMemo(()=>{
    if(!historical)return currentSource;
    const identities=new Map([...rows,...Object.values(countryRows).flat()].map(row=>[row.id,row]));
    return (snapshots[year]??[]).flatMap(old=>{
      const row=identities.get(old[0]);
      if(country&&row?.c!==country)return [];
      const identity:IndexRow=row??{id:old[0],n:`Company ${old[0]}`,c:'',s:null,k:'operating',mc:null,v:null,cur:'',t:old[1],g:[],h:0,st:'s'};
      return [{...identity,t:old[1],b:old[3],g:[],dataQualityFlags:[],st:'s' as const}];
    });
  },[currentSource,historical,snapshots,year,rows,countryRows,country]);
  const loading = (!!country && !countryRows[country] && !countryError) || pricesPending;
  const sort = columns.some(([key]) => key === filter.sort) ? filter.sort as Sort : "mos";
  const direction = filter.direction === "asc" ? 1 : -1;

  useEffect(() => {
    setCountryError("");
    if (!country || countryRows[country]) return;
    const controller = new AbortController();
    fetchRows<IndexRow[]>(`index/${country}.json`, controller.signal)
      .then((data) => { setCountryRows((current) => ({ ...current, [country]: data })); setLastCountry(country); })
      .catch((cause: Error) => { if (cause.name !== "AbortError") setCountryError("Could not load this country. Choose another country or reload to retry."); });
    return () => controller.abort();
  }, [country, countryRows]);

  const visibleCountries = [...new Set([...rows,...source].map((row) => row.c))].sort().join(",");
  useEffect(() => {
    const controller = new AbortController();
    setPriceError("");
    setPricesPending(true);
    Promise.all(visibleCountries.split(',').filter(Boolean).map(async cc => {
      try {
        const data = await fetchRows<PriceMap>(`prices/${cc}.json`, controller.signal);
        setPrices(current => ({ ...current, [cc]: data }));
      } catch (cause) {
        if (!controller.signal.aborted) setPriceError('Some prices are unavailable. Those companies show no price.');
      }
    })).finally(() => { if (!controller.signal.aborted) setPricesPending(false); });
    return () => controller.abort();
  }, [visibleCountries]);

  useEffect(()=>{ const onFilter=(event:Event)=>change('q',(event as CustomEvent<string>).detail);window.addEventListener('filter-value-list',onFilter);return ()=>window.removeEventListener('filter-value-list',onFilter);},[]);
  function change(key: string, value: string) {
    setFilter((current) => { const next = { ...current }; delete next.gate; if (value) next[key] = value; else delete next[key]; return next; });
  }
  function sortBy(key: Sort) {
    setFilter((current) => ({ ...current, sort: key, direction: sort === key ? direction === 1 ? "desc" : "asc" : key === "name" || key === "country" ? "asc" : "desc" }));
  }
  const countries = [...new Set([...Object.keys(meta?.funnel?.byCountry ?? {}), ...rows.map(row=>row.c)])].sort();
  const canonicalRows=useMemo(()=>new Map(rows.map(row=>[row.id,row])),[rows]);
  const historicalRows=useMemo(()=>new Map((snapshots[year]??[]).map(row=>[row[0],row])),[snapshots,year]);
  const allEntries = useMemo(() => source.map(sourceRow => {
    const canonical = canonicalRows.get(sourceRow.id);
    const row = {...sourceRow, returnInfo:sourceRow.returnInfo??canonical?.returnInfo, fy:sourceRow.fy??canonical?.fy};
    const old=historical?historicalRows.get(row.id):null;
    const quote = historical ? null : prices[row.c]?.[row.id]?.[0] ?? null;
    const ratio = historical ? old?.[2]??null : priceValue({ price: quote, mid: row.v?.[1] ?? null });
    return { row, quote, historical, historicalReturn:old?.[4]??null, seed: !historical&&prices[row.c]?.[row.id]?.[2] === "seed", date: historical?null:prices[row.c]?.[row.id]?.[1], mos: row.st === 'i' || ratio === null ? null : 1 - ratio };
  }), [source, canonicalRows, prices, historical, historicalRows]);
  const gate = filter.gate !== undefined && /^[0-6]$/.test(filter.gate) ? Number(filter.gate) : null;
  const population = meta?.funnel;
  const counts = population ? [population.analysed, ...population.gates.map(g=>g.passing)] : [meta?.counts.analysed ?? rows.length, ...Array(4).fill(0),rows.filter(r=>r.t==='PPPPP').length,0];
  const onlyFailures = [0,...(population?.gates.map(g=>g.failsOnlyThis) ?? Array(6).fill(0))];
  const dates = allEntries.flatMap(e => e.date ? [e.date] : []).sort();
  const date = dates.length ? dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} to ${dates.at(-1)}` : null;
  const selectedTags = (filter.tags ?? "").split(",").filter(Boolean);
  const displayed = useMemo(() => {
    return allEntries.filter(({ row, mos }) => {
      if (filter.q && !`${row.nameEn??row.n} ${row.nameLocal??''} ${row.id}`.toLowerCase().includes(filter.q.toLowerCase())) return false;
      if (gate !== null) return row.t.slice(0, Math.min(gate, 5)) === 'P'.repeat(Math.min(gate, 5)) && (gate < 6 || row.b === true);
      if (filter.sector && row.s !== filter.sector) return false;
      if (filter.held === "1" && !row.h) return false;
      if (selectedTags.some((tag) => !row.g.includes(tag))) return false;
      if (QUALITY_TESTS.some((key, i) => filter[key] && row.t[i] !== (filter[key] === "pass" ? "P" : "F"))) return false;
      if (row.st === "i") return !!country;
      if (QUALITY_TESTS.some((key) => filter[key])) return true;
      if (filter.awaiting==='1') return /^[PCU]+$/.test(row.t)&&row.t!=='PPPPP';
      return row.t === "PPPPP" || (filter.near === "1" && /^P*FP*$/.test(row.t));
    }).sort((a, b) => {
      if(sort==='mos'&&!!a.row.dataQualityFlags?.length!==!!b.row.dataQualityFlags?.length)return a.row.dataQualityFlags?.length?1:-1;
      if ((a.row.t==='PPPPP')!==(b.row.t==='PPPPP')) return (a.row.t==='PPPPP'?-1:1)*(filter.near==='1'?-1:1);
      if (a.row.st !== b.row.st) return a.row.st === "i" ? 1 : -1;
      const av = sort === "name" ? a.row.nameEn??a.row.n : sort === "country" ? a.row.c : sort === "cap" ? a.row.mc : sort === "holders" ? a.row.h : sort === "return" ? historical?a.historicalReturn:a.row.returnInfo?.sort : sort === "flags" ? Number(a.seed) : a.mos;
      const bv = sort === "name" ? b.row.nameEn??b.row.n : sort === "country" ? b.row.c : sort === "cap" ? b.row.mc : sort === "holders" ? b.row.h : sort === "return" ? historical?b.historicalReturn:b.row.returnInfo?.sort : sort === "flags" ? Number(b.seed) : b.mos;
      if (av == null || bv == null) return av == null && bv == null ? (b.row.t.match(/P/g)?.length??0)-(a.row.t.match(/P/g)?.length??0)||a.row.id.localeCompare(b.row.id) : av == null ? 1 : -1;
      return (typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : Number(av) - Number(bv)) * direction || a.row.id.localeCompare(b.row.id);
    });
  }, [allEntries, filter, sort, direction, country, gate, historical]);
  const sectors = [...new Set(source.flatMap((row) => row.s ? [row.s] : []))].sort();

  const analysed = meta?.counts.analysed ?? (meta ? meta.counts.scored + meta.counts.insufficient : 0);
  const filterBar = <><Select label="Country" value={country} onChange={value=>change('country',value)} options={[["","All countries"],...countries.map(c=>[c,new Intl.DisplayNames(['en'],{type:'region'}).of(c)??c] as [string,string])]}/><Select label="Sector" value={filter.sector??''} onChange={value=>change('sector',value)} options={[["","All sectors"],...sectors.map(s=>[s,s] as [string,string])]}/><Toggle label="Near misses" checked={filter.near==='1'} onChange={()=>change('near',filter.near==='1'?'':'1')}/><Toggle label="Held by superinvestors" checked={filter.held==='1'} onChange={()=>change('held',filter.held==='1'?'':'1')}/></>;
  const summary=historical?history?.perYear[year]:null;
  const story=meta?.story??{analysed:counts[0],qualityPasses:counts[5],atBuy:counts[6],qualityShare:counts[0]?counts[5]/counts[0]:0};
  const total=summary?.analysed??story.analysed, quality=summary?.qualityPasses??story.qualityPasses, buys=summary?.atBuy??story.atBuy;
  const ret=(n:number|null|undefined)=>n==null?'not available':`${n>=0?'+':''}${Math.round(n*100)}%`;
  const timeline=[...(history?.years??[]).map(String),'Today'];
  return <div className="one-index locks-scroll" data-quality-count={quality} data-buy-count={buys} data-analysed-count={total}>
    <section className="index-story">
      <p className="eyebrow">Good businesses. Sensible prices.</p>
      <h1>{historical ? summary ? `In ${year}, the checklist found ${buys} quality companies at their buy price.` : `Looking back at fiscal year ${year}.` : <>{quality.toLocaleString()} of {total.toLocaleString()} companies pass Buffett’s five quality tests. <em>{buys} qualify at a buy price.</em></>}</h1>
      <p>{historical?summary?`Their prices returned ${ret(summary.avgReturnAtBuy)} since, vs ${ret(summary.avgReturnQuality)} for all quality companies. Numbers only; no AI filing readings.`:'Historical results load separately from today’s review.':"A checklist inspired by Warren Buffett: find durable businesses, then wait for a price below their estimated value."}</p>
      <div className="story-proportion" role="img" aria-label={`${quality} of ${total} pass quality; ${buys} qualify at a buy price`}><i style={{width:`${total?quality/total*100:0}%`}}/><b style={{width:`${total?buys/total*100:0}%`}}/></div>
    </section>
    <div className="map-toolbar"><div className="desktop-filters">{filterBar}</div><button className="mobile-filter-button" onClick={()=>setFiltersOpen(true)}>Filters{Object.keys(filter).length?' ●':''}</button><span className="map-count">{displayed.length} companies</span><button className="table-toggle" onClick={()=>setTable(true)}>Table ↗</button><button onClick={()=>setMethod(true)}>Method ↗</button>{filter.q&&<button onClick={()=>change('q','')}>Clear “{filter.q}” ×</button>}{gate!==null&&<button onClick={()=>change('gate','')}>Reset gate ×</button>}</div>
    {(countryError||historyError||(historical&&historyMetadataError)||(!historical&&priceError))&&<p role="status" className="map-error">{countryError||historyError||(historical?historyMetadataError:priceError)}</p>}
    <div className="treemap-legend"><span><i className="legend-ramp">{BUY_RAMP.map(c=><b key={c} style={{background:c}}/>)}</i>Dark = cheaper · light = dearer</span><span><i className="legend-outline"/>Outlined = at buy price</span><span>Size = market cap{historical?' today':''} · tap to explore</span></div>
    <div className="map-stage" aria-busy={historical?!snapshots[year]&&!historyError:loading}><CompanyTreemap entries={displayed} year={year} onTable={()=>setTable(true)}/></div>
    <div className="time-note">{historical?`FY${year} · numerical tests only · price returns exclude dividends · click a company for today’s review`:'Buy line = estimated value less a safety discount. Estimates, not guarantees.'}{!history&&<span> · History not published yet</span>}</div>
    <QuarterSlider quarters={timeline} q={timeline.includes(year)?year:'Today'} onChange={value=>change('year',value==='Today'?'':value)} period="year" note="Time travel"/>
    {method&&<SidePanel title="How the checklist works" onClose={()=>setMethod(false)}><h2>Find a good business. Wait for a sensible price.</h2><p>Five tests check whether a business is understandable, has a durable advantage, earns cash, uses capital well, and reports honestly. The sixth asks whether its price leaves a safety discount.</p><p>Dark green means closer to or below the buy line; outlined tiles qualify in the published review. A cheap price alone is not a quality pass. Gray tiles have no verified comparable value. Tile area represents market cap, with a small minimum to keep companies selectable.</p><p>History uses only financial numbers available for each fiscal year, not AI readings of filings. Price returns run from the historical observation to the latest quote, exclude dividends and are not annualised. Historical sizing and holder filters use today’s information; colours use that year’s price/value with today’s required discount. This is an exploration of covered companies, not an investable backtest.</p><h3>Today’s gate breakdown</h3><BuffettFunnel gates={population?.gates} analysed={analysed} counts={counts} onlyFailures={onlyFailures} date={population?.asOf} selected={gate} onSelect={gate=>{setFilter(current=>({...current,gate:String(gate)}));setMethod(false);}}/><ValueLink href="/method">Full method & sources →</ValueLink></SidePanel>}
    {table&&<SidePanel title={`${displayed.length} companies`} wide onClose={()=>setTable(false)}><p className="source-line">{historical?`FY${year} observations · price returns since then, excluding dividends`:dates.length?`Prices ${dateLabel(dates.at(-1))}`:'Comparable prices unavailable'} · {allEntries.some(e=>e.seed)?'est. = derived from market cap / shares':dates.length?'Latest closes':'Ordered by quality passes when prices are missing'}. Unverified ratios are held for review.</p><ResultsTable entries={displayed} sort={sort} direction={direction} sortBy={sortBy}/></SidePanel>}
    {filtersOpen&&<SidePanel title="Filter companies" onClose={()=>setFiltersOpen(false)}><div className="panel-filters">{filterBar}</div><button className="filter-apply" onClick={()=>setFiltersOpen(false)}>Show {displayed.length} companies →</button></SidePanel>}
  </div>;
}
