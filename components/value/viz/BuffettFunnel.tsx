'use client';
import { dateLabel } from '@/lib/value/presentation';
import type { FunnelCounts } from '@/lib/value/types';
export const gateLabels = ['Analysed', 'Understandable', 'Moat', 'Economics', 'Management', 'Accounting', 'At buy price'];
export function BuffettFunnel({ counts, onlyFailures, selected, onSelect, date, gates }: { counts: number[]; onlyFailures: number[]; selected: number | null; onSelect: (gate: number) => void; date?: string | null; analysed?: number; gates?: FunnelCounts['gates'] }) {
  const checking = gates?.reduce((n,g)=>n+(g.checking??0),0)??0;
  const time=date&&Number.isFinite(Date.parse(date))?new Date(date).toISOString().slice(11,16):'—';
  return <figure className="funnel">{checking>0&&<figcaption>{counts[0].toLocaleString('en-US')} analysed · price history for {checking} companies still arriving · updated {dateLabel(date)}, {time} UTC</figcaption>}<div role="group" aria-label="Filter by cumulative gate">{counts.map((count,i)=>{
    const gate=gates?.[i-1], fail=gate?.fail, pending=gate?.checking??0, unclear=gate?.unclear??0;
    const width=(n:number)=>Math.log1p(n)/Math.log1p(counts[0]||1)*100;
    return <button type="button" key={i} aria-pressed={selected===i} aria-label={`${gateLabels[i]}: ${count}. ${fail??0} fail, ${pending} unavailable, ${unclear.toLocaleString('en-US')} unclear. Fails only this quality test: ${onlyFailures[i]??0}`} title={`Passes the other quality tests; fails only this test: ${onlyFailures[i]??0}`} onClick={()=>onSelect(i)}><span>{gateLabels[i]}</span><strong>{count.toLocaleString('en-US')}</strong><div className="funnel-drop">{!!fail&&<small>{fail.toLocaleString('en-US')} fail</small>}{pending>0&&<small className="checking">{pending} unavailable</small>}{unclear>0&&<small className="checking">{unclear.toLocaleString('en-US')} unclear</small>}{i>0&&fail===undefined&&counts[i-1]>count&&<small className="checking">{counts[i-1]-count} not passed</small>}</div>{pending>0&&<i className="pending-bar" style={{left:`${width(count)}%`,width:`max(2px, ${pending/(count+pending)*width(count+pending)}%)`}}/>}<i style={{width:`${width(count)}%`}}/></button>;
  })}</div></figure>;
}
