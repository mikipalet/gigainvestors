import { VALUE_DATA_URL, validQuote } from './data-source';
import { dossierReturn } from './presentation';
import { readJsonFile } from '@/lib/blob';
import path from "node:path";
import { shardOf } from "./shard";
import type { Dossier, Id, IndexRow, PriceMap, StoreMeta } from "./types";

export async function readStore<T>(file: string, revalidate = 86400): Promise<T | null> {
  if (!/^[a-zA-Z0-9_&./-]+\.json$/.test(file) || file.split("/").includes("..") || file.startsWith("/")) {
    throw new Error("Invalid value store path");
  }
  if (process.env.VALUE_STORE_DIR) return readJsonFile<T>(path.join(process.env.VALUE_STORE_DIR,file), {missingOnly:true});
  const response = await fetch(`${VALUE_DATA_URL}${file}`, {
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
  return validQuote(quote);
}

export async function getTopIds(): Promise<Id[]> {
  try { return await readStore<Id[]>("top.json") ?? []; }
  catch { return []; }
}

/** Older snapshots lack return-state metadata; recover it from the same published dossier. */
export async function enrichRows(rows: IndexRow[]): Promise<IndexRow[]> {
  return Promise.all(rows.map(async row => {
    if (row.returnInfo) return row;
    const dossier = await getDossier(row.id);
    if (!dossier) return row;
    const info = dossierReturn(dossier);
    return {...row, returnInfo:{...info,sort:Number.isFinite(info.sort)?info.sort:info.sort>0?Number.MAX_VALUE:-Number.MAX_VALUE},fy:Math.max(...Object.values(dossier.tests).flatMap(t=>Object.values(t.series).flat().map(p=>p[0])))};
  }));
}

export async function getSearchCompany(id: string) {
  const { shardKeyFor } = await import('./search-shard');
  const manifest=await readStore<import('./search-shard').SearchManifest>('search/manifest.json');
  if (!manifest) return null;
  const key=shardKeyFor(id,manifest);
  if (!key) return null;
  const shard=await readStore<import('./types').SearchShard>(`search/${key}.json`);
  return shard?.rows.find(row=>row[0].toUpperCase()===id.toUpperCase())??null;
}
