import type { PriceMap } from './types';
type Quote = PriceMap[string];
const record = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

export function seedPrice({ raw, fetchedAt, screener, reference }: { raw: unknown; fetchedAt: string; screener?: unknown; reference?: number }): Quote | null {
  const cached = record(screener);
  const date = typeof cached.last_day_data_date === 'string' ? cached.last_day_data_date : fetchedAt;
  const timestamp = Date.parse(date);
  if (!Number.isFinite(timestamp)) return null;
  if (positive(cached.adjusted_close)) return [cached.adjusted_close, new Date(timestamp).toISOString().slice(0, 10), 'seed'];
  const data = record(raw);
  const cap = record(data.Highlights).MarketCapitalization;
  const shares = record(data.SharesStats).SharesOutstanding;
  if (!positive(cap) || !positive(shares) || !positive(reference)) return null;
  const close = cap / shares;
  return positive(close) && close / reference >= 0.8 && close / reference <= 1.25
    ? [close, new Date(timestamp).toISOString().slice(0, 10), 'seed'] : null;
}
export function mergeSeed(existing: Quote | undefined, seed: Quote): Quote {
  // Local seeds are revalidated against the cache; replace legacy seeds even if newer.
  return existing && existing[2] !== 'seed' ? existing : seed;
}
