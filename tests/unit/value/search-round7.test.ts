import { describe, expect, it } from 'vitest';
import { buildAdaptiveSearchShards, searchShard } from '@/lib/value/search';
import { shardKeyFor } from '@/lib/value/search-shard';
import type { Company } from '@/lib/value/types';
const company = {id:'8058.JP',name:'三菱商事株式会社',nameEn:'Mitsubishi Corporation',nameLocal:'三菱商事株式会社',code:'8058',exchange:'JP',country:'JP',listings:['8058.JP'],marketCapUsd:10,isin:null} as Company;
describe('round 7 local name search',()=>{
  it('routes a local-name prefix to a shard that displays the English name',()=>{
    const {shards,manifest}=buildAdaptiveSearchShards([company],new Set([company.id]));
    for (const query of ['三菱','Mitsubishi']) {
      const key=shardKeyFor(query,manifest); expect(key).not.toBe('');
      expect(searchShard(shards[key],query)[0]).toEqual(['8058.JP','Mitsubishi Corporation','JP','a',10]);
    }
  });
  it('keeps common local prefixes under the shard budget without dropping long-name matches',()=>{
    const companies=Array.from({length:900},(_,i)=>({...company,id:`${i}.JP`,code:String(i),listings:[`${i}.JP`],nameLocal:`株式会社三菱${i}製造`,marketCapUsd:i}));
    const {shards,manifest}=buildAdaptiveSearchShards(companies,new Set());
    const query='株式会社三菱501';
    expect(searchShard(shards[shardKeyFor(query,manifest)],query)[0]?.[0]).toBe('501.JP');
    expect(Object.entries(shards).every(([,s])=>Buffer.byteLength(JSON.stringify(s)+'\n')<=60000)).toBe(true);
  });
});
