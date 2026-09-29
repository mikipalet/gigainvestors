"use client";

import { useEffect, useMemo, useState } from "react";
import { BuffettFunnel } from '@/components/value/viz/BuffettFunnel';
import { MarginStrip } from '@/components/value/viz/MarginStrip';
import { funnelCounts } from '@/lib/value/viz/layout';
import { T } from '@/lib/value/config';
import { priceTest } from "@/lib/value/site-price-test";
import { QUALITY_TESTS, type IndexRow, type PriceMap, type Valuation } from "@/lib/value/types";

import { Filters, type FilterState } from './_components/Filters';
import { ResultsTable, columns, type Sort } from './_components/ResultsTable';

const base = "https://raw.githubusercontent.com/mikipalet/gigainvestors-value-data/main/";

async function fetchRows<T>(file: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${base}${file}`, { signal });
  if (!response.ok) throw new Error(`Data unavailable (${response.status})`);
  return response.json() as Promise<T>;
}

export default function ValueIndex({ rows, initialFilter, tags }: { rows: IndexRow[]; initialFilter: FilterState; tags: Record<string, string> }) {
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

  const visibleCountries = [...new Set(source.map((row) => row.c))].sort().join(",");
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

  function change(key: string, value: string) {
    setLimit(200);
    setFilter((current) => { const next = { ...current }; delete next.gate; if (value) next[key] = value; else delete next[key]; return next; });
  }
  function sortBy(key: Sort) {
    setFilter((current) => ({ ...current, sort: key, direction: sort === key ? direction === 1 ? "desc" : "asc" : key === "name" || key === "country" ? "asc" : "desc" }));
  }
  const countries = [...new Set([...rows, ...Object.values(countryRows).flat()].map(row => row.c))].sort();
  const allEntries = useMemo(() => source.map(row => {
    const quote = prices[row.c]?.[row.id]?.[0] ?? null;
    const result = priceTest({ valuation: row.v ? { perShare: { low: row.v[0], mid: row.v[1], high: row.v[2] } } as Valuation : null, price: quote, requiredMos: row.m });
    return { row, quote, date: prices[row.c]?.[row.id]?.[1], mos: row.st === 'i' ? null : result.mos };
  }), [source, prices]);
  const gate = filter.gate !== undefined && /^[0-6]$/.test(filter.gate) ? Number(filter.gate) : null;
  const counts = funnelCounts(allEntries.map(e => ({ tests: e.row.t, mos: e.mos, requiredMos: e.row.m })));
  const onlyFailures = [0, ...QUALITY_TESTS.map((_, i) => allEntries.filter(e => e.row.t[i] === 'F' && [...e.row.t].every((t, j) => j === i || t === 'P')).length), allEntries.filter(e => e.row.t === 'PPPPP' && e.mos !== null && e.mos < (e.row.m ?? T.price.passMos)).length];
  const dates = allEntries.flatMap(e => e.date ? [e.date] : []).sort();
  const date = dates.length ? dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} to ${dates.at(-1)}` : null;
  const selectedTags = (filter.tags ?? "").split(",").filter(Boolean);
  const displayed = useMemo(() => {
    return allEntries.filter(({ row, mos }) => {
      if (gate !== null) return row.t.slice(0, Math.min(gate, 5)) === 'P'.repeat(Math.min(gate, 5)) && (gate < 6 || (mos !== null && mos >= (row.m ?? T.price.passMos)));
      if (filter.sector && row.s !== filter.sector) return false;
      if (filter.held === "1" && !row.h) return false;
      if (selectedTags.some((tag) => !row.g.includes(tag))) return false;
      if (QUALITY_TESTS.some((key, i) => filter[key] && row.t[i] !== (filter[key] === "pass" ? "P" : "F"))) return false;
      if (row.st === "i") return !!country;
      if (QUALITY_TESTS.some((key) => filter[key])) return true;
      return row.t === "PPPPP" || (filter.near === "1" && [...row.t].filter((result) => result === "F").length === 1);
    }).sort((a, b) => {
      if (a.row.st !== b.row.st) return a.row.st === "i" ? 1 : -1;
      const av = sort === "name" ? a.row.n : sort === "country" ? a.row.c : sort === "cap" ? a.row.mc : sort === "holders" ? a.row.h : a.mos;
      const bv = sort === "name" ? b.row.n : sort === "country" ? b.row.c : sort === "cap" ? b.row.mc : sort === "holders" ? b.row.h : b.mos;
      if (av == null || bv == null) return av == null && bv == null ? a.row.id.localeCompare(b.row.id) : av == null ? 1 : -1;
      return (typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : Number(av) - Number(bv)) * direction || a.row.id.localeCompare(b.row.id);
    });
  }, [allEntries, filter, sort, direction, country, gate]);
  const sectors = [...new Set(source.flatMap((row) => row.s ? [row.s] : []))].sort();

  return <div>
    <div className="mb-8 grid grid-cols-1 gap-8 border-t border-ink/20 pt-6 lg:grid-cols-2" style={{ opacity: loading ? .6 : 1 }} aria-busy={loading}>
      <BuffettFunnel counts={counts} onlyFailures={onlyFailures} date={date} selected={gate} onSelect={gate => { setLimit(200); setFilter(current => ({ ...(current.country ? { country: current.country } : {}), gate: String(gate), sort: current.sort ?? 'mos', direction: current.direction ?? 'desc' })); }} />
      <MarginStrip date={date} entries={allEntries.flatMap(e => e.row.t === 'PPPPP' && e.mos !== null ? [{ id: e.row.id, name: e.row.n, mos: e.mos, requiredMos: e.row.m ?? T.price.passMos, date: e.date }] : [])} />
      <p className="text-xs text-ink/55 lg:col-span-2">Counts describe this loaded index{country ? ` (${country})` : ', a shortlist of quality companies and near misses'}, not the full global universe.</p>
    </div>
    {gate !== null && <p className="mb-3 text-xs">Cumulative gate {gate} active. <button className="underline" onClick={() => change('gate', '')}>Reset to quality default</button></p>}
    <Filters filter={filter} countries={countries} sectors={sectors} tags={tags} change={change} />
    {countryError && country && <p role="status" className="my-3 text-sm text-sell">{countryError}</p>}
    {priceError && <p role="status" className="my-3 text-sm text-sell">{priceError}</p>}
    {country && !countryRows[country] && !countryError && <p role="status">Loading companies…</p>}
    <div style={{ opacity: loading ? .6 : 1 }} aria-busy={loading}><ResultsTable entries={displayed.slice(0, limit)} sort={sort} direction={direction} sortBy={sortBy} /></div>
    {!displayed.length && <p className="py-6 text-ink/60">No companies match these filters.</p>}
    {displayed.length > limit && <button type="button" className="mt-4 border border-ink/20 px-4 py-2" onClick={() => setLimit((current) => current + 200)}>Show more</button>}
  </div>;
}
