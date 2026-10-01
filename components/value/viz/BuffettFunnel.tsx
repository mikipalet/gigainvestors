'use client';
import type { FunnelCounts } from '@/lib/value/types';
export const gateLabels = ['Analysed', 'Understandable', 'Moat', 'Economics', 'Management', 'Accounting', 'At buy price'];
export function BuffettFunnel({ counts, onlyFailures, selected, onSelect, date, gates }: { counts: number[]; onlyFailures: number[]; selected: number | null; onSelect: (gate: number) => void; date?: string | null; analysed?: number; gates?: FunnelCounts['gates'] }) {
  return <figure className="funnel"><div role="group" aria-label="Filter by cumulative gate">{counts.map((count,i)=>{
    const gate=gates?.[i-1], fail=gate?.fail;
    const width=(n:number)=>Math.log1p(n)/Math.log1p(counts[0]||1)*100;
    return <button type="button" key={i} aria-pressed={selected===i} aria-label={`${gateLabels[i]}: ${count}. ${fail??0} fail. Fails only this quality test: ${onlyFailures[i]??0}`} title={`Passes the other quality tests; fails only this test: ${onlyFailures[i]??0}`} onClick={()=>onSelect(i)}><span>{gateLabels[i]}</span><strong>{count.toLocaleString('en-US')}</strong><div className="funnel-drop">{!!fail&&<small>{fail.toLocaleString('en-US')} fail</small>}</div><i style={{width:`${width(count)}%`}}/></button>;
  })}</div></figure>;
}
