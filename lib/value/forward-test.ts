import { companyName } from './presentation';
import type { IndexRow, PriceMap } from './types';

/** Method 3.8.0 forward test: the Buy list frozen once at its first publication,
 * bought once at equal weight and held forever (no rebalancing unless the owner
 * asks; any later list is a new dated file). Scored against SPY and EFA. */
export interface ForwardTestCompany {
  id: string; ticker: string; name: string; western: boolean;
  price: number; currency: string; priceDate: string; seed: boolean;
  centralValue: number; priceToValue: number; methodVersion: string;
}
export interface ForwardTestSnapshot {
  version: 1; date: string; methodVersion: string;
  rule: string; weighting: 'equal'; rebalancing: 'none';
  /** publishCommit: the data archive this list was published as (null when frozen from a local
   * candidate); baselineCommit: the live archive the candidate was computed from. */
  archive: { publishCommit: string | null; publishedAsOf: string | null; baselineCommit?: string | null };
  benchmarks: string[];
  companies: ForwardTestCompany[];
}
export const FORWARD_TEST_RULE = 'Buy every company that passes the quality tests (moat, economics, management, accounting, profit record) and trades at or below the central value; equal money; hold forever.';
export const FORWARD_BENCHMARKS = ['SPY', 'EFA'];
const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** Exactly the published Buy rows (b === true) with their published quote and central value. */
export function buyListSnapshot({ date, rows, prices, methodVersion, publishCommit, publishedAsOf, baselineCommit }: {
  date: string; rows: IndexRow[]; prices: PriceMap; methodVersion: string; publishCommit: string | null; publishedAsOf: string | null; baselineCommit?: string | null;
}): ForwardTestSnapshot {
  const companies = rows.filter(r => r.b === true).sort((a, b) => a.id.localeCompare(b.id)).map(r => {
    const quote = prices[r.id], mid = r.v?.[1];
    if (!quote || !positive(quote[0]) || !positive(mid)) throw new Error(`Forward test: published Buy ${r.id} lacks a quote or central value`);
    // A reviewed data-error freeze keeps an older published record (and its method); it is still a published Buy.
    if (!r.methodVersion) throw new Error(`Forward test: ${r.id} has no method version`);
    return { id: r.id, ticker: r.id.slice(0, r.id.lastIndexOf('.')), name: companyName(r), western: r.w != null,
      price: quote[0], currency: r.cur, priceDate: quote[1], seed: quote[2] === 'seed',
      centralValue: mid, priceToValue: Number((quote[0] / mid).toFixed(6)), methodVersion: r.methodVersion! };
  });
  if (!companies.length) throw new Error('Forward test: no published Buy rows');
  return { version: 1, date, methodVersion, rule: FORWARD_TEST_RULE, weighting: 'equal', rebalancing: 'none',
    archive: { publishCommit, publishedAsOf, ...(baselineCommit !== undefined ? { baselineCommit } : {}) }, benchmarks: FORWARD_BENCHMARKS, companies };
}

export type Series = Array<[date: string, close: number]>;
/** Last close on or before a date. */
export function closeOn(series: Series, date: string): [string, number] | null {
  let found: [string, number] | null = null;
  for (const point of series) if (point[0] <= date && positive(point[1]) && (!found || point[0] > found[0])) found = point;
  return found;
}

/** Equal-weight price return since the snapshot (bought once at the snapshot quote,
 * held; splits after the snapshot quote are applied), against the same-dated
 * benchmark price return. Companies without a newer quote count at their last
 * known quote and are listed; none are dropped. Price returns exclude dividends
 * on both sides. */
export function scoreForwardTest({ snapshot, prices, splitFactors = {}, benchmarks, asOf }: {
  snapshot: ForwardTestSnapshot; prices: PriceMap; splitFactors?: Record<string, number>; benchmarks: Record<string, Series>; asOf: string;
}) {
  const stale: string[] = [], held = snapshot.companies.map(c => {
    const quote = prices[c.id], fresh = quote && positive(quote[0]) && quote[1] >= c.priceDate && !(quote[2] === 'seed' && !c.seed);
    if (!fresh) stale.push(c.id);
    const price = fresh ? quote![0] * (splitFactors[c.id] ?? 1) : c.price;
    return { id: c.id, western: c.western, priceDate: fresh ? quote![1] : c.priceDate, return: price / c.price - 1 };
  });
  const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  const basket = (rows: typeof held) => mean(rows.map(r => r.return));
  // Each holding's benchmark leg spans the same dates as its own quotes, so a move between a frozen
  // quote date (e.g. Friday's close) and the snapshot date counts on both sides.
  const bench = Object.fromEntries(snapshot.benchmarks.map(symbol => {
    const series = benchmarks[symbol] ?? [];
    const legs = snapshot.companies.map((c, i) => {
      const start = closeOn(series, c.priceDate), end = closeOn(series, held[i].priceDate);
      return start && end && end[0] >= start[0] ? { start, end } : null;
    });
    if (!legs.length || legs.some(leg => !leg)) return [symbol, null];
    const valid = legs as Array<{ start: [string, number]; end: [string, number] }>;
    return [symbol, { start: valid.map(l => l.start[0]).sort()[0], end: valid.map(l => l.end[0]).sort().at(-1)!,
      return: mean(valid.map(l => l.end[1] / l.start[1] - 1))! }];
  }));
  const all = basket(held), western = basket(held.filter(r => r.western));
  return { asOf, snapshotDate: snapshot.date, methodVersion: snapshot.methodVersion, companies: held.length,
    westernCompanies: held.filter(r => r.western).length, basketReturn: all, westernBasketReturn: western, benchmarks: bench,
    vs: Object.fromEntries(Object.entries(bench).map(([symbol, b]) => [symbol, b && all !== null ? all - b.return : null])),
    staleQuotes: stale, best: [...held].sort((a, b) => b.return - a.return).slice(0, 3).map(r => r.id), worst: [...held].sort((a, b) => a.return - b.return).slice(0, 3).map(r => r.id) };
}

/** Append-only corrections to a frozen list (docs/value/forward-test/corrections.jsonl).
 * The frozen file is never edited. "remove": the name was a Buy only because of an
 * input error later confirmed against its filings; "keep": the input was wrong but
 * the corrected data still makes it a Buy at the frozen price. */
export interface ForwardTestCorrection {
  date: string; list: string; id: string; action: 'remove' | 'keep';
  reason: string; source: string; methodVersion: string;
}
export function parseCorrections(text: string): ForwardTestCorrection[] {
  return text.split('\n').filter(line => line.trim()).map((line, i) => {
    const c = JSON.parse(line) as ForwardTestCorrection;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date) || !c.list || !c.id || !['remove', 'keep'].includes(c.action) || !c.reason || !c.source)
      throw new Error(`Forward test corrections line ${i + 1} is incomplete`);
    return c;
  });
}
/** The corrected basket: the frozen list without names removed by a correction.
 * Every correction must name a company in that list. */
export function correctedSnapshot(snapshot: ForwardTestSnapshot, file: string, corrections: ForwardTestCorrection[]): { snapshot: ForwardTestSnapshot; removed: string[]; kept: string[] } {
  const own = corrections.filter(c => c.list === file), ids = new Set(snapshot.companies.map(c => c.id));
  const unknown = own.filter(c => !ids.has(c.id)).map(c => c.id);
  if (unknown.length) throw new Error(`Forward test corrections name companies outside ${file}: ${unknown.join(', ')}`);
  const removed = [...new Set(own.filter(c => c.action === 'remove').map(c => c.id))].sort();
  const kept = [...new Set(own.filter(c => c.action === 'keep').map(c => c.id))].sort();
  return { snapshot: { ...snapshot, companies: snapshot.companies.filter(c => !removed.includes(c.id)) }, removed, kept };
}
