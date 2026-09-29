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
  return years.map(y => ({
    ...y,
    ...(y.totalAssets !== null ? {
      goodwill: y.goodwill ?? 0, intangibles: y.intangibles ?? 0,
      inventory: y.inventory ?? 0, totalDebt: y.totalDebt ?? 0,
    } : {}),
    ...(y.ocf !== null ? {
      dividendsPaid: y.dividendsPaid ?? 0, buybacks: y.buybacks ?? 0,
      acquisitions: y.acquisitionsProxy ? y.acquisitions : y.acquisitions ?? 0, sbc: y.sbc ?? 0,
    } : {}),
  }));
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
export function cagr({ first, last, years }: { first: number | null; last: number | null; years: number }): number | null {
  return first === null || last === null || first <= 0 || last <= 0 || years <= 0 ? null : (last / first) ** (1 / years) - 1;
}
export function nopat(y: Year): number | null {
  if (y.operatingIncome === null) return null;
  const tax = ratio(y.taxExpense, y.preTaxIncome);
  return y.operatingIncome * (1 - clamp({ value: tax ?? 0.21, min: 0, max: 0.35 }));
}
export function roic(y: Year): number | null {
  if ([y.equity, y.totalDebt, y.cash, y.goodwill, y.intangibles].some(x => x === null)) return null;
  const capital = y.equity! + y.totalDebt! - y.cash! - y.goodwill! - y.intangibles!;
  const profit = nopat(y);
  if (profit === null) return null;
  // Zero marks a failed return year; positive earnings need no tangible capital.
  return capital <= 0 ? profit > 0 ? Infinity : 0 : profit / capital;
}
export function tangibleEquity(y: Year): number | null {
  const intangible = goodwillAndIntangibles(y);
  return y.equity === null || intangible === null ? null : y.equity - intangible;
}
export function roe(y: Year): number | null {
  const capital = tangibleEquity(y);
  if (capital === null || y.netIncome === null) return null;
  return capital <= 0 ? y.netIncome > 0 ? Infinity : 0 : y.netIncome / capital;
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
export const nwc = (y: Year) => y.receivables === null || y.inventory === null || y.payables === null ? null : y.receivables + y.inventory - y.payables;

export function investment(year: Year, prev: Year): number | null {
  const current = nwc(year), prior = nwc(prev);
  return year.fy !== prev.fy + 1 || year.capex === null || year.da === null || current === null || prior === null
    ? null : year.capex - year.da + current - prior;
}
export function roiic(years: Year[]): number | null {
  const ys = last(years, 11);
  if (ys.length !== 11 || ys[10].fy - ys[0].fy !== 10) return null;
  const first = nopat(ys[0]), end = nopat(ys[10]);
  const invested = ys.slice(1).map((y, i) => investment(y, ys[i]));
  return first === null || end === null || invested.some(x => x === null) ? null : ratio(end - first, sum(present(invested)));
}
export function retainedTest(years: Year[]): { gain: number | null; retained: number | null } {
  const ys = last(years, 11);
  if (ys.length !== 11 || ys.some((y, i) => i > 0 && y.fy !== ys[i - 1].fy + 1)) return { gain: null, retained: null };
  const first = ys[0].marketCap, end = ys[10].marketCap;
  const retained = ys.slice(1).map(y => y.netIncome === null || y.dividendsPaid === null ? null : y.netIncome - y.dividendsPaid);
  return { gain: first === null || end === null ? null : end - first, retained: retained.some(x => x === null) ? null : sum(present(retained)) };
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
  const numeric = failed.some(c => c.decisive) || failed.length >= minFailures ? "fail"
    : checks.length > 0 && available.length / checks.length >= T.numeric.minAvailableFraction ? "pass" : "unclear";
  // Infinity participates in return statistics, but is never a display value.
  const display = (value: number | null) => value !== null && Number.isFinite(value) ? value : null;
  return { key, numeric,
    metrics: Object.fromEntries(Object.entries(metrics).map(([name, value]) => [name, display(value)])),
    series: Object.fromEntries(Object.entries(series).map(([name, points]) => [name, points.map(([fy, value]) => [fy, display(value)])])),
    reasons: [...reasons, ...checks.filter(c => c.pass !== true).map(c => c.pass === null ? `not enough data for ${c.data}` : c.reason)] };
}
