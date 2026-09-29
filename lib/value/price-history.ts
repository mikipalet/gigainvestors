import { eodhd } from "./eodhd";
import { createLimiter, fetchWithRetry } from "./http";
import type { Company, PriceHistory } from "./types";

export interface CachedPriceHistory { fetchedAt: string; prices: PriceHistory }

function monthlyCloses(rows: Array<{ date: unknown; close: unknown }>): PriceHistory {
  const months = new Map<string, { date: string; close: number }>();
  for (const { date, close } of rows) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))
      || new Date(date).toISOString().slice(0, 10) !== date || typeof close !== "number" || !Number.isFinite(close) || close <= 0) continue;
    const month = date.slice(0, 7);
    if (!months.has(month) || months.get(month)!.date <= date) months.set(month, { date, close });
  }
  return [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, { close }]) => [month, close]);
}

export function parseEodHistory(raw: unknown): PriceHistory {
  if (!Array.isArray(raw)) throw new Error("Invalid EODHD price history");
  return monthlyCloses(raw.filter((row): row is { date: unknown; close: unknown } => row !== null && typeof row === "object"));
}

export function parseYahooHistory(raw: unknown): PriceHistory {
  const chart = (raw as { chart?: { error?: unknown; result?: Array<{
    timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> };
  }> } } | null)?.chart;
  const result = chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close;
  if (chart?.error || !Array.isArray(result?.timestamp) || !Array.isArray(closes)) throw new Error("Invalid Yahoo price history");
  return monthlyCloses(result.timestamp.map((time, i) => {
    // Tokyo's midnight month boundary is still the previous day in UTC.
    const date = typeof time === "number" && Number.isFinite(time) ? new Date(time * 1000 + 9 * 3600 * 1000) : null;
    return { date: date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null, close: closes[i] };
  }));
}

const yahooLimit = createLimiter({ perSecond: 2 });
export async function fetchPriceHistory({ company, from }: { company: Company; from: string }): Promise<PriceHistory> {
  if (!company.id.endsWith(".JP")) return parseEodHistory(await eodhd(`eod/${encodeURIComponent(company.id)}`, { period: "m", from }));
  return yahooLimit(async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(company.code)}.T?range=10y&interval=1mo`;
    const response = await fetchWithRetry(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(60_000), retries: 0 });
    if (!response.ok) throw new Error(`Yahoo price history HTTP ${response.status}`);
    return parseYahooHistory(await response.json());
  });
}
