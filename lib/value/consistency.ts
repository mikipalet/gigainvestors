import type { IndexRow, StoreMeta } from './types';
/** Runs while rendering/building the index. A published contradiction must not ship. */
export function assertIndexConsistency({meta,rows}:{meta:StoreMeta|null;rows:IndexRow[]}) {
  if (!meta?.funnel) return;
  const f=meta.funnel, counts=[f.analysed,...f.gates.map(g=>g.passing)];
  if (counts.some((n,i)=>!Number.isInteger(n)||n<0||(i>0&&n>counts[i-1]))) throw new Error('Value consistency: cumulative funnel is invalid');
  if (f.analysed!==(meta.counts.analysed??meta.counts.scored+meta.counts.insufficient)) throw new Error('Value consistency: analysis counts disagree');
  if (f.gates.every(g=>g.fail !== undefined)) {
    f.gates.forEach((gate,i)=>{if (gate.pass !== undefined && gate.pass !== gate.passing) throw new Error('Value consistency: pass counts disagree');if (gate.passing + gate.fail! + (gate.checking??0) + (gate.unclear??0) !== counts[i]) throw new Error('Value consistency: gate partition disagrees');});
    if (rows.filter(r=>/^P*FP*$/.test(r.t)&&r.st==='s').length !== f.gates.filter(g=>g.key!=='price').reduce((n,g)=>n+g.failsOnlyThis,0)) throw new Error('Value consistency: near-miss list and funnel disagree');
  }
  if (rows.some(r=>r.b !== undefined) && f.gates.find(g=>g.key==='price')?.passing !== rows.filter(r=>r.b === true).length) throw new Error('Value consistency: price gate and published buy flags disagree');
  if (rows.some(r=>r.b === true && (r.t !== 'PPPPP' || r.st !== 's' || r.dataQualityFlags?.length))) throw new Error('Value consistency: invalid published buy flag');
  if (f.gates.find(g=>g.key==='accounting')?.passing!==rows.filter(r=>r.t==='PPPPP').length) throw new Error('Value consistency: headline, Accounting gate and default rows disagree');
}
