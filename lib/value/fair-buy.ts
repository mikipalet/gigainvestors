import { ownerEarningsSeries } from './owner-earnings';
import type { Kind, Year } from './types';

/** Method 3.8.0 Buy eligibility. This is the rule the best-1 study tested
 * (docs/value/best-1/definition.md (a), harness best.py `eligible`), moved into
 * production so the live rule is the tested rule:
 *  - moat, economics, management and accounting tests pass (quality letters 2-5);
 *  - no recurring losses: over the last ten fiscal years at most two net losses
 *    (at least five observed) and, outside banks and insurers, a non-negative
 *    mean operating margin (at least five observed);
 *  - positive owner earnings: the mean owner earnings per diluted share over the
 *    last three fiscal years (at least two observed) is above zero. Banks and
 *    insurers use common net income (net income when absent).
 * Earnings resilience (letter 1, margin stability) is evidence, not a Buy gate.
 * Buy then also needs today's price at or below the central (mid) value. */
export const PROFIT_RECORD = { years: 10, minObserved: 5, maxLossYears: 2, ownerEarningsYears: 3, ownerEarningsMinObserved: 2 } as const;

export interface ProfitRecord {
  pass: boolean;
  /** Latest fiscal year of the window (best-1's valuation basis year F). */
  fy: number | null;
  lossYears: number;
  netIncomeYears: number;
  meanOperatingMargin: number | null;
  operatingMarginYears: number;
  ownerEarningsPerShare: number | null;
  reasons: string[];
}

const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
export const financialKind = (kind: Kind) => kind === 'bank' || kind === 'insurer';

/** Owner earnings per diluted share by fiscal year: the method's owner-earnings
 * bridge for operating companies, common net income for banks and insurers. */
function ownerEarningsPerShare(years: Year[], kind: Kind): Map<number, number> {
  const earnings = financialKind(kind)
    ? new Map(years.map(y => [y.fy, num(y.commonNetIncome) ? y.commonNetIncome : num(y.netIncome) ? y.netIncome : null] as const))
    : new Map(ownerEarningsSeries(years));
  const out = new Map<number, number>();
  for (const y of years) {
    const value = earnings.get(y.fy), shares = y.dilutedShares;
    if (num(value) && num(shares) && shares > 0) out.set(y.fy, value / shares);
  }
  return out;
}

/** The loss and owner-earnings parts of 3.8.0 eligibility, from the annual
 * statements the analysis used (fiscal years up to the latest one). */
export function profitRecord({ years, kind }: { years: readonly Year[]; kind: Kind }): ProfitRecord {
  const sorted = [...years].filter(y => num(y.fy)).sort((a, b) => a.fy - b.fy);
  const fy = sorted.at(-1)?.fy ?? null;
  const empty: ProfitRecord = { pass: false, fy, lossYears: 0, netIncomeYears: 0, meanOperatingMargin: null, operatingMarginYears: 0, ownerEarningsPerShare: null, reasons: ['No annual statements'] };
  if (fy === null) return empty;
  const window = sorted.filter(y => y.fy > fy - PROFIT_RECORD.years);
  const income = window.flatMap(y => num(y.netIncome) ? [y.netIncome] : []);
  const lossYears = income.filter(x => x < 0).length;
  const margins = window.flatMap(y => num(y.operatingIncome) && num(y.revenue) && y.revenue > 0 ? [y.operatingIncome / y.revenue] : []);
  const meanOperatingMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : null;
  const perShare = ownerEarningsPerShare(sorted, kind);
  const recent = [fy - 2, fy - 1, fy].flatMap(f => perShare.has(f) ? [perShare.get(f)!] : []);
  const ownerEarnings = recent.length >= PROFIT_RECORD.ownerEarningsMinObserved ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
  const reasons: string[] = [];
  if (income.length < PROFIT_RECORD.minObserved) reasons.push(`Net income observed in ${income.length} of the last ${PROFIT_RECORD.years} years; at least ${PROFIT_RECORD.minObserved} needed`);
  else if (lossYears > PROFIT_RECORD.maxLossYears) reasons.push(`${lossYears} loss years in the last ${PROFIT_RECORD.years}; at most ${PROFIT_RECORD.maxLossYears} allowed`);
  if (!financialKind(kind)) {
    if (margins.length < PROFIT_RECORD.minObserved) reasons.push(`Operating margin observed in ${margins.length} of the last ${PROFIT_RECORD.years} years; at least ${PROFIT_RECORD.minObserved} needed`);
    else if (meanOperatingMargin! < 0) reasons.push('Mean operating margin over the last ten years is negative');
  }
  if (ownerEarnings === null) reasons.push(`${financialKind(kind) ? 'Earnings' : 'Owner earnings'} per share unavailable for at least ${PROFIT_RECORD.ownerEarningsMinObserved} of the last ${PROFIT_RECORD.ownerEarningsYears} years`);
  else if (!(ownerEarnings > 0)) reasons.push(`Three-year average ${financialKind(kind) ? 'earnings' : 'owner earnings'} per share is not positive`);
  return { pass: !reasons.length, fy, lossYears, netIncomeYears: income.length, meanOperatingMargin, operatingMarginYears: margins.length, ownerEarningsPerShare: ownerEarnings, reasons };
}

/** Quality letters in QUALITY_TESTS order (understandable first). */
export function fairBuyEligible(t: string, record: Pick<ProfitRecord, 'pass'> | null | undefined): boolean {
  return t.length === 5 && t.slice(1) === 'PPPP' && record?.pass === true;
}

/** The five 3.8.0 quality gates in funnel order: moat, economics, management,
 * accounting, profit record. Legacy rows without a profit record keep their
 * published five-test code (earnings resilience first). */
export function gateCode(row: { t: string; pr?: string | null }): string {
  return row.pr ? `${row.t.slice(1)}${row.pr}` : row.t;
}
/** Passes the quality tests that Buy requires. */
export const qualityPass = (row: { t: string; pr?: string | null }) => gateCode(row) === 'PPPPP';
export const profitLetter = (record: ProfitRecord | null | undefined): 'P' | 'F' | 'U' => !record ? 'U' : record.pass ? 'P' : 'F';
