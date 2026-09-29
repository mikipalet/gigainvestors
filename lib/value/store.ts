import { readFile } from "node:fs/promises";
import path from "node:path";
import { shardOf } from "./shard";
import type { Dossier, Id, IndexRow, PriceMap, StoreMeta } from "./types";

export async function readStore<T>(file: string, revalidate = 86400): Promise<T | null> {
  if (!/^[a-zA-Z0-9_/-]+\.json$/.test(file) || file.split("/").includes("..") || file.startsWith("/")) {
    throw new Error("Invalid value store path");
  }
  if (process.env.VALUE_STORE_DIR) {
    try {
      return JSON.parse(await readFile(path.join(process.env.VALUE_STORE_DIR, file), "utf8")) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
  const response = await fetch(`https://raw.githubusercontent.com/mikipalet/gigainvestors-value-data/main/${file}`, {
    next: { revalidate }, signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Value store returned ${response.status}`);
  return await response.json() as T;
}

export const getMeta = () => readStore<StoreMeta>("meta.json");
export const getDefaultIndex = async () => await readStore<IndexRow[]>("index/default.json") ?? [];
export const getCountryIndex = async (cc: string) => await readStore<IndexRow[]>(`index/${cc.toUpperCase()}.json`) ?? [];
export async function getDossier(id: Id) {
  const key = id.toUpperCase();
  try {
    const shard = await readStore<Record<Id, Dossier>>(`dossiers/${shardOf(key)}.json`, 259200);
    return shard?.[key] ?? null;
  } catch { return null; }
}
// PriceMap quotes and IndexRow.v/cur are in the listing trading currency by contract.
// There is no currency metadata in price files; consumers trust this publishing invariant.
/** Preserve the optional third element so consumers can label derived quotes. */
export async function getPrice(id: Id, country: string): Promise<PriceMap[string] | null> {
  const prices = await readStore<PriceMap>(`prices/${country.toUpperCase()}.json`);
  const quote = prices?.[id.toUpperCase()];
  if (!Array.isArray(quote) || typeof quote[0] !== 'number' || !Number.isFinite(quote[0]) || quote[0] <= 0 || typeof quote[1] !== 'string') return null;
  return quote[2] === 'seed' ? [quote[0], quote[1], 'seed'] : [quote[0], quote[1]];
}

export async function getTopIds(): Promise<Id[]> {
  try { return await readStore<Id[]>("top.json") ?? []; }
  catch { return []; }
}
