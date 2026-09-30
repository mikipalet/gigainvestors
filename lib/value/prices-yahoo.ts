import { yahooSymbol } from "./price-history";
import { createLimiter, fetchWithRetry } from "./http";
import type { Company } from "./types";

export function parseYahooPrice(raw: unknown): [number, string] {
  const chart = (raw as { chart?: { error?: unknown; result?: Array<{ meta?: { regularMarketPrice?: unknown; regularMarketTime?: unknown; gmtoffset?: number } }> } } | null)?.chart;
  const meta = chart?.result?.[0]?.meta;
  const close = meta?.regularMarketPrice;
  const time = meta?.regularMarketTime;
  if (chart?.error || typeof close !== "number" || !Number.isFinite(close) || close <= 0
    || typeof time !== "number" || !Number.isFinite(time) || time <= 0) {
    throw new Error("Invalid Yahoo chart quote");
  }
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
