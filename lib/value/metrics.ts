import { deriveYears } from './derive';
import { T } from "./config";
import type { NumericOutcome, Series, Year } from "./types";
export { ownerEarnings } from "./owner-earnings";

export const present = (xs: Array<number | null>): number[] => xs.filter((x): x is number => x !== null && Number.isFinite(x));
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: number[]): number | null => xs.length ? sum(xs) / xs.length : null;
export const clamp = (input: { value: number; min: number; max: number }) => Math.max(input.min, Math.min(input.max, input.value));
export const ratio = (a: number | null, b: number | null): number | null => a === null || b === null || b <= 0 ? null : a / b;
/** A single missing component is zero; two missing components remain unknown. */
export function goodwillAndIntangibles(y: Pick<Year, "goodwill" | "intangibles">): number | null {
  return y.goodwill === null && y.intangibles === null ? null : (y.goodwill ?? 0) + (y.intangibles ?? 0);
}
// Only infer zero for optional line items when the containing statement exists.
export function withZeroDefaults(years: Year[]): Year[] {
  return deriveYears(years);
}
export function last(years: Year[], n: number): Year[] {
  const sorted = [...years].sort((a, b) => a.fy - b.fy);
  const latest = sorted.at(-1);
  return latest ? sorted.filter(y => y.fy > latest.fy - n) : [];
}
export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
/** Pearson correlation of average ranks (Spearman rho), including tied observations. */
export function spearman(pairs: Array<[number, number]>): number | null {
  if (pairs.length < 2) return null;
  const ranks = (values: number[]) => {
    const ordered = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
    const result = new Array<number>(values.length);
    for (let start = 0; start < ordered.length;) {
      let end = start + 1;
      while (end < ordered.length && ordered[end].value === ordered[start].value) end++;
      for (let i = start; i < end; i++) result[ordered[i].index] = (start + end - 1) / 2;
      start = end;
    }
    return result;
  };
  const x = ranks(pairs.map(p => p[0])), y = ranks(pairs.map(p => p[1]));
  const center = (pairs.length - 1) / 2;
  const covariance = sum(x.map((rank, i) => (rank - center) * (y[i] - center)));
  const variance = Math.sqrt(sum(x.map(rank => (rank - center) ** 2)) * sum(y.map(rank => (rank - center) ** 2)));
  return variance === 0 ? null : covariance / variance;
}
export function cagr({ first, last, years }: { first: number | null; last: number | null; years: number }): number | null {
  return first === null || last === null || first <= 0 || last <= 0 || years <= 0 ? null : (last / first) ** (1 / years) - 1;
}
export function nopat(y: Year): number | null {
  if (y.operatingIncome === null) return null;
  const tax = ratio(y.taxExpense, y.preTaxIncome);
  return y.operatingIncome * (1 - clamp({ value: tax ?? 0.21, min: 0, max: 0.35 }));
}
export function investedCapital(y: Year): number | null {
  if ([y.equity,y.totalDebt,y.cash,y.goodwill].some(x=>x==null)) return null;
  // Keep operating intangibles in capital; exclude acquired goodwill as before.
  return y.equity!+y.totalDebt!+(y.debtIncludesLeases ? 0 : y.leaseLiabilities ?? 0)-y.cash!-y.goodwill!;
}
export function roic(y: Year): number | null {
  const capital = investedCapital(y);
  if (capital === null) return null;
  const profit = nopat(y);
  if (profit === null) return null;
  // Zero marks a failed return year; positive earnings need no invested capital.
  const fallback = y.equity! + y.totalDebt! + (y.debtIncludesLeases ? 0 : y.leaseLiabilities ?? 0);
  return capital <= 0 ? fallback > 0 ? profit / fallback : profit > 0 ? 1.000001 : 0 : profit / capital;
}
export function tangibleEquity(y: Year): number | null {
  const intangible = goodwillAndIntangibles(y);
  return y.equity === null || intangible === null ? null : y.equity - intangible;
}
export function roe(y: Year): number | null {
  const capital = tangibleEquity(y);
  if (capital === null || y.netIncome === null) return null;
  return capital <= 0 ? (y.equity ?? 0) > 0 ? y.netIncome / y.equity! : y.netIncome > 0 ? 1.000001 : 0 : y.netIncome / capital;
}
/** Financial valuation uses tangible book, with reported book for nonpositive tangible equity. */
export function financialBvps(y: Year): number | null {
  const tangible = tangibleEquity(y);
  return tangible === null ? null : tangible > 0 ? ratio(tangible, y.dilutedShares) : bvps(y);
}
export const grossMargin = (y: Year) => ratio(y.grossProfit, y.revenue);
export const opMargin = (y: Year) => ratio(y.operatingIncome, y.revenue);
export const bvps = (y: Year) => y.equity !== null && y.equity > 0 ? ratio(y.equity, y.dilutedShares) : null;
export const accruals = (y: Year) => y.netIncome === null || y.ocf === null ? null : ratio(y.netIncome - y.ocf, y.totalAssets);
export const nwc = (y: Year): number | null => {
  if (y.receivables !== null && y.inventory !== null && y.payables !== null) return y.receivables+y.inventory-y.payables;
  return y.currentAssets == null || y.cash == null || y.currentLiabilities == null || y.shortTermDebt == null ? null
    : y.currentAssets-y.cash-(y.currentLiabilities-y.shortTermDebt);
};

export function investment(year: Year, prev: Year): number | null {
  const current = nwc(year), prior = nwc(prev);
  return year.fy !== prev.fy + 1 || year.capex === null || year.da === null || current === null || prior === null
    ? null : year.capex - year.da + current - prior;
}
export function roiic(years: Year[]): number | null {
  const ys = last(years, 11);
  if (ys.length < 7 || ys.at(-1)!.fy - ys[0].fy !== ys.length - 1) return null;
  const first = nopat(ys[0]), end = nopat(ys.at(-1)!);
  if(first===null||end===null)return null;
  // More earnings while releasing capital passes; declining earnings do not.
  const incrementalReturn=(capital:number)=>capital===0&&end===first ? null : capital<=0 ? end>first ? 1.000001 : 0 : (end-first)/capital;
  const invested = ys.slice(1).map((y, i) => investment(y, ys[i]));
  if (invested.some(x=>x===null)) {
    const before=investedCapital(ys[0]), after=investedCapital(ys.at(-1)!);
    return before===null||after===null ? null : incrementalReturn(after-before);
  }
  return incrementalReturn(sum(present(invested)));
}
export function retainedTest(years: Year[]): { gain: number | null; retained: number | null; startFy: number | null; endFy: number | null } {
  const history = last(years, T.management.retainedMaxYears + 1);
  // A rolling 120-month cache rarely contains the baseline needed for ten full fiscal years.
  // Use the earliest priced baseline, without moving the latest endpoint or skipping earnings.
  const start = history.findIndex(y => y.marketCap !== null && Number.isFinite(y.marketCap) && y.marketCap > 0);
  const ys = start < 0 ? [] : history.slice(start);
  const unavailable = { gain: null, retained: null, startFy: null, endFy: null };
  if (ys.length < T.management.retainedMinYears + 1 || ys.some((y, i) => i > 0 && y.fy !== ys[i - 1].fy + 1)) return unavailable;
  const first = ys[0].marketCap, end = ys.at(-1)!.marketCap;
  if (end === null || !Number.isFinite(end) || end <= 0) return unavailable;
  const retained = ys.slice(1).map(y => y.retainedEarningsChange ?? (y.netIncome === null || y.dividendsPaid === null ? null : y.netIncome - y.dividendsPaid));
  return { gain: end - first!, retained: retained.some(x => x === null) ? null : sum(present(retained)), startFy: ys[0].fy, endFy: ys.at(-1)!.fy };
}
export function slope(series: Series): number | null {
  const points = series.filter((p): p is [number, number] => p[1] !== null && Number.isFinite(p[1]));
  if (points.length < 5) return null;
  const xMean = mean(points.map(p => p[0]))!, yMean = mean(points.map(p => p[1]))!;
  return ratio(sum(points.map(([x, y]) => (x - xMean) * (y - yMean))), sum(points.map(([x]) => (x - xMean) ** 2)));
}
export interface Check {
  pass: boolean | null;
  reason: string;
  data: string;
  decisive?: boolean;
  core?: boolean;
  pending?: boolean;
}

export function outcome({ key, metrics, series, checks, reasons = [], minFailures = 1 }: {
  key: NumericOutcome["key"];
  metrics: NumericOutcome["metrics"];
  series: NumericOutcome["series"];
  checks: Check[];
  reasons?: string[];
  minFailures?: number;
}): NumericOutcome {
  const available = checks.filter(c => c.pass !== null);
  const failed = available.filter(c => c.pass === false);
  const core = checks.filter(c => c.core);
  const coreMissing = core.some(c => c.pass === null);
  const numeric = coreMissing ? "unclear" : failed.some(c => c.decisive) || failed.length >= minFailures ? "fail"
    : core.length ? "pass" : checks.length > 0 && available.length / checks.length >= T.numeric.minAvailableFraction ? "pass" : "unclear";
  // Infinity participates in return statistics, but is never a display value.
  const display = (value: number | null) => value !== null && Number.isFinite(value) ? value : null;
  return { key, numeric,
    ...(numeric === "unclear" && checks.some(c => c.pass === null) && checks.filter(c => c.pass === null).every(c => c.pending) ? { pending: true } : {}),
    metrics: Object.fromEntries(Object.entries(metrics).map(([name, value]) => [name, display(value)])),
    series: Object.fromEntries(Object.entries(series).map(([name, points]) => [name, points.map(([fy, value]) => [fy, display(value)])])),
    reasons: [...reasons, ...checks.filter(c => c.pass === false || (c.core || !core.length) && c.pass === null).map(c => c.pass === null ? `not enough data for ${c.data}` : c.reason)] };
}
