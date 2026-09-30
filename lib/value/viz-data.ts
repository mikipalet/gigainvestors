import { readStore } from './store';
import { shardOf } from './shard';
import { ownerReturn } from './owner-return';
import type { Dossier, IndexRow, PriceMap } from './types';

/** Compact display metrics for the lab; never send whole dossiers to the index. */
export async function visualizationReturns(rows:IndexRow[]):Promise<Record<string,number|null>> {
 const quality=rows.filter(r=>r.t==='PPPPP');
 const countries=[...new Set(quality.map(r=>r.c))];
 const prices=new Map(await Promise.all(countries.map(async cc=>[cc,await readStore<PriceMap>(`prices/${cc}.json`)] as const)));
 const shards=[...new Set(quality.map(r=>shardOf(r.id)))];
 const results:Record<string,number|null>={};
 // Bound simultaneous reads of large dossier shards.
 for(let i=0;i<shards.length;i+=8)await Promise.all(shards.slice(i,i+8).map(async shard=>{
  const dossiers=await readStore<Record<string,Dossier>>(`dossiers/${shard}.json`);
  for(const row of quality.filter(r=>shardOf(r.id)===shard)){
   const d=dossiers?.[row.id];
   results[row.id]=d?ownerReturn(d.valuation,d.company.currency,d.company.marketCapUsd,prices.get(row.c)?.[row.id]?.[0]??null)?.expected??null:null;
  }
 }));
 return results;
}
