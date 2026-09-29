"use client";

import { useEffect, useMemo, useState } from "react";
import { BuffettFunnel } from '@/components/value/viz/BuffettFunnel';
import { MarginStrip } from '@/components/value/viz/MarginStrip';

import { T } from '@/lib/value/config';
import { priceTest } from "@/lib/value/price-test";
import { QUALITY_TESTS, type IndexRow, type PriceMap, type Valuation, type StoreMeta } from "@/lib/value/types";

import { dateLabel } from '@/lib/value/presentation';
import { SearchTrigger } from '@/components/Search';
import { ValueLink } from '@/components/value/ValueLink';
import { Filters, type FilterState } from './_components/Filters';
import { ResultsTable, columns, type Sort } from './_components/ResultsTable';

import { fetchValueData as fetchRows } from '@/lib/value/data-source';

export default function ValueIndex({ rows, initialFilter, tags, meta }: { rows: IndexRow[]; initialFilter: FilterState; tags: Record<string, string>; meta: StoreMeta | null }) {
  const [filter, setFilter] = useState(initialFilter);
  const [ready, setReady] = useState(false);
  const [countryRows, setCountryRows] = useState<Record<string, IndexRow[]>>({});
  const [prices, setPrices] = useState<Record<string, PriceMap>>({});
  const [countryError, setCountryError] = useState("");
  const [pricesPending, setPricesPending] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [limit, setLimit] = useState(200);
  const country = filter.country ?? "";
  const [lastCountry, setLastCountry] = useState('');
  const source = country ? countryRows[country] ?? countryRows[lastCountry] ?? rows : rows;
  const loading = (!!country && !countryRows[country] && !countryError) || pricesPending;
  const sort = columns.some(([key]) => key === filter.sort) ? filter.sort as Sort : "mos";
  const direction = filter.direction === "asc" ? 1 : -1;

  useEffect(() => {
    const restore = () => { setFilter(Object.fromEntries(new URLSearchParams(window.location.search))); setReady(true); };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      url.search = new URLSearchParams(filter).toString();
      window.history.replaceState(null, "", url);
    }, 350);
    return () => clearTimeout(timer);
  }, [filter, ready]);
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
    setLimit(200);
    setFilter((current) => { const next = { ...current }; delete next.gate; if (value) next[key] = value; else delete next[key]; return next; });
  }
  function sortBy(key: Sort) {
    setFilter((current) => ({ ...current, sort: key, direction: sort === key ? direction === 1 ? "desc" : "asc" : key === "name" || key === "country" ? "asc" : "desc" }));
  }
  const countries = [...new Set([...Object.keys(meta?.funnel?.byCountry ?? {}), ...rows.map(row=>row.c)])].sort();
  const allEntries = useMemo(() => source.map(sourceRow => {
    const canonical = rows.find(candidate=>candidate.id===sourceRow.id);
    const row = {...sourceRow, returnInfo:sourceRow.returnInfo??canonical?.returnInfo, fy:sourceRow.fy??canonical?.fy};
    const quote = prices[row.c]?.[row.id]?.[0] ?? null;
    const result = priceTest({ valuation: row.v ? { perShare: { low: row.v[0], mid: row.v[1], high: row.v[2] } } as Valuation : null, price: quote, requiredMos: row.m ?? T.price.requiredMos.stable });
    return { row, quote, seed: prices[row.c]?.[row.id]?.[2] === "seed", date: prices[row.c]?.[row.id]?.[1], mos: row.st === 'i' ? null : result.mos };
  }), [source, rows, prices]);
  const gate = filter.gate !== undefined && /^[0-6]$/.test(filter.gate) ? Number(filter.gate) : null;
  const population = meta?.funnel;
  const counts = population ? [population.analysed, ...population.gates.map(g=>g.passing)] : [meta?.counts.analysed ?? rows.length, ...Array(4).fill(0),rows.filter(r=>r.t==='PPPPP').length,0];
  const checking=population?.gates.reduce((n,g)=>n+(g.checking??0),0)??0;
  const awaitingCount=rows.filter(r=>/^[PCU]+$/.test(r.t)&&r.t!=='PPPPP').length;
  const onlyFailures = [0,...(population?.gates.map(g=>g.failsOnlyThis) ?? Array(6).fill(0))];
  const dates = allEntries.flatMap(e => e.date ? [e.date] : []).sort();
  const date = dates.length ? dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} to ${dates.at(-1)}` : null;
  const selectedTags = (filter.tags ?? "").split(",").filter(Boolean);
  const displayed = useMemo(() => {
    return allEntries.filter(({ row, mos }) => {
      if (filter.q && !`${row.n} ${row.id}`.toLowerCase().includes(filter.q.toLowerCase())) return false;
      if (gate !== null) return row.t.slice(0, Math.min(gate, 5)) === 'P'.repeat(Math.min(gate, 5)) && (gate < 6 || (mos !== null && mos >= (row.m ?? T.price.requiredMos.stable)));
      if (filter.sector && row.s !== filter.sector) return false;
      if (filter.held === "1" && !row.h) return false;
      if (selectedTags.some((tag) => !row.g.includes(tag))) return false;
      if (QUALITY_TESTS.some((key, i) => filter[key] && row.t[i] !== (filter[key] === "pass" ? "P" : "F"))) return false;
      if (row.st === "i") return !!country;
      if (QUALITY_TESTS.some((key) => filter[key])) return true;
      if (filter.awaiting==='1') return /^[PCU]+$/.test(row.t)&&row.t!=='PPPPP';
      return row.t === "PPPPP" || (filter.near === "1" && /^P*FP*$/.test(row.t));
    }).sort((a, b) => {
      if ((a.row.t==='PPPPP')!==(b.row.t==='PPPPP')) return a.row.t==='PPPPP'?-1:1;
      if (a.row.st !== b.row.st) return a.row.st === "i" ? 1 : -1;
      const av = sort === "name" ? a.row.n : sort === "country" ? a.row.c : sort === "cap" ? a.row.mc : sort === "holders" ? a.row.h : sort === "return" ? a.row.returnInfo?.sort : a.mos;
      const bv = sort === "name" ? b.row.n : sort === "country" ? b.row.c : sort === "cap" ? b.row.mc : sort === "holders" ? b.row.h : sort === "return" ? b.row.returnInfo?.sort : b.mos;
      if (av == null || bv == null) return av == null && bv == null ? a.row.id.localeCompare(b.row.id) : av == null ? 1 : -1;
      return (typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : Number(av) - Number(bv)) * direction || a.row.id.localeCompare(b.row.id);
    });
  }, [allEntries, filter, sort, direction, country, gate]);
  const sectors = [...new Set(source.flatMap((row) => row.s ? [row.s] : []))].sort();

  const analysed = meta?.counts.analysed ?? (meta ? meta.counts.scored + meta.counts.insufficient : 0);
  const qualityCount = counts[5];
  const nearCount = rows.filter(row=>/^P*FP*$/.test(row.t)).length;
  return <div data-quality-count={counts[5]} data-buy-count={counts[6]} data-analysed-count={counts[0]}>
    <div className="index-hero"><div><p className="eyebrow">The Buffett checklist</p><h1>{qualityCount} of {analysed.toLocaleString('en-US')} companies pass Buffett’s quality tests{checking?' so far':''}.{checking>0&&<> {checking} are still being checked.</>}<span>{pricesPending ? ' Checking buy prices.' : counts[6] === 0 ? ' None is at its buy price.' : ` ${counts[6]} at their buy price.`}</span></h1><p className="index-dek">Six tests from the filings. Find durable businesses, see what they are worth, and know what would make them a buy. <ValueLink href="/method">Method →</ValueLink></p><p className="source-line">{analysed.toLocaleString('en-US')} analysed of {(meta?.counts.universe ?? 0).toLocaleString('en-US')} listed · SEC filings / EODHD · Updated {dateLabel(meta?.asOf)}</p></div>
    <MarginStrip checking={checking} unpriced={rows.filter(row=>(row.t==='PPPPP'||/^P*FP*$/.test(row.t))&&prices[row.c]&&(!row.v||row.v[1]<=0||!prices[row.c][row.id])).map(row=>({id:row.id,name:row.n}))} qualityCount={counts[5]} buyCount={counts[6]} date={date} entries={rows.flatMap(row=>{const quote=prices[row.c]?.[row.id],mid=row.v?.[1];return quote&&mid&&mid>0?[{id:row.id,name:row.n,tests:row.t,mos:1-quote[0]/mid,requiredMos:row.m??T.price.requiredMos.stable,date:quote[1]}]:[];})}/></div>
    <BuffettFunnel gates={population?.gates} analysed={analysed} counts={counts} onlyFailures={onlyFailures} date={population?.asOf} selected={gate} onSelect={gate => { setLimit(200); setFilter(current => ({ ...current,gate:String(gate) })); }}/>
    {gate !== null && <p className="gate-explanation" role="status">{counts[gate].toLocaleString('en-US')} companies pass {gate ? `the first ${Math.min(gate,5)} quality tests${gate===6?' and the buy-price test':''}` : 'through analysis'} across all countries. The table shows the published shortlist; choose a country to explore its full coverage. <button className="underline" onClick={() => change('gate', '')}>Reset</button></p>}
    <div className="table-search"><span>Find a business. Read the evidence.</span><SearchTrigger label={`Filter ${qualityCount} companies…`} />{filter.q && <button onClick={()=>change('q','')}>Clear “{filter.q}” ×</button>}</div>
    <Filters filter={filter} countries={countries} sectors={sectors} tags={tags} nearCount={nearCount} awaitingCount={awaitingCount} change={change} />
    {countryError && country && <p role="status" className="my-3 text-sm text-sell">{countryError}</p>}
    {priceError && <p role="status" className="my-3 text-sm text-sell">{priceError}</p>}
    {country && !countryRows[country] && !countryError && <p role="status">Loading companies…</p>}
    {filter.awaiting==='1'&&<p className="near-caption">Dotted rings: price history arriving. Open rings: the sources cannot yet settle the test. Neither is a failure.</p>}
    {filter.near==='1'&&<p className="near-caption">Near misses fail exactly one quality test. Below the buy line is not enough.</p>}
    <p className="table-caption"><strong>{displayed.length} companies</strong><span>Prices {dates[0]!==dates.at(-1)?`${dateLabel(dates[0])} to ${dateLabel(dates.at(-1))}`:dateLabel(dates.at(-1))} · {allEntries.some(e=>e.seed) ? 'Includes estimates from market capitalisation' : 'Latest closes'} · Buy ticks reflect each company’s required discount</span></p>
    <div style={{ opacity: loading ? .6 : 1 }} aria-busy={loading}><ResultsTable expanded={filter.near==='1'||filter.awaiting==='1'||QUALITY_TESTS.some(k=>!!filter[k])} entries={displayed.slice(0, limit)} sort={sort} direction={direction} sortBy={sortBy} /></div>
    {!displayed.length && <p className="py-6 text-ink/60">No companies match these filters.</p>}
    {displayed.length > limit && <button type="button" className="mt-4 border border-ink/20 px-4 py-2" onClick={() => setLimit((current) => current + 200)}>Show more</button>}
  </div>;
}
