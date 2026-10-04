/** Full dataset gate: VALUE_STORE_DIR=... npx tsx scripts/search-audit.ts [output.json] */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {buildCompanyIndex,companyNameKey,listingKey} from '../lib/search/companies';
import {rank,rankItems,type Hit,type RankItem} from '../lib/search/rank';
import {searchShard} from '../lib/value/search';
import {shardKeyFor,type SearchManifest} from '../lib/value/search-shard';
import type {SearchShard} from '../lib/value/types';
import type {SearchIndex} from '../lib/types';
import type {IndexRow} from '../lib/value/types';
const store=process.env.VALUE_STORE_DIR;
if(!store)throw new Error('Set VALUE_STORE_DIR to the published data snapshot');
const read=<T,>(f:string):T=>JSON.parse(readFileSync(f,'utf8'));
const holdings=read<SearchIndex>('data/store/search.json');
const dossiers=readdirSync(path.join(store,'index')).filter(f=>f!=='default.json').flatMap(f=>read<IndexRow[]>(path.join(store,'index',f)));
const aliases=read<Record<string,string>>(path.join(store,'aliases.json'));
const index=buildCompanyIndex(holdings,dossiers,aliases);
const raw=[...holdings.stocks.map(s=>({source:'13F',id:s.t,name:s.n})),...dossiers.map(s=>({source:'dossier',id:s.id,name:s.n}))];
const groups=new Map<string,typeof raw>();
for(const row of raw){const matches=index.stocks.filter(c=>c.names?.includes(row.name)&&[c.t,...c.aliases??[]].some(a=>listingKey(a)===listingKey(row.id)));assert.equal(matches.length,1,`Ambiguous identity ${row.id}`);const id=matches[0].t;groups.set(id,[...groups.get(id)??[],row]);}
const duplicates=[...groups].filter(([,rows])=>rows.length>1).map(([ticker,rows])=>({ticker,name:index.stocks.find(c=>c.t===ticker)!.n,before:rows.length,distinctListingRowsBefore:new Set(rows.map(r=>r.id.replace(/\.US$/,''))).size,after:index.stocks.filter(c=>c.t===ticker).length,rows}));
// Reproduce 1d03565's actual SiteSearch composition, including its existing
// same-ticker suppression. Source overlap is reported separately from visible
// duplicates: AAPL + AAPL.US was already suppressed on the combined surface.
const legacyItems:RankItem<Hit>[]=[
 ...holdings.investors.map(i=>({value:{kind:'investor' as const,code:i.code,title:i.person,sub:i.firm},fields:[{text:i.person},{text:i.firm,weight:.9},{text:i.code,weight:.8}],bonus:.05})),
 ...holdings.stocks.map(r=>({value:{kind:'stock' as const,ticker:r.t,title:r.t,sub:r.n,holders:r.h},fields:[{text:r.t,weight:1.1},{text:r.n}],bonus:Math.min(r.h,40)/200})),
];
const manifest=read<SearchManifest>(path.join(store,'search/manifest.json'));
const shards=new Map<string,SearchShard>();
const ownerBySource=new Map<string,string>();
for(const [ticker,rows] of groups)for(const row of rows)ownerBySource.set(`${row.source}:${row.id}`,ticker);
const observed:Record<string,{before:number;query:string;listings:string[];after:number}>={};
for(const group of duplicates.filter(d=>d.distinctListingRowsBefore>1)){
 const queries=new Set(group.rows.flatMap(r=>[r.name,companyNameKey(r.name),r.name.split(' ')[0],r.id]));
 for(const query of queries){
  const key=shardKeyFor(query,manifest);if(!key)continue;
  if(!shards.has(key))shards.set(key,read<SearchShard>(path.join(store,'search',`${key}.json`)));
  const valueRows=searchShard(shards.get(key)!,query,8);
  const ids=new Set(valueRows.map(r=>r[0].replace(/\.US$/,'')));
  const stockHits=rankItems(legacyItems,query).filter(h=>h.kind==='stock'&&!ids.has(h.ticker));
  const listings=[...valueRows.filter(r=>ownerBySource.get(`dossier:${r[0]}`)===group.ticker).map(r=>r[0]),...stockHits.filter(h=>h.kind==='stock'&&ownerBySource.get(`13F:${h.ticker}`)===group.ticker).map(h=>h.kind==='stock'?h.ticker:'')];
  if(listings.length>(observed[group.ticker]?.before??1)){
   const after=rank(index,query).filter(h=>h.kind==='stock'&&h.ticker===group.ticker).length;
   assert.equal(after,1,`Lost visible duplicate group ${group.ticker} for ${query}`);
   observed[group.ticker]={before:listings.length,query,listings,after};
  }
 }
}
assert.ok(duplicates.length>0);
for(const row of duplicates)assert.equal(row.after,1,`${row.ticker} still duplicated`);
const seen=new Set<string>();
for(const company of index.stocks){const name=companyNameKey(company.n);assert.ok(!seen.has(name),`Duplicate name ${name}`);seen.add(name);}
const queries=Object.fromEntries('apple aapl google goog berkshire brk alphabet coca ko plexus pluxee toyota 7203 buffett ackman ha'.split(' ').map(q=>{
 const hits=rank(index,q),companies=hits.filter(h=>h.kind==='stock');
 assert.equal(new Set(companies.map(h=>h.ticker)).size,companies.length);
 assert.ok(hits.length,`No results for ${q}`);
 return [q,hits];
}));
for(const [q,ticker] of [['apple','AAPL'],['APC.DE','AAPL'],['google','GOOGL'],['GOOG.US','GOOGL'],['BRK.A','BRK-B'],['BRK.B','BRK-B'],['plexus','PLXS'],['pluxee','PLX.PA'],['7203','7203.JP']])assert.equal(rank(index,q).find(h=>h.kind==='stock')?.ticker,ticker);
const report={snapshot:read<{asOf:string}>(path.join(store,'meta.json')).asOf,sourceRows:raw.length,companiesAfter:index.stocks.length,duplicateSourceGroups:duplicates.length,duplicateDistinctListingGroups:duplicates.filter(d=>d.distinctListingRowsBefore>1).length,duplicatesAfter:0,visibleDuplicatesBefore:Object.keys(observed).length,observed,duplicates,queries};
writeFileSync(process.argv[2]??'.superpowers/search-1/company-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,duplicates:undefined,queries:undefined,observed:undefined}));
