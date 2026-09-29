import { useEffect, useState } from 'react';
import { StatusGlyph } from '@/components/value/viz/StatusGlyph';
import { QUALITY_TESTS } from '@/lib/value/types';
import { testLabels } from '@/components/value/TestChips';
export type FilterState = Record<string, string>;
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
export function Filters({ filter, countries, sectors, tags, change }: { filter: FilterState; countries: string[]; sectors: string[]; tags: Record<string, string>; change: (key: string, value: string) => void }) {
  const [open, setOpen] = useState(true);
  useEffect(() => { const media = window.matchMedia('(min-width: 768px)'); const update = () => setOpen(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  const country = filter.country ?? '';
  const selectedTags = (filter.tags ?? '').split(',').filter(Boolean);
  return <details className="filter-panel" open={open} onToggle={e => setOpen(e.currentTarget.open)}><summary>Filters{Object.keys(filter).length ? ` (${Object.keys(filter).length})` : ''}</summary><div className="filter-controls">
    <div className="filter-primary"><label className="list-search"><span className="sr-only">Search in list</span><input aria-label="Search in list" placeholder="Search in list" value={filter.q ?? ''} onChange={e => change('q',e.target.value)}/></label>
      <label className="grid gap-1">Country<select aria-label="Country" value={country} onChange={(event) => { change("country", event.target.value); change("sector", ""); }} className="max-w-52 border border-ink/20 bg-paper p-2"><option value="">All countries</option>{countries.map((cc) => <option key={cc} value={cc}>{countryNames.of(cc)} ({cc})</option>)}</select></label>
      <label className="grid gap-1">Sector<select aria-label="Sector" value={filter.sector ?? ""} onChange={(event) => change("sector", event.target.value)} className="max-w-52 border border-ink/20 bg-paper p-2"><option value="">All sectors</option>{sectors.map((sector) => <option key={sector}>{sector}</option>)}</select></label>
      <label className="py-2"><input style={{ accentColor: "var(--ink)" }} type="checkbox" checked={filter.held === "1"} onChange={(event) => change("held", event.target.checked ? "1" : "")} /> Held by superinvestors</label>
      <label className="py-2"><input style={{ accentColor: "var(--ink)" }} type="checkbox" checked={filter.near === "1"} onChange={(event) => change("near", event.target.checked ? "1" : "")} /> Near misses</label>
    </div>
    <div className="test-filters">{QUALITY_TESTS.map((key, i) => <button key={key} type="button" aria-label={`${testLabels[key]}: ${filter[key] ?? "any"}`} title={`${testLabels[key]}: ${filter[key] ?? "any"}`} className="flex items-center gap-2 border border-ink/20 px-2 py-1 text-xs" onClick={() => change(key, !filter[key] ? "pass" : filter[key] === "pass" ? "fail" : "")}>{(filter[key] === "pass" || filter[key] === "fail") && <StatusGlyph result={filter[key]} label={`${testLabels[key]}: ${filter[key]}`} />}<span>{["U","M","E","Mg","A"][i]}</span></button>)}</div>
    <details className="signal-filter"><summary>Signals</summary><div>{Object.entries(tags).map(([id, label]) => <button key={id} type="button" aria-pressed={selectedTags.includes(id)} className={`border border-ink/20 px-2 py-1 text-xs ${selectedTags.includes(id) ? "bg-ink text-paper" : ""}`} onClick={() => change("tags", (selectedTags.includes(id) ? selectedTags.filter((tag) => tag !== id) : [...selectedTags, id]).join(","))}>{label}</button>)}</div></details></div></details>;
}
