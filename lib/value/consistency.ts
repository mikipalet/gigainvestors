import type { IndexRow, StoreMeta } from './types';
/** Runs while rendering/building the index. A published contradiction must not ship. */
export function assertIndexConsistency({meta,rows}:{meta:StoreMeta|null;rows:IndexRow[]}) {
  if (!meta?.funnel) return;
  const f=meta.funnel, counts=[f.analysed,...f.gates.map(g=>g.passing)];
  if (counts.some((n,i)=>!Number.isInteger(n)||n<0||(i>0&&n>counts[i-1]))) throw new Error('Value consistency: cumulative funnel is invalid');
  if (f.analysed!==(meta.counts.analysed??meta.counts.scored+meta.counts.insufficient)) throw new Error('Value consistency: analysis counts disagree');
  if (f.gates.find(g=>g.key==='accounting')?.passing!==rows.filter(r=>r.t==='PPPPP').length) throw new Error('Value consistency: headline, Accounting gate and default rows disagree');
}
