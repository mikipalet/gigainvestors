import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import registry from '../../lib/value/issuer-registry.json';
import {shardKeyFor} from '../../lib/value/search-shard';
import {searchShard} from '../../lib/value/search';
import {buildCompanyIndex} from '../../lib/search/companies';
import {rank} from '../../lib/search/rank';
const [baseline,output,freezeFile,report]=process.argv.slice(2);
if(!report)throw Error('Usage: verify-issuer-publication <baseline> <output> <freeze-file> <report>');
const read=(root:string,file:string)=>JSON.parse(readFileSync(path.join(root,file),'utf8'));
const dossiers=(root:string):Record<string,any>=>Object.assign({},...readdirSync(path.join(root,'dossiers')).filter(f=>f.endsWith('.json')).map(f=>read(root,`dossiers/${f}`)));
const before=dossiers(baseline),after=dossiers(output),aliases=read(output,'aliases.json');
const failures:string[]=[];
const removed=Object.keys(before).filter(id=>!after[id]).sort();
const changed=Object.keys(after).filter(id=>JSON.stringify(after[id])!==JSON.stringify(before[id]));
if(changed.length)failures.push(`Canonical dossier bytes changed: ${changed.join(', ')}`);
for(const id of removed)if(!aliases[id]||!after[aliases[id]]||aliases[aliases[id]])failures.push(`Missing direct target: ${id}`);
const freezes=JSON.parse(readFileSync(freezeFile,'utf8')).ids as string[];
for(const id of freezes)if(JSON.stringify(after[id])!==JSON.stringify(before[id]))failures.push(`Frozen dossier changed: ${id}`);
const countryRows=readdirSync(path.join(output,'index')).filter(f=>/^[A-Z]{2}\.json$/.test(f)).flatMap(f=>read(output,`index/${f}`));
const indexIds=countryRows.map(r=>r.id);
if(new Set(indexIds).size!==indexIds.length)failures.push('Repeated index IDs');
for(const id of indexIds)if(aliases[id])failures.push(`Alias in index: ${id}`);
const searchIds=new Set<string>();
for(const f of readdirSync(path.join(output,'search')).filter(f=>f!=='manifest.json')){
 const s=read(output,`search/${f}`);if(new Set(s.rows.map((r:any)=>r[0])).size!==s.rows.length)failures.push(`Repeated search IDs: ${f}`);
 for(const row of s.rows){searchIds.add(row[0]);if(aliases[row[0]])failures.push(`Alias in search: ${row[0]}`);}
}
for(const g of registry.groups){
 const live=g.ids.filter(id=>after[id]);if(live.length!==1)failures.push(`Issuer dossier count ${live.length}: ${g.ids.join(', ')}`);
 if(g.ids.filter(id=>indexIds.includes(id)).length>1||g.ids.filter(id=>searchIds.has(id)).length>1)failures.push(`Duplicate issuer in index/search: ${g.canonical}`);
}
const manifest=read(output,'search/manifest.json');
const holdings=JSON.parse(readFileSync('data/store/search.json','utf8'));
const unified=buildCompanyIndex(holdings,countryRows,aliases);
const queries=['nestle','diageo','alibaba','gsk','carlsberg','u-haul','biglari'];
const searches=queries.map(query=>{
 const key=shardKeyFor(query,manifest)!;
 const shard=searchShard(read(output,`search/${key}.json`),query).map(r=>r[0]);
 const global=rank(unified,query).filter(r=>r.kind==='stock').map(r=>r.ticker);
 if(shard.length!==1||global.length!==1)failures.push(`Search ${query}: ${shard.length}/${global.length}`);
 return {query,shard,global};
});
const aliasSearches=removed.map(id=>{
 const key=shardKeyFor(id,manifest)!;
 const shard=searchShard(read(output,`search/${key}.json`),id).map(r=>r[0]);
 const global=rank(unified,id).filter(r=>r.kind==='stock').map(r=>r.ticker);
 const canonical=aliases[id],ticker=canonical.replace(/\.US$/,'');
 if(!shard.includes(canonical)||!global.includes(ticker))failures.push(`Alias search missing canonical: ${id}`);
 return {id,canonical,shard,global};
});
const hash=(d:any)=>createHash('sha256').update(JSON.stringify(d)).digest('hex');
const result={baseline,output,baselineCount:Object.keys(before).length,canonicalCount:Object.keys(after).length,indexCount:indexIds.length,groups:registry.groups.length,removed:removed.map(id=>({id,canonical:aliases[id]})),canonicalBytesChanged:changed,freezeCount:freezes.length,freezeHashes:Object.fromEntries(freezes.map(id=>[id,hash(after[id])])),searches,aliasSearches,failures};
writeFileSync(report,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({canonicalCount:result.canonicalCount,removed:removed.length,freezeCount:freezes.length,failures}));
if(failures.length)process.exitCode=1;
