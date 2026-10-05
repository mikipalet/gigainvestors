import { validQuote } from './data-source';
import { dossierReturn } from './presentation';
import { readPublishedBytes } from './published-source';
import { shardOf } from "./shard";
import type { Dossier, Id, IndexRow, PriceMap, StoreMeta } from "./types";
import { publicAnalysis } from './public-analysis';

export async function readStore<T>(file: string, revalidate = 300): Promise<T | null> {
  const bytes = await readPublishedBytes(file, revalidate);
  return bytes === null ? null : JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export const getMeta = () => readStore<StoreMeta>("meta.json");
export const getDefaultIndex = async () => await readStore<IndexRow[]>("index/default.json") ?? [];
export const getCountryIndex = async (cc: string) => await readStore<IndexRow[]>(`index/${cc.toUpperCase()}.json`) ?? [];
/** Catalogues include neutral and multiple-failure dossiers too. */
export async function getAllAnalyzedIndex():Promise<IndexRow[]>{
  const meta=await getMeta();
  const countries=Object.keys(meta?.funnel?.byCountry??{}).filter(cc=>/^[A-Z]{2}$/.test(cc)).sort();
  const rows=await Promise.all([getDefaultIndex(),...countries.map(getCountryIndex)]);
  return [...new Map(rows.flat().map(row=>[row.id,row])).values()];
}
async function withIssuerHolders(dossier:Dossier):Promise<Dossier>{
  const holders=await readStore<Record<string,Dossier['holders']>>('issuer-holders.json');
  return publicAnalysis(holders?.[dossier.id]?{...dossier,holders:holders[dossier.id]}:dossier);
}
export async function getDossier(id: Id) {
  const key = id.toUpperCase();
  try {
    const shard = await readStore<Record<Id, Dossier>>(`dossiers/${shardOf(key)}.json`, 259200);
    if(shard?.[key])return withIssuerHolders(shard[key]);
    const normalized=key.endsWith('.US')?key.slice(0,-3).replaceAll('.','-')+'.US':key;
    if(normalized!==key){
      const direct=await readStore<Record<Id,Dossier>>(`dossiers/${shardOf(normalized)}.json`,259200);
      if(direct?.[normalized])return withIssuerHolders(direct[normalized]);
    }
    const aliases=await readStore<Record<string,string>>('aliases.json');
    const target=aliases?.[normalized]??aliases?.[key];
    if(!target||target===key)return null;
    const resolved=await readStore<Record<Id,Dossier>>(`dossiers/${shardOf(target)}.json`,259200);
    return resolved?.[target]?withIssuerHolders(resolved[target]):null;
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
    if (row.returnInfo && (!row.b || (row.exchange && row.ownerReturnInputs))) return row;
    const dossier = await getDossier(row.id);
    if (!dossier) return row;
    const info = dossierReturn(dossier);
    return {...row, ownerReturnInputs:dossier.valuation?{valuation:dossier.valuation,marketCapUsd:dossier.company.marketCapUsd}:undefined, exchange:dossier.company.exchange, returnInfo:{...info,sort:Number.isFinite(info.sort)?info.sort:info.sort>0?Number.MAX_VALUE:-Number.MAX_VALUE},fy:Math.max(...Object.values(dossier.tests).flatMap(t=>Object.values(t.series).flat().map(p=>p[0])))};
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

/** Recompute from the immutable observations, never from today's membership or quotes. */
export async function getForwardRecord() {
  const { computeForwardRecord, validForwardDate } = await import('./forward');
  const manifest = await readStore<{dates:string[]}>('forward/index.json');
  const snapshots = await Promise.all((manifest?.dates??[]).map(async date => {
    if (!validForwardDate(date)) throw new Error('Invalid forward record date');
    const snapshot = await readStore<import('./forward').ForwardSnapshot>(`forward/${date}.json`);
    if (!snapshot || snapshot.date !== date) throw new Error(`Missing or mismatched forward record ${date}`);
    return snapshot;
  }));
  return computeForwardRecord(snapshots);
}

/** All routed listing tickers contribute their 13F history to the issuer page. */
export async function getCompanyStock(dossier:Dossier){
 const [{getStock},{mergeListingHoldings},aliases]=await Promise.all([import('../data'),import('./company-holders'),readStore<Record<string,string>>('aliases.json')]);
 const ids=[dossier.id,...Object.entries(aliases??{}).filter(([,id])=>id===dossier.id).map(([id])=>id)];
 const tickers=[...new Set(ids.filter(id=>id.endsWith('.US')).map(id=>id.slice(0,-3).replaceAll('-','.')))];
 return mergeListingHoldings(dossier.id,dossier.company.name,await Promise.all(tickers.map(getStock)));
}
