import { retainCompletionHistory } from './completeness/retain-history';
import { createHash } from 'node:crypto';
import { deriveYears } from './derive';
import type { Fundamentals, Year } from './types';

/** A vendor omission is not a restatement. Keep prior facts on the same dated,
 * same-currency period, with a content-addressed copy of the pre-refresh record.
 * Explicit reported values (including zero) always win. */
export function retainRefreshFacts(incoming: Fundamentals, prior: Fundamentals | null): {
  fundamentals: Fundamentals; snapshot?: { path: string; value: Fundamentals };
} {
  if (!prior?.years?.some(y => y.end)) return { fundamentals: incoming };
  if (incoming.id !== prior.id) throw new Error('Refresh company identity changed');
  if (incoming.currency && prior.currency && incoming.currency !== prior.currency)
    throw new Error('Refresh reporting currency changed; requires verified translation');
  const snapshot = `fundamentals-history/${incoming.id}/${createHash('sha256').update(JSON.stringify(prior)).digest('hex')}.json`;
  let retained = false;
  const stamp = (y: Year, field: string) => {
    retained = true;
    return { ...(y.provenance?.[field] ?? { source: `${snapshot}#${y.end}`, field, method: 'cached' as const }),
      retainedFrom: y.provenance?.[field]?.retainedFrom ?? { snapshot, fetchedAt: prior.fetchedAt } };
  };
  const years = incoming.years.map(y => ({ ...y, provenance: { ...y.provenance } }));
  for (const old of prior.years) {
    if (!old.end) continue;
    const nearby = years.filter(y => y.fy === old.fy && Math.abs(Date.parse(y.end)-Date.parse(old.end)) <= 7*86400000
      && (y.currency || incoming.currency) === (old.currency || prior.currency)
      && (['netIncome','revenue','totalAssets'] as const).some(k => old[k] != null && old[k] !== 0 && old[k] === y[k]));
    const fresh = years.find(y => y.end === old.end) ?? (nearby.length === 1 ? nearby[0] : undefined);
    if (fresh && (fresh.currency || incoming.currency) && (old.currency || prior.currency)
      && (fresh.currency || incoming.currency) !== (old.currency || prior.currency))
      throw new Error(`Refresh period currency changed: ${old.end}`);
    if (!fresh) {
      // A changed fiscal boundary cannot safely inherit another period's facts.
      if (years.some(y => y.fy === old.fy))
        throw new Error(`Refresh fiscal boundary changed: ${old.end}; requires period reconciliation`);
      const copy = { ...old, provenance: { ...old.provenance } };
      for (const [field, value] of Object.entries(old))
        if (typeof value === 'number' && Number.isFinite(value) && field !== 'fy') copy.provenance[field] = stamp(old, field);
      years.push(copy);
      retained = true;
      continue;
    }
    for (const [field, value] of Object.entries(old)) {
      if (typeof value !== 'number' || !Number.isFinite(value) || field === 'fy') continue;
      const current = fresh[field as keyof Year];
      if (current == null || fresh.provenance[field]?.method === 'absent-in-complete-statement') {
        Object.assign(fresh, { [field]: value });
        fresh.provenance[field] = stamp(old, field);
        // These describe the meaning of a retained value, not a fresh vendor default.
        const companions: Record<string, (keyof Year)[]> = {
          acquisitions: ['acquisitionsProxy'], totalDebt: ['debtIncludesLeases'], equity: ['equityFromNetAssets'],
          dilutedShares: ['edinetShares'], leaseCash: ['leaseCashIncomplete'],
          leaseLiabilities: ['leaseDepreciationIncluded'], sbc: ['sbcIncomplete'],
        };
        for (const key of companions[field] ?? []) Object.assign(fresh, { [key]: old[key] });
      }
    }
  }
  const splits = [...new Map([...(prior.splits ?? []), ...(incoming.splits ?? [])].map(s => [s.date, s])).values()].sort((a,b) => a.date.localeCompare(b.date));
  const coherent = retainCompletionHistory(prior.years, years, { ...incoming, splits });
  if (coherent !== years) {
    retained = true;
    for (const y of coherent) {
      const old = prior.years.find(p => p.end === y.end);
      const fresh = years.find(p => p.end === y.end);
      if (!old || y.dilutedShares === fresh?.dilutedShares) continue;
      for (const field of ['dilutedShares', 'dilutedEps', 'basicEps', 'sharesOutstanding', 'edinetShares'] as const)
        if (old[field] != null) { y.provenance ??= {}; y.provenance[field] = stamp(old, field); }
    }
  }
  return { fundamentals: { ...incoming, currency: incoming.currency || prior.currency,
    years: deriveYears(coherent),
    splits,
  }, ...(retained ? { snapshot: { path: snapshot, value: prior } } : {}) };
}
