import type { Series } from './types';
export const dateLabel = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)) : 'Unavailable';
export const humanLabel = (value: string) => { const copy = value.replaceAll('_', ' '); return copy.charAt(0).toUpperCase() + copy.slice(1); };
export function priceValue({ price, mid }: { price: number | null; mid: number | null }) {
  return price !== null && mid !== null && price > 0 && mid > 0 && Number.isFinite(price / mid) ? price / mid : null;
}
export function seriesDomain(series: Series): [number, number] {
  const years = series.filter(p => p[1] !== null && Number.isFinite(p[1])).map(p => p[0]);
  return years.length ? [Math.min(...years), Math.max(...years)] : [0, 1];
}
export function shouldUseLogScale(series: Series) {
  const values = series.flatMap(p => p[1] === null ? [] : [p[1]]);
  return values.length > 1 && Math.min(...values) > 0 && Math.min(...values) / Math.max(...values) > .05;
}

export function validValueRange({ low, mid, high }: { low: number; mid: number; high: number }) {
  return [low, mid, high].every(Number.isFinite) && low <= mid && mid <= high;
}

export function earningsYieldAtMid(value: import('./types').Valuation) {
  return value.method === 'owner_earnings' && value.perShare.mid > 0 && value.shares > 0 ? value.normalized / (value.perShare.mid * value.shares) : null;
}
