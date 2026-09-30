/** Rebuild a local preview from one immutable live publication. Never publish, fetch providers, or revalue. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { corpusPath, readJsonl } from '../../lib/value/corpus';
import { buildOutput } from '../../lib/value/build-output';
import { buildAdaptiveSearchShards } from '../../lib/value/search';
import { readPrices } from '../../lib/value/price-files';
import { westernHistory } from '../../lib/value/western-history';
import { bestWesternListing } from '../../lib/value/western';
import { writeOutput } from './stages/publish';
import type { Company, Dossier, HistoryIndex, SnapshotRow } from '../../lib/value/types';

const out=process.argv[2];
if (!out?.startsWith('/tmp/')) throw new Error('Supply an isolated /tmp output directory');
mkdirSync(out,{recursive:true});
if (readdirSync(out).length) throw new Error('Use an empty preview directory');
const source=corpusPath('publish-repo');
const commit=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const archive=execFileSync('git',['-C',source,'archive',commit],{maxBuffer:512*1024*1024});
execFileSync('tar',['-x','-C',out],{input:archive});
const universe=readJsonl<Company>('universe.jsonl');
const companies=new Map(universe.map(c=>[c.id,c]));
const dossiers=readdirSync(path.join(out,'dossiers')).filter(f=>f.endsWith('.json')).flatMap(f=>Object.values(JSON.parse(readFileSync(path.join(out,'dossiers',f),'utf8'))) as Dossier[]);
// Preserve the published analyses and prices, adding current listing identity only.
const analyses=dossiers.map(d=>({...d,company:{...d.company,listings:companies.get(d.id)?.listings??d.company.listings}}));
const investorNames=Object.fromEntries(dossiers.flatMap(d=>d.holders.map(h=>[h.code,h.name])));
const holdersByTicker:Record<string,string[]>={};
for(const d of dossiers) for(const id of d.company.listings.filter(id=>id.endsWith('.US'))) holdersByTicker[id.slice(0,-3).replaceAll('-','.')]=d.holders.map(h=>h.code);
const {files}=buildOutput({analyses,universe:universe.length,holdersByTicker,investorNames,fx:{},prices:readPrices(path.join(out,'prices')),priceHistories:Object.fromEntries(dossiers.filter(d=>d.priceHistory).map(d=>[d.id,d.priceHistory!]))});
const search=buildAdaptiveSearchShards(universe,new Set(analyses.map(a=>a.id)));
files['search/manifest.json']=search.manifest;
for(const [key,shard] of Object.entries(search.shards))files[`search/${key}.json`]=shard;
const history=JSON.parse(readFileSync(path.join(out,'history/index.json'),'utf8')) as HistoryIndex;
const snapshots=Object.fromEntries(history.years.map(y=>[y,JSON.parse(readFileSync(path.join(out,`history/${y}.json`),'utf8')) as SnapshotRow[]]));
files['history/index.json']=westernHistory(history,snapshots,new Set(universe.filter(c=>bestWesternListing(c)!==null).map(c=>c.id)));
writeOutput({repo:out,files});
writeFileSync(path.join(out,'qa-provenance.json'),JSON.stringify({at:new Date().toISOString(),source,commit,providerCalls:0,mode:'western-rebuild-of-live-publication',analyses:dossiers.length},null,2));
console.log(JSON.stringify(files['meta.json'],null,2));
