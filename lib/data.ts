import { head } from "@vercel/blob";
import type { Index, InvestorData, SearchIndex, StockData, StockShard } from "./types";

async function readCached<T>(key: string): Promise<T | null> {
  try {
    const meta = await head(key);
    const res = await fetch(meta.url, { next: { revalidate: 86400, tags: ["blob"] } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getIndex = () => readCached<Index>("index.json");
export const getInvestor = (code: string) => readCached<InvestorData>(`investors/${code}.json`);
export const getSearchIndex = () => readCached<SearchIndex>("search.json");

const shardOf = (ticker: string) => {
  const c = ticker[0]?.toUpperCase() ?? "0";
  return /[A-Z]/.test(c) ? c : "0";
};

export async function getStock(ticker: string): Promise<StockData | null> {
  const shard = await readCached<StockShard>(`stocks/${shardOf(ticker)}.json`);
  return shard?.[ticker] ?? null;
}
