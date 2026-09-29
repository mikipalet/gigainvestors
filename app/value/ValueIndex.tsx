"use client";

import { useEffect, useMemo, useState } from "react";
import { priceTest } from "@/lib/value/price-test";
import { QUALITY_TESTS, type IndexRow, type PriceMap, type Result, type Valuation } from "@/lib/value/types";
import { resultColors, testLabels } from "@/components/value/TestChips";

type Filters = Record<string, string>;
type Sort = "name" | "country" | "cap" | "mos" | "holders";
const columns: Array<[Sort, string]> = [["name", "Name"], ["country", "Country"], ["cap", "Market cap"], ["mos", "Margin of safety"], ["holders", "Holders"]];
const countries = "AE AR AT AU BE BG BH BM BR BW CA CH CI CL CN CO CY CZ DE DK EE EG ES FI FR GB GH GR HK HR HU ID IE IL IS IT JM JO JP KE KR KW KZ LB LK LT LU LV MA MC ME MK MT MU MX MY NA NG NL NO NZ OM PA PE PH PK PL PT QA RO RS RU SA SE SG SI SK TH TN TR TT TW TZ UG US VN ZA ZM ZW".split(" ");
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const base = "https://raw.githubusercontent.com/mikipalet/gigainvestors-value-data/main/";
const results: Record<string, Result> = { P: "pass", F: "fail", U: "unclear", N: "na" };

async function fetchRows<T>(file: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${base}${file}`, { signal });
  if (!response.ok) throw new Error(`Data unavailable (${response.status})`);
  return response.json() as Promise<T>;
}

export default function ValueIndex({ rows, initialFilter, tags }: { rows: IndexRow[]; initialFilter: Filters; tags: Record<string, string> }) {
  const [filter, setFilter] = useState(initialFilter);
  const [ready, setReady] = useState(false);
  const [countryRows, setCountryRows] = useState<Record<string, IndexRow[]>>({});
  const [prices, setPrices] = useState<Record<string, PriceMap>>({});
  const [error, setError] = useState("");
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
    if (!country || countryRows[country]) return;
    const controller = new AbortController();
    setError("");
    fetchRows<IndexRow[]>(`index/${country}.json`, controller.signal)
      .then((data) => setCountryRows((current) => ({ ...current, [country]: data })))
      .catch((cause: Error) => { if (cause.name !== "AbortError") setError("Could not load this country. Choose another country or reload to retry."); });
    return () => controller.abort();
  }, [country, countryRows]);

  const visibleCountries = [...new Set(source.map((row) => row.c))].sort().join(",");
  useEffect(() => {
    const controller = new AbortController();
    for (const cc of visibleCountries.split(",").filter(Boolean)) {
      fetchRows<PriceMap>(`prices/${cc}.json`, controller.signal)
        .then((data) => setPrices((current) => ({ ...current, [cc]: data })))
        .catch((cause: Error) => { if (cause.name !== "AbortError") setError("Some prices are unavailable. Those companies show no price."); });
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
  const selectedTags = (filter.tags ?? "").split(",").filter(Boolean);
  const displayed = useMemo(() => {
    return source.filter((row) => {
      if (filter.sector && row.s !== filter.sector) return false;
      if (filter.held === "1" && !row.h) return false;
      if (selectedTags.some((tag) => !row.g.includes(tag))) return false;
      if (QUALITY_TESTS.some((key, i) => filter[key] && row.t[i] !== (filter[key] === "pass" ? "P" : "F"))) return false;
      if (row.st === "i") return true;
      if (QUALITY_TESTS.some((key) => filter[key])) return true;
      return row.t === "PPPPP" || (filter.near === "1" && [...row.t].filter((result) => result === "F").length === 1);
    }).map((row) => {
      const quote = prices[row.c]?.[row.id]?.[0] ?? null;
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
    <div className="flex flex-wrap items-end gap-4 border-y border-ink/20 py-4 text-sm">
      <label className="grid gap-1">Country<select aria-label="Country" value={country} onChange={(event) => { change("country", event.target.value); change("sector", ""); }} className="max-w-52 border border-ink/20 bg-paper p-2"><option value="">All countries</option>{countries.map((cc) => <option key={cc} value={cc}>{countryNames.of(cc)} ({cc})</option>)}</select></label>
      <label className="grid gap-1">Sector<select aria-label="Sector" value={filter.sector ?? ""} onChange={(event) => change("sector", event.target.value)} className="max-w-52 border border-ink/20 bg-paper p-2"><option value="">All sectors</option>{sectors.map((sector) => <option key={sector}>{sector}</option>)}</select></label>
      <label className="py-2"><input type="checkbox" checked={filter.held === "1"} onChange={(event) => change("held", event.target.checked ? "1" : "")} /> Held by superinvestors</label>
      <label className="py-2"><input type="checkbox" checked={filter.near === "1"} onChange={(event) => change("near", event.target.checked ? "1" : "")} /> Near misses</label>
    </div>
    <div className="my-4 flex flex-wrap gap-2">{QUALITY_TESTS.map((key) => <button key={key} type="button" className="border border-ink/20 px-2 py-1 text-xs" onClick={() => change(key, !filter[key] ? "pass" : filter[key] === "pass" ? "fail" : "")}>{testLabels[key]}: {filter[key] ?? "any"}</button>)}</div>
    <div className="mb-4 flex flex-wrap gap-2">{Object.entries(tags).map(([id, label]) => <button key={id} type="button" aria-pressed={selectedTags.includes(id)} className={`border border-ink/20 px-2 py-1 text-xs ${selectedTags.includes(id) ? "bg-ink text-paper" : ""}`} onClick={() => change("tags", (selectedTags.includes(id) ? selectedTags.filter((tag) => tag !== id) : [...selectedTags, id]).join(","))}>{label}</button>)}</div>
    {error && <p role="status" className="my-3 text-sm text-sell">{error}</p>}
    {country && !countryRows[country] && !error && <p role="status">Loading companies…</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{columns.map(([key, label]) => <th key={key} aria-sort={sort === key ? direction === 1 ? "ascending" : "descending" : "none"} className="border-b border-ink/20 p-3"><button type="button" onClick={() => sortBy(key)}>{label}</button></th>)}<th className="border-b border-ink/20 p-3">Quality tests</th></tr></thead>
      <tbody>{displayed.slice(0, limit).map(({ row, mos, quote }) => <tr key={row.id} className={`border-b border-ink/15 ${row.st === "i" ? "opacity-40" : ""}`}>
        <td className="p-3"><a className="underline decoration-ink/30 underline-offset-4" href={`/value/${encodeURIComponent(row.id.toLowerCase())}`}>{row.n}</a><div className="mt-1 text-xs text-ink/60">{row.id}{row.st === "i" && " · Insufficient data"}</div></td>
        <td className="p-3">{row.c}</td><td className="p-3">{row.mc === null ? "Not available" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" }).format(row.mc)}</td>
        <td className="p-3">{mos == null ? quote === null ? "no price" : "Not valued" : `${(mos * 100).toFixed(1)}%`}</td><td className="p-3">{row.h}</td>
        <td className="p-3"><div className="flex gap-2">{QUALITY_TESTS.map((key, i) => <span key={key} title={`${testLabels[key]}: ${results[row.t[i]] ?? "unclear"}`} className={resultColors[results[row.t[i]] ?? "unclear"]} aria-label={`${testLabels[key]}: ${results[row.t[i]] ?? "unclear"}`}>●</span>)}</div></td>
      </tr>)}</tbody></table></div>
    {!displayed.length && <p className="py-6 text-ink/60">No companies match these filters.</p>}
    {displayed.length > limit && <button type="button" className="mt-4 border border-ink/20 px-4 py-2" onClick={() => setLimit((current) => current + 200)}>Show more</button>}
  </div>;
}
