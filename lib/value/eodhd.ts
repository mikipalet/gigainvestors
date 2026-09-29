import { EodhdBudgetError, reserveEodhd, syncBudget } from "./budget";
import { T } from "./config";
import { createLimiter, fetchWithRetry } from "./http";

export interface Exchange {
  Code: string;
  Name: string;
  Country: string;
  CountryISO2: string;
  Currency: string;
}

export interface SymbolRow {
  Code: string;
  Name: string;
  Country: string;
  Exchange: string;
  Currency: string;
  Type: string;
  Isin: string | null;
}

export interface ScreenerRow {
  code: string;
  exchange: string;
  market_capitalization: number | null;
  sector: string | null;
  industry: string | null;
  avgvol_200d?: number | null;
  avgvol_1d?: number | null;
}

const limit = createLimiter({ perSecond: T.eodhd.perSecond });

export async function eodhd<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.EODHD_API_KEY;
  if (!key) throw new Error("EODHD_API_KEY is required");
  const url = new URL(path.replace(/^\//, ""), "https://eodhd.com/api/");
  if (url.origin !== "https://eodhd.com" || !url.pathname.startsWith("/api/")) {
    throw new Error("Invalid EODHD path");
  }
  url.search = new URLSearchParams({ ...params, api_token: key, fmt: "json" }).toString();
  return limit(async () => {
    let response: Response;
    try {
      response = await fetchWithRetry(url.toString(), { signal: AbortSignal.timeout(T.eodhd.timeoutMs), beforeAttempt: () => reserveEodhd({ endpoint: path.replace(/^\//, ""), monthly: params.period === "m" }) });
    } catch (error) {
      if (error instanceof EodhdBudgetError) throw error;
      throw new Error("EODHD request failed");
    }
    if (!response.ok) throw new Error(`EODHD HTTP ${response.status}`);
    try {
      return await response.json() as T;
    } catch {
      throw new Error("Invalid EODHD JSON response");
    }
  });
}

export const listExchanges = () => eodhd<Exchange[]>("exchanges-list");
export const listSymbols = (exchange: string) => eodhd<SymbolRow[]>(`exchange-symbol-list/${encodeURIComponent(exchange)}`);
export const getFundamentals = (ticker: string): Promise<unknown> => eodhd(`fundamentals/${encodeURIComponent(ticker)}`);
export const bulkLastDay = (exchange: string): Promise<unknown> => eodhd(`eod-bulk-last-day/${encodeURIComponent(exchange)}`);

export async function screenerPage({ offset, exchange }: { offset: number; exchange?: string }): Promise<ScreenerRow[]> {
  const result = await eodhd<{ data: ScreenerRow[] }>("screener", {
    sort: "market_capitalization.desc", limit: String(T.eodhd.screenerPageSize), offset: String(offset),
    ...(exchange ? { filters: JSON.stringify([["exchange", "=", exchange]]) } : {}),
  });
  if (!Array.isArray(result.data)) throw new Error("Invalid EODHD screener response");
  return result.data;
}

export async function callsUsedToday(): Promise<number> {
  const result = await eodhd<{ apiRequests: number }>("user");
  if (!Number.isFinite(result.apiRequests) || result.apiRequests < 0) throw new Error("Invalid EODHD usage counter");
  return syncBudget(result.apiRequests);
}
