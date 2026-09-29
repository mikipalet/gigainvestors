import type { PriceMap } from './types';
type Quote = PriceMap[string];
const record = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

export function seedPrice({ raw, fetchedAt }: { raw: unknown; fetchedAt: string }): Quote | null {
  const data = record(raw);
  const cap = record(data.Highlights).MarketCapitalization;
  const shares = record(data.SharesStats).SharesOutstanding;
  const timestamp = Date.parse(fetchedAt);
  if (!positive(cap) || !positive(shares) || !Number.isFinite(timestamp)) return null;
  const close = cap / shares;
  return positive(close) ? [close, new Date(timestamp).toISOString().slice(0, 10), 'seed'] : null;
}
export function mergeSeed(existing: Quote | undefined, seed: Quote): Quote {
  return existing && (existing[2] !== 'seed' || existing[1] >= seed[1]) ? existing : seed;
}
