import { readJson } from "./blob";
import type { Index, InvestorData, SearchIndex, StockData, StockShard } from "./types";

export const getIndex = () => readJson<Index>("index.json");
export const getInvestor = (code: string) => readJson<InvestorData>(`investors/${code}.json`);
export const getSearchIndex = () => readJson<SearchIndex>("search.json");
export const getHolderCounts = () => readJson<Record<string, number>>("holders.json");

const shardOf = (ticker: string) => {
  const c = ticker[0]?.toUpperCase() ?? "0";
  return /[A-Z]/.test(c) ? c : "0";
};

const SHARDS = ["0", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

export async function getAllStockTickers(): Promise<string[]> {
  const shards = await Promise.all(SHARDS.map((s) => readJson<StockShard>(`stocks/${s}.json`)));
  return shards.flatMap((shard) => Object.keys(shard ?? {}));
}

export async function getStock(ticker: string): Promise<StockData | null> {
  const shard = await readJson<StockShard>(`stocks/${shardOf(ticker)}.json`);
  return shard?.[ticker] ?? shard?.[`${ticker}-OLD`] ?? null;
}
