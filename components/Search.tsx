"use client";
import { VALUE_PRODUCT_NAME } from '@/lib/value/brand';

import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { useSelectedLayoutSegment, usePathname } from 'next/navigation';
import { valueHits, cachedValueHits, warmValueSearch, type ValueHit } from '@/lib/search/value-source';
import {companyPath, companyTicker, withQuarter} from '@/lib/company-route';
import type { SearchIndex } from "@/lib/types";
import { Fragment } from 'react';
import { displayName } from '@/lib/value/presentation';
import { StatusGlyph } from '@/components/value/viz/StatusGlyph';
import { plural } from "@/lib/format";
import { slugOf } from "@/lib/slug";

import { rank, searchIndexForScope, type Hit } from "@/lib/search/rank";

const cached = new Map<boolean,Promise<SearchIndex>>();
const loadIndex = (value=false) => {
 const existing=cached.get(value);if(existing)return existing;
 const request=fetch('/api/search').then(r=>r.json() as Promise<SearchIndex>).then(data=>{
  const index=searchIndexForScope(data,value);rank(index,'\0');return index;
 }).catch(error=>{cached.delete(value);throw error;});
 cached.set(value,request);return request;
};

// Press "/" anywhere. Investors, firms, tickers and company names.
export function SearchTrigger({query = '', className = '', label = 'search', value = false}: {query?:string;className?:string;label?:string;value?:boolean}) {
 return <button type="button" aria-label="Search companies" onPointerEnter={()=>{void warmValueSearch().catch(()=>{});void loadIndex(value).catch(()=>{});}} onFocus={()=>{void warmValueSearch().catch(()=>{});void loadIndex(value).catch(()=>{});}} onClick={()=>window.dispatchEvent(new CustomEvent('open-search',{detail:query}))} className={`rounded-[3px] bg-paper px-2 py-1 text-[13px] leading-none opacity-50 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--ink)_35%,transparent)] transition-opacity hover:opacity-100 ${className}`}>{label} <span className="ml-1 opacity-60">/</span></button>;
}
export function Search() {
  const segment = useSelectedLayoutSegment(), pathname = usePathname();
  const isValue = segment === 'value' || pathname.startsWith('/value');
  const [storedValues,setValues]=useState<ValueHit[]>([]);
  const [resultQuery,setResultQuery]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const initialQuery=useRef('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLInputElement;
      const typing = t?.tagName === "INPUT" && t.type !== "range";
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const show = (event:Event) => { initialQuery.current=(event as CustomEvent<string>).detail ?? ''; setQuery(initialQuery.current);setOpen(true); };
    window.addEventListener('open-search',show);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("open-search",show); };
  }, []);

  useEffect(() => {
    if (!open) return;
    loadIndex(false).then(setIndex).catch(()=>setError('Could not load search. Try again.'));
    setQuery(initialQuery.current); initialQuery.current='';
    setSel(0);
    requestAnimationFrame(() => input.current?.focus());
  }, [open,isValue]);

  useEffect(()=>{
    let current=true;
    setError('');
    if (!open || !query.trim()) {setValues([]);setLoading(false);return;}
    const immediate=cachedValueHits(query);
    setValues(immediate);setResultQuery(query);
    setLoading(!immediate.length);
    valueHits(query).then(results=>{
      if (!current) return;
      setValues(results);setLoading(false);
    }).catch(()=>{if(current){setLoading(false);if(isValue)setError('Could not load company search. Try again.');}});
    return ()=>{current=false;};
  },[query,open,isValue]);
  const immediateValues=useMemo(()=>cachedValueHits(query),[query]);
  const values=resultQuery===query?storedValues:immediateValues;
  const deferredQuery=useDeferredValue(query);
  const mainHits=useMemo(()=>(index?rank(index,deferredQuery):[]),[index,deferredQuery]);
  const companyIds=new Set(values.map(h=>companyTicker(h.row[0])));
  const hits: Array<Hit|ValueHit> = [...mainHits.filter(h=>h.kind!=='stock'),...values,...mainHits.filter(h=>h.kind==='stock'&&!companyIds.has(h.ticker))];


  useEffect(()=>{document.getElementById(`search-hit-${sel}`)?.scrollIntoView({block:'nearest'});},[sel]);
  const go = (h: Hit | ValueHit) => {
    setOpen(false);
    if (h.kind==='value') {window.location.assign(withQuarter(companyPath(h.row[0]),document.documentElement.dataset.quarter??new URLSearchParams(location.search).get('q'))); return;}
    window.location.assign(withQuarter(h.kind==='munger'?'/munger':h.kind==='investor'?`/${h.code}`:companyPath(h.ticker),document.documentElement.dataset.quarter??new URLSearchParams(location.search).get('q')));
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-paper/85 pt-[18vh]" onMouseDown={() => setOpen(false)}>
          <div className="search-modal w-[min(560px,92vw)] bg-paper shadow-[0_0_0_1px_var(--ink)]" onMouseDown={(e) => e.stopPropagation()}>
            <input
              aria-label="Search investor, firm, ticker, company"
              role="combobox" aria-expanded="true" aria-controls="search-results" aria-activedescendant={hits[sel] ? `search-hit-${sel}` : undefined}
              ref={input}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSel(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {e.preventDefault();setSel((s) => Math.min(s + 1, Math.max(0,hits.length - 1)));}
                if (e.key === "ArrowUp") {e.preventDefault();setSel((s) => Math.max(s - 1, 0));}
                if (e.key === "Enter" && hits[sel]) go(hits[sel]);
              }}
              placeholder="investor, firm, ticker, company"
              className="w-full bg-transparent px-4 py-3 text-[16px] outline-none placeholder:opacity-35"
              spellCheck={false}
              autoComplete="off"
            />
            {!query.trim() && (
              <div className="border-t border-ink/15 px-4 py-3 text-[13px] leading-relaxed opacity-45">
                Try an investor (Buffett, Ackman), a firm (Baupost), or a ticker (AAPL, GOOGL).
              </div>
            )}
            {hits.length === 0 && query.trim().length > 1 && index && !loading && !error && (
              <div className="border-t border-ink/15 px-4 py-3 text-[13px] opacity-40">nothing filed under that</div>
            )}
            {loading && <div role="status" className="border-t border-ink/15 px-4 py-3 text-[13px] opacity-40">searching…</div>}
            {error && <div role="status" className="border-t border-ink/15 px-4 py-3 text-[13px] opacity-40">{error}</div>}
            {isValue && query.trim() && ['','/'].includes(pathname.replace('/value','')) && <button className="block w-full border-t border-ink/15 px-4 py-3 text-left text-[13px] opacity-60" onClick={()=>{window.dispatchEvent(new CustomEvent('filter-value-list',{detail:query}));setOpen(false);}}>Filter this list: {query}</button>}
            {hits.length > 0 && (
              <ul id="search-results" role="listbox" className="border-t border-ink/15 py-1 max-h-[50vh] overflow-y-auto">
                {hits.map((h, offset) => { const i=offset; return (
                  <Fragment key={h.kind==='value'?h.row[0]:h.kind==='munger'?'munger':h.title}><li
                    id={`search-hit-${i}`} role="option" aria-selected={i===sel}
                    key={h.kind === "value" ? h.row[0] : h.kind === "munger" ? "munger" : h.kind === "investor" ? `i${h.code}` : `s${h.ticker}`}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(h)}
                    className={`${h.kind==='value'?'value-search-row ':''}flex cursor-pointer items-center gap-3 px-4 py-2 text-[13px] ${i === sel ? "search-selected" : ""}`}
                  >
                    {h.kind === "investor" && <img src={`/faces/png/v2/${slugOf(h.title)}.png`} width={26} height={32} alt="" className="-my-1 block shrink-0" />}
                    <span className="shrink-0 whitespace-nowrap font-semibold">{h.kind === "munger" ? "Charlie Munger" : h.kind==='value'?companyTicker(h.row[0]):h.title}</span>
                    <span className="search-description opacity-60" title={h.kind==='value'?displayName(h.row[1]):h.kind==='stock'?h.sub:undefined}>{h.kind === "munger" ? "1924 – 2023" : h.kind==='value'?displayName(h.row[1]):isValue?displayName(h.sub):h.sub}</span>
                    {h.kind==='value'&&<span className="shrink-0 opacity-60">{h.row[2]}</span>}
                    {h.kind === "stock" && <span className="ml-auto shrink-0 opacity-60">{plural(h.holders, "holder")}</span>}
                    {h.kind==='value'&&h.row[5]===null&&<span className="market-access-status">not easily buyable from Western brokers</span>}
                    {h.kind === 'value' && <span className="value-search-status ml-auto shrink-0 opacity-60">{h.tests&&/^[PF]{5}$/.test(h.tests)?<span className="inline-flex gap-1">{[...h.tests].map((t,j)=><StatusGlyph key={j} result={({P:'pass',F:'fail',C:'checking',U:'unclear',N:'na'} as const)[t as 'P']??'unclear'} label={`${['Understandable','Moat','Economics','Management','Accounting'][j]}: ${{P:'pass',F:'fail',C:'',U:'',N:'not applicable'}[t]}`}/>)}</span>:'analysed'}{h.ratio!=null&&` · ${h.ratio.toFixed(2)}×`}{!!h.holders&&` · ${h.holders} holders`}</span>}
                    {h.kind === "investor" && <span className="ml-auto shrink-0 opacity-60">investor</span>}
                    {h.kind === "munger" && <span className="ml-auto shrink-0 opacity-60">the waiting</span>}
                  </li></Fragment>
                );})}
              </ul>
            )}

          </div>
        </div>
      )}
    </>
  );
}

export function SearchInput({query=''}:{query?:string}) {
 return <input className="recovery-search" aria-label="Search companies" placeholder="Search company or ticker…" defaultValue={query} onFocus={e=>window.dispatchEvent(new CustomEvent('open-search',{detail:e.currentTarget.value}))}/>;
}
