import { readdirSync } from 'node:fs';
import { corpusPath, readCorpusJson } from './corpus';
import type { SymbolRow } from './eodhd';
import type { Constituent } from './index-membership';
import { normalizedName } from './universe';
export type CachedListing = SymbolRow & { exchange: string };
export const constituentName=(name:string)=>normalizedName(name.replace(/\[[^\]]*\]/g,''));
/** Search every cached venue, without requesting any provider data. */
export function cachedListings() {
 const listings:CachedListing[]=[];
 let files:string[]=[];try{files=readdirSync(corpusPath('raw/eodhd/universe'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 for(const file of files.filter(f=>/^symbols-.+\.json$/.test(f))) {
  const exchange=file.slice(8,-5);
  for(const row of readCorpusJson<{data:SymbolRow[]}>(`raw/eodhd/universe/${file}`)?.data??[]) listings.push({...row,exchange});
 }
 const byTicker=new Map<string,CachedListing>(),byIsin=new Map<string,CachedListing[]>(),byName=new Map<string,CachedListing[]>();
 for(const row of listings){
  byTicker.set(`${row.Code}.${row.exchange}`,row);
  if(row.Isin)byIsin.set(row.Isin,[...(byIsin.get(row.Isin)??[]),row]);
  const name=constituentName(row.Name);if(name)byName.set(name,[...(byName.get(name)??[]),row]);
 }
 return {listings,find(row:Constituent):CachedListing[]{
  const direct=byTicker.get(`${row.code}.${row.exchange}`);
  const sameSecurity=direct&&(Boolean(row.isin&&row.isin===direct.Isin)||constituentName(row.name)===constituentName(direct.Name));
  if(direct && (!row.isin || !direct.Isin || direct.Isin===row.isin)
    && (!/ETF|FUND/i.test(direct.Type??'')||sameSecurity))return [direct];
  const isin=row.isin?byIsin.get(row.isin):undefined;if(isin?.length)return isin;
  const names=(byName.get(constituentName(row.name))??[]).filter(r=>/Common Stock|Preferred Stock|FUND|ETF|Unit/i.test(r.Type??''));
  // Homonyms on different securities must be reviewed, never guessed.
  if(new Set(names.map(r=>r.Isin).filter(Boolean)).size>1)return [];
  return names.sort((a,b)=>Number(b.exchange===row.exchange)-Number(a.exchange===row.exchange)||Number(b.exchange==='US')-Number(a.exchange==='US'));
 }};
}
