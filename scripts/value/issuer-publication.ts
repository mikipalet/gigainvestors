import {adrUnderlyingIsins,cdiUnderlyingIsins} from '../../lib/value/universe-config';
import registry from '../../lib/value/issuer-registry.json';
import {applyIssuerAliases,chooseCanonical,issuerGroups,type IssuerIdentity} from '../../lib/value/issuer-identity';
import {readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {buildAdaptiveSearchShards} from '../../lib/value/search';
import {refreshPublishedSummaries} from './verdict-freeze';
import type {Dossier} from '../../lib/value/types';

export function reconcileIssuers(files:Record<string,any>,holdersByTicker:Record<string,string[]>,investorNames:Record<string,string>):void{
 const dossiers:Record<string,Dossier>=Object.assign({},...Object.entries(files).filter(([f])=>f.startsWith('dossiers/')).map(([,v])=>v));
 const frozen=new Set(readCorpusJson<{ids:string[]}>('verdict-freeze.json')?.ids??[]);
 const records:IssuerIdentity[]=Object.values(dossiers).map(d=>{
  const g=readCorpusJson<{General?:Record<string,any>}>(`raw/eodhd/${d.id}.json`)?.General??{};
  const isin=g.ISIN??d.company.isin;
  return {id:d.id,isin:adrUnderlyingIsins[isin]??cdiUnderlyingIsins[isin]??isin,lei:g.LEI??d.company.lei,cik:g.CIK??d.company.cik,figi:g.OpenFigi,primary:g.PrimaryTicker};
 });
 // Verified corrections to stale vendor records, not name-based identity rules.
 for(const r of records){
  if(r.id==='RBC.US'){r.cik='1324948';r.lei=null;}
  if(r.id==='NAVI.US')r.lei=null;
  if(['BATRA.US','BATRK.US'].includes(r.id))r.cik='1958140';
  if(['LLYVA.US','LLYVK.US'].includes(r.id))r.cik='2078416';
 }
 const groups=issuerGroups(records,registry.groups.map(g=>g.ids),registry.rejected.map(g=>g.ids));
 const removed:Record<string,string>={};
 const decisions=[];
 for(const ids of groups){
  const reviewed=registry.groups.filter(g=>g.ids.some(id=>ids.includes(id)));
  if(reviewed.length>1)throw Error(`Issuer registry groups unexpectedly joined: ${ids.join(', ')}`);
  const protectedIds=ids.filter(id=>frozen.has(id));
  if(protectedIds.length>1)throw Error(`Multiple frozen issuer dossiers: ${protectedIds.join(', ')}`);
  const pinned=reviewed[0]?.canonical;
  const canonical=protectedIds[0]??(pinned&&dossiers[pinned]?pinned:chooseCanonical(ids.map(id=>dossiers[id]),frozen));
  for(const id of ids)if(id!==canonical)removed[id]=canonical;
  decisions.push({canonical,ids,reviewed:reviewed.length>0});
 }
 // Retain redirects after the first deduplicated nightly, when alias dossiers no longer exist.
 for(const g of registry.groups)if(dossiers[g.canonical])for(const id of g.ids)if(id!==g.canonical)removed[id]=g.canonical;
 if(!Object.keys(removed).length)return;
 const previousAliases=readCorpusJson<Record<string,string>>('publish-repo/aliases.json')??{};
 const previousHolders=readCorpusJson<Record<string,Dossier['holders']>>('publish-repo/issuer-holders.json')??{};
 files['aliases.json']={...previousAliases,...files['aliases.json']};
 files['issuer-holders.json']=previousHolders;
 // Existing heuristic aliases between explicitly separate issuers must not route or merge holdings.
 const distinct=registry.rejected.flatMap(g=>g.ids.flatMap(a=>g.ids.filter(b=>a!==b).map(b=>[a,b])));
 for(const [a,b]of distinct)if(files['aliases.json'][a]===b)delete files['aliases.json'][a];
 applyIssuerAliases(files,removed,holdersByTicker,investorNames);
 const aliases=files['aliases.json'] as Record<string,string>;
 const eligible=new Set(Object.entries(files).filter(([f])=>/^index\/[A-Z]{2}\.json$/.test(f)).flatMap(([,rows])=>rows.map((r:any)=>r.id)) as string[]);
 const companies=[...eligible].map(id=>{
  const c=dossiers[id].company;
  return {...c,listings:[...new Set([id,...c.listings,...Object.keys(aliases).filter(a=>aliases[a]===id)])]};
 });
 const {shards,manifest}=buildAdaptiveSearchShards(companies,eligible);
 for(const file of Object.keys(files))if(file.startsWith('search/'))delete files[file];
 files['search/manifest.json']=manifest;
 for(const [key,shard]of Object.entries(shards))files[`search/${key}.json`]=shard;
 refreshPublishedSummaries(files);
 files['meta.json'].counts.universe=new Set(records.map(r=>removed[r.id]??r.id)).size;
 writeCorpusJson('staging/issuer-aliases.json',{groups:decisions,removed,canonicalCount:Object.keys(dossiers).length-Object.keys(removed).filter(id=>dossiers[id]).length});
}
