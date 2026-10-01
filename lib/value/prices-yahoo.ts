import { yahooSymbol } from "./price-history";
import { createLimiter, fetchWithRetry } from "./http";
import type { Company } from "./types";

export function parseYahooPrice(raw: unknown, now = Date.now()): [number, string] {
  const chart = (raw as { chart?: { error?: unknown; result?: Array<{
    meta?: { regularMarketPrice?: unknown; regularMarketTime?: unknown; gmtoffset?: number;
      currentTradingPeriod?: { regular?: { start: number; end: number } } };
    timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> };
  }> } } | null)?.chart;
  const result = chart?.result?.[0];
  const meta = result?.meta;
  const close = meta?.regularMarketPrice;
  const time = meta?.regularMarketTime;
  if (chart?.error || typeof close !== "number" || !Number.isFinite(close) || close <= 0
    || typeof time !== "number" || !Number.isFinite(time) || time <= 0) {
    throw new Error("Invalid Yahoo chart quote");
  }
  const regular = meta?.currentTradingPeriod?.regular;
  const closes = result?.indicators?.quote?.[0]?.close;
  if (Array.isArray(result?.timestamp) && Array.isArray(closes)) {
    for (let i = result.timestamp.length - 1; i >= 0; i--) {
      const timestamp = result.timestamp[i], value = closes[i];
      if (!Number.isFinite(timestamp) || timestamp * 1000 > now
        || typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue;
      // The current daily candle is still intraday until the exchange session ends.
      if (regular && now < regular.end * 1000 && timestamp >= regular.start) continue;
      const date = new Date((timestamp + (meta?.gmtoffset ?? 0)) * 1000).toISOString().slice(0, 10);
      const marketDate = new Date((time + (meta?.gmtoffset ?? 0)) * 1000).toISOString().slice(0, 10);
      // The metadata quote preserves exchange precision; chart arrays can carry float32 noise.
      return [date === marketDate ? close : value, date];
    }
    throw new Error('No completed Yahoo daily close');
  }
  if (regular && now < regular.end * 1000 && time >= regular.start) throw new Error('Yahoo quote is intraday without a completed daily close');
  const date = new Date((time + (meta?.gmtoffset ?? 0)) * 1000);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid Yahoo market time");
  return [close, date.toISOString().slice(0, 10)];
}

const yahooLimit = createLimiter({ perSecond: 2 });
export async function yahooPrice(company: Company): Promise<[number, string]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(company))}?range=5d&interval=1d`;
  return yahooLimit(async () => {
    const response = await fetchWithRetry(url, {
      headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(60_000), retries: 0,
    });
    if (!response.ok) throw new Error(`Yahoo HTTP ${response.status} for ${company.id}`);
    return parseYahooPrice(await response.json());
  });
}
