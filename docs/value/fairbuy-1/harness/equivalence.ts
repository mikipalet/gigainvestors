/** fairbuy-1: the production 3.8.0 eligibility (lib/value/fair-buy.ts) reproduces best-1's
 * eligible sets on best-1's own panel: every quarter, both regions, same companies.
 * Input: best1_eligible.py output (best-1's harness imported unchanged, on bench-1's 3.7.1
 * frames and research-1's annual fundamentals). Usage: npx tsx equivalence.ts <in.json> <out.json> */
import fs from 'node:fs';
import { fairBuyEligible, profitRecord } from '../../../../lib/value/fair-buy';
import type { Year } from '../../../../lib/value/types';
type Row = { t: string | null; fy: number | null; financial: boolean; pm: number | null };
type Dump = { panels: Record<string, Record<string, string[]>>; buys: Record<string, Record<string, string[]>>; scopes: Record<string, Record<string, string[]>>; rows: Record<string, Record<string, Row>>; fundamentals: Record<string, Year[] | null> };
const [input, output] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(input, 'utf8')) as Dump;
const result: Record<string, { quarters: number; companyQuarters: number; eligible: number; identicalQuarters: number; onlyBest1: string[]; onlyProduction: string[]; buys: number; identicalBuyQuarters: number }> = {};
for (const [panel, quarters] of Object.entries(d.panels)) {
  const r = result[panel] = { quarters: 0, companyQuarters: 0, eligible: 0, identicalQuarters: 0, onlyBest1: [] as string[], onlyProduction: [] as string[], buys: 0, identicalBuyQuarters: 0 };
  for (const [q, expected] of Object.entries(quarters)) {
    r.quarters++;
    const want = new Set(expected), got = new Set<string>();
    for (const id of d.scopes[panel][q]) {
      const row = d.rows[q][id];
      r.companyQuarters++;
      if (row.fy === null || typeof row.t !== 'string') continue;
      const years = (d.fundamentals[id] ?? []).filter(y => y.fy <= row.fy!);
      if (fairBuyEligible(row.t, profitRecord({ years, kind: row.financial ? 'bank' : 'operating' }))) got.add(id);
    }
    // 3.8.0 Buy on the panel: eligible and price at or below central value (frame price/value in (0, 1]).
    const buys = [...got].filter(id => { const pm = d.rows[q][id].pm; return pm !== null && pm > 0 && pm <= 1; }).sort();
    r.buys += buys.length;
    if (JSON.stringify(buys) === JSON.stringify([...d.buys[panel][q]].sort())) r.identicalBuyQuarters++;
    r.eligible += want.size;
    const onlyB = [...want].filter(id => !got.has(id)), onlyP = [...got].filter(id => !want.has(id));
    if (!onlyB.length && !onlyP.length) r.identicalQuarters++;
    r.onlyBest1.push(...onlyB.map(id => `${q} ${id}`)); r.onlyProduction.push(...onlyP.map(id => `${q} ${id}`));
  }
}
const identical = Object.values(result).every(r => r.identicalQuarters === r.quarters && r.identicalBuyQuarters === r.quarters);
fs.writeFileSync(output, JSON.stringify({ identical, result }, null, 1) + '\n');
console.log(JSON.stringify({ identical, ...Object.fromEntries(Object.entries(result).map(([p, r]) => [p, `${r.identicalQuarters}/${r.quarters} quarters identical; ${r.companyQuarters} company-quarters; ${r.eligible} eligible; ${r.onlyBest1.length} only best-1; ${r.onlyProduction.length} only production; Buy sets ${r.identicalBuyQuarters}/${r.quarters} identical (${r.buys} company-quarters)`])) }));
