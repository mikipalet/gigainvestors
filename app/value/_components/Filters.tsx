import { useEffect, useState } from 'react';
import { StatusGlyph } from '@/components/value/viz/StatusGlyph';
import { QUALITY_TESTS } from '@/lib/value/types';
import { testLabels } from '@/components/value/TestChips';
export type FilterState = Record<string, string>;
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
function Dropdown({label,value,options,onChange}:{label:string;value:string;options:Array<[string,string]>;onChange:(value:string)=>void}) {
 const [open,setOpen]=useState(false);
 return <div className="filter-dropdown" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}><button aria-label={label} aria-expanded={open} onClick={()=>setOpen(!open)}>{options.find(o=>o[0]===value)?.[1]??label}<span>⌄</span></button>{open&&<div className="filter-options" role="group" aria-label={label}>{options.map(([id,text])=><button key={id} aria-pressed={id===value} onClick={()=>{onChange(id);setOpen(false);}}>{text}</button>)}</div>}</div>;
}
export function Filters({ filter, countries, sectors, tags, change, nearCount, awaitingCount }: { filter: FilterState; countries: string[]; sectors: string[]; tags: Record<string, string>; change: (key: string, value: string) => void; nearCount:number; awaitingCount:number }) {
  const [open, setOpen] = useState(true);
  useEffect(() => { const media = window.matchMedia('(min-width: 768px)'); const update = () => setOpen(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  const selectedTags = (filter.tags ?? '').split(',').filter(Boolean);
  return <details className="filter-panel" open={open} onToggle={e => setOpen(e.currentTarget.open)}><summary>Filters</summary><div className="filter-controls">
    <div className="filter-primary">
      <Dropdown label="Country" value={filter.country??''} options={[["","All countries"],...countries.map(cc=>[cc,countryNames.of(cc)??cc] as [string,string])]} onChange={value=>{change('country',value);change('sector','');}}/>
      <Dropdown label="Sector" value={filter.sector??''} options={[["","All sectors"],...sectors.map(s=>[s,s] as [string,string])]} onChange={value=>change('sector',value)}/>
      {[['held','Held by superinvestors'],['near','Near misses'],['awaiting','Awaiting data']].map(([key,label])=><button key={key} type="button" className="filter-switch" role="switch" aria-checked={filter[key]==='1'} title={key==='near'?`${nearCount} fail exactly one quality test`:undefined} onClick={()=>{change(key,filter[key]==='1'?'':'1');if(key==='near')change('awaiting','');if(key==='awaiting')change('near','');}}><i/>{label}{key==='near'&&<small>{nearCount}</small>}{key==='awaiting'&&<small>{awaitingCount}</small>}</button>)}
    </div>
    <div className="test-filters" role="group" aria-label="Quality test filters">{QUALITY_TESTS.map((key, i) => <button key={key} type="button" aria-pressed={!!filter[key]} aria-label={`${testLabels[key]}: ${filter[key] ?? "any"}`} title={`${testLabels[key]}: ${filter[key] ?? "any"}`} onClick={() => change(key, !filter[key] ? "pass" : filter[key] === "pass" ? "fail" : "")}>{(filter[key] === "pass" || filter[key] === "fail") && <StatusGlyph result={filter[key]} label={`${testLabels[key]}: ${filter[key]}`} />}<span>{["U","M","E","Mg","A"][i]}</span></button>)}</div>
    <details className="signal-filter"><summary>Signals</summary><div>{Object.entries(tags).map(([id, label]) => <button key={id} type="button" aria-pressed={selectedTags.includes(id)} className={`border border-ink/20 px-2 py-1 text-xs ${selectedTags.includes(id) ? "bg-ink text-paper" : ""}`} onClick={() => change("tags", (selectedTags.includes(id) ? selectedTags.filter((tag) => tag !== id) : [...selectedTags, id]).join(","))}>{label}</button>)}</div></details></div></details>;
}
