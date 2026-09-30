import { bestWesternListing } from '@/lib/value/western';
import { fetchValueData } from '@/lib/value/data-source';
import { shardKeyFor, type SearchManifest } from '@/lib/value/search-shard';
import { searchShard } from '@/lib/value/search';
import type { SearchShard, SearchRow, Dossier, PriceMap } from '@/lib/value/types';
import { shardOf } from '@/lib/value/shard';
import { comparableValuation } from '@/lib/value/site-valuation';
import { priceValue } from '@/lib/value/presentation';
export type ValueHit = {kind:'value'; row:SearchRow; title:string; sub:string; tests?:string; holders?:number; listings?:string[]; ratio?:number|null};
let manifest: Promise<SearchManifest> | undefined;
const shards = new Map<string,Promise<SearchShard>>();
const dossiers = new Map<string,Promise<Record<string,Dossier>>>();
const prices = new Map<string,Promise<PriceMap>>();
export async function valueHits(query:string):Promise<ValueHit[]> {
  const m = await (manifest ??= fetchValueData<SearchManifest>('search/manifest.json').catch(e=>{manifest=undefined;throw e;}));
  const key=shardKeyFor(query,m);
  if (!key) return [];
  if (!shards.has(key)) shards.set(key,fetchValueData<SearchShard>(`search/${key}.json`).catch(e=>{shards.delete(key);throw e;}));
  return searchShard(await shards.get(key)!,query,8).map(row=>({kind:'value',row,title:row[0],sub:`${row[1]} · ${row[2]}`}));
}
export async function valueHitDetails(hit:ValueHit):Promise<ValueHit> {
  if (hit.row[3]!=='a') return hit;
  const shard=shardOf(hit.row[0]), country=hit.row[2];
  if (!dossiers.has(shard)) dossiers.set(shard,fetchValueData<Record<string,Dossier>>(`dossiers/${shard}.json`));
  if (!prices.has(country)) prices.set(country,fetchValueData<PriceMap>(`prices/${country}.json`));
  const [records,quotes]=await Promise.all([dossiers.get(shard)!,prices.get(country)!]);
  const d=records[hit.row[0]];
  if (!d) return hit;
  return {...hit,row:[hit.row[0],hit.row[1],hit.row[2],hit.row[3],hit.row[4],d.w===undefined?bestWesternListing(d.company):d.w],holders:d.holders.length,listings:d.company.listings,tests:['understandable','moat','economics','management','accounting'].map(k=>d.tests[k as 'moat'].pending && d.tests[k as 'moat'].result==='unclear' ? 'C' : d.tests[k as 'moat'].result[0].toUpperCase()).join(''),ratio:priceValue({price:quotes[hit.row[0]]?.[0]??null,mid:comparableValuation(d.valuation,d.company.currency)?.perShare.mid??null})};
}
