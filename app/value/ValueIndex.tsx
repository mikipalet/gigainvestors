"use client";

import { useEffect, useMemo, useState } from "react";
import { priceTest } from "@/lib/value/price-test";
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
  const [priceError, setPriceError] = useState("");
  const [limit, setLimit] = useState(200);
  const country = filter.country ?? "";
  const source = country ? countryRows[country] ?? [] : rows;
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
      .then((data) => setCountryRows((current) => ({ ...current, [country]: data })))
      .catch((cause: Error) => { if (cause.name !== "AbortError") setCountryError("Could not load this country. Choose another country or reload to retry."); });
    return () => controller.abort();
  }, [country, countryRows]);

  const visibleCountries = [...new Set(source.map((row) => row.c))].sort().join(",");
  useEffect(() => {
    const controller = new AbortController();
    setPriceError("");
    for (const cc of visibleCountries.split(",").filter(Boolean)) {
      fetchRows<PriceMap>(`prices/${cc}.json`, controller.signal)
        .then((data) => setPrices((current) => ({ ...current, [cc]: data })))
        .catch((cause: Error) => { if (cause.name !== "AbortError") setPriceError("Some prices are unavailable. Those companies show no price."); });
    }
    return () => controller.abort();
  }, [visibleCountries]);

  function change(key: string, value: string) {
    setLimit(200);
    setFilter((current) => { const next = { ...current }; if (value) next[key] = value; else delete next[key]; return next; });
  }
  function sortBy(key: Sort) {
    setFilter((current) => ({ ...current, sort: key, direction: sort === key ? direction === 1 ? "desc" : "asc" : key === "name" || key === "country" ? "asc" : "desc" }));
  }
  const countries = [...new Set([...rows, ...Object.values(countryRows).flat()].map(row => row.c))].sort();
  const selectedTags = (filter.tags ?? "").split(",").filter(Boolean);
  const displayed = useMemo(() => {
    return source.filter((row) => {
      if (filter.sector && row.s !== filter.sector) return false;
      if (filter.held === "1" && !row.h) return false;
      if (selectedTags.some((tag) => !row.g.includes(tag))) return false;
      if (QUALITY_TESTS.some((key, i) => filter[key] && row.t[i] !== (filter[key] === "pass" ? "P" : "F"))) return false;
      if (row.st === "i") return !!country;
      if (QUALITY_TESTS.some((key) => filter[key])) return true;
      return row.t === "PPPPP" || (filter.near === "1" && [...row.t].filter((result) => result === "F").length === 1);
    }).map((row) => {
      const quote = prices[row.c]?.[row.id]?.[0] ?? null;
      // Both IndexRow.v/cur and PriceMap quotes use trading currency by contract.
      const outcome = priceTest(row.v ? { perShare: { low: row.v[0], mid: row.v[1], high: row.v[2] } } as Valuation : null, quote);
      return { row, mos: row.st === "i" ? null : outcome.mos, quote };
    }).sort((a, b) => {
      if (a.row.st !== b.row.st) return a.row.st === "i" ? 1 : -1;
      const av = sort === "name" ? a.row.n : sort === "country" ? a.row.c : sort === "cap" ? a.row.mc : sort === "holders" ? a.row.h : a.mos;
      const bv = sort === "name" ? b.row.n : sort === "country" ? b.row.c : sort === "cap" ? b.row.mc : sort === "holders" ? b.row.h : b.mos;
      if (av == null || bv == null) return av == null && bv == null ? a.row.id.localeCompare(b.row.id) : av == null ? 1 : -1;
      return (typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : Number(av) - Number(bv)) * direction || a.row.id.localeCompare(b.row.id);
    });
  }, [source, prices, filter, sort, direction]);
  const sectors = [...new Set(source.flatMap((row) => row.s ? [row.s] : []))].sort();

  return <div>
    <Filters filter={filter} countries={countries} sectors={sectors} tags={tags} change={change} />
    {countryError && country && <p role="status" className="my-3 text-sm text-sell">{countryError}</p>}
    {priceError && <p role="status" className="my-3 text-sm text-sell">{priceError}</p>}
    {country && !countryRows[country] && !countryError && <p role="status">Loading companies…</p>}
    <ResultsTable entries={displayed.slice(0, limit)} sort={sort} direction={direction} sortBy={sortBy} />
    {!displayed.length && <p className="py-6 text-ink/60">No companies match these filters.</p>}
    {displayed.length > limit && <button type="button" className="mt-4 border border-ink/20 px-4 py-2" onClick={() => setLimit((current) => current + 200)}>Show more</button>}
  </div>;
}
