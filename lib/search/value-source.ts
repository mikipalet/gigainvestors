import { fetchValueData } from '@/lib/value/data-source';
import { shardKeyFor, type SearchManifest } from '@/lib/value/search-shard';
import { searchShard } from '@/lib/value/search';
import type { SearchShard, SearchRow, IndexRow, PriceMap } from '@/lib/value/types';
import { priceValue } from '@/lib/value/presentation';
export type ValueHit = {kind:'value'; row:SearchRow; title:string; sub:string; tests?:string; holders?:number; listings?:string[]; ratio?:number|null};
let manifest: Promise<SearchManifest> | undefined;
const shards = new Map<string,Promise<SearchShard>>();
const ready = new Map<string,SearchShard>();
let readyManifest: SearchManifest | undefined;
let initial: SearchShard = {rows:[],aliases:{}};
const details=new Map<string,Pick<ValueHit,'tests'|'holders'|'ratio'>>();
const hits=(rows:SearchRow[]):ValueHit[]=>rows.map(row=>({kind:'value',row,title:row[0],sub:`${row[1]} · ${row[2]}`,...details.get(row[0])}));
export function primeValueSearch(rows: Array<IndexRow & {quote?:PriceMap[string]|null}>) {
  for(const row of rows)details.set(row.id,{tests:row.t,holders:row.h,ratio:priceValue({price:row.quote?.[0]??null,mid:row.v?.[1]??null})});
  initial={rows:rows.map(r=>[r.id,r.n,r.c,'a',r.mc,r.w]),aliases:{}};
  rows.forEach((row,i)=>{for(const alias of [row.id,row.id.split('.')[0],row.nameLocal].filter(Boolean) as string[])(initial.aliases[alias]??=[]).push(i);});
  searchShard(initial,'\0',8);
}
export function cachedValueHits(query:string):ValueHit[] {
  if(!query.trim())return [];
  const key=readyManifest?shardKeyFor(query,readyManifest):'';
  return hits(searchShard(ready.get(key)??ready.get(`${query[0].toLowerCase()}_`)??initial,query,8));
}
export async function warmValueSearch() {
  const m=await (manifest??=fetchValueData<SearchManifest>('search/manifest.json').catch(e=>{manifest=undefined;throw e;}));
  readyManifest=m;
  // First-letter heads are bounded to 300 rows. They provide immediate in-memory
  // matches while the exact prefix leaf fills in less common companies.
  for(const first of 'abcdefghijklmnopqrstuvwxyz0123456789') {
    const key=`${first}_`;
    if(!shards.has(key))shards.set(key,fetchValueData<SearchShard>(`search/${key}.json`).then(data=>{ready.set(key,data);searchShard(data,'\0',8);return data;}).catch(e=>{shards.delete(key);throw e;}));
    await shards.get(key);
  }
}
export async function valueHits(query:string):Promise<ValueHit[]> {
  const m = await (manifest ??= fetchValueData<SearchManifest>('search/manifest.json').catch(e=>{manifest=undefined;throw e;}));
  readyManifest=m;
  const key=shardKeyFor(query,m);
  if (!key) return [];
  if (!shards.has(key)) shards.set(key,fetchValueData<SearchShard>(`search/${key}.json`).then(data=>{ready.set(key,data);return data;}).catch(e=>{shards.delete(key);throw e;}));
  return hits(searchShard(await shards.get(key)!,query,8));
}
