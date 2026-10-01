import {shardOf} from '../../lib/value/shard';
/** One local staging store, copied without Git metadata. No remote writes. */
import {cpSync,existsSync,mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {corpusPath,readCorpusJson} from '../../lib/value/corpus';
import {businessDiskGuard} from '../../lib/value/business/disk';
import {buildOutput} from '../../lib/value/build-output';
import {publishViews} from '../../lib/value/publish-views';
import {businessLines} from '../../lib/value/flags/presentation';
import type {Dossier,Analysis,PriceMap} from '../../lib/value/types';
const stage=path.resolve('.business-3'),store=path.join(stage,'store');
businessDiskGuard();mkdirSync(store,{recursive:true});
if(!existsSync(path.join(store,'meta.json')))for(const f of readdirSync(corpusPath('publish-repo'))){if(f.startsWith('.'))continue;cpSync(corpusPath('publish-repo',f),path.join(store,f),{recursive:true});}
const read=(f:string)=>JSON.parse(readFileSync(path.join(store,f),'utf8'));
const dossiers:Record<string,Dossier>=Object.assign({},...readdirSync(path.join(store,'dossiers')).filter(f=>f.endsWith('.json')).map(f=>read('dossiers/'+f)));
const baseline=path.join(stage,'before.json');
if(!existsSync(baseline))writeFileSync(baseline,JSON.stringify(Object.values(dossiers).map(d=>({id:d.id,lines:businessLines(d).map(l=>l.text),tests:Object.fromEntries(Object.entries(d.tests).map(([k,t])=>[k,t.result]))}))));
const changed=readCorpusJson<Array<{id:string}>>('business-backfill/verdict-changes.json')??[];
for(const d of Object.values(dossiers)){
 const fixed=changed.some(c=>c.id===d.id)?readCorpusJson<Analysis>(`analysis/${d.id}.json`):null;
 if(fixed)Object.assign(d,fixed);
 d.ownerMemo=readCorpusJson<Analysis['ownerMemo']>(`business-backfill/memos/${d.id}.json`)??undefined;
}
const prices:PriceMap=Object.assign({},...readdirSync(path.join(store,'prices')).filter(f=>f.endsWith('.json')).map(f=>read('prices/'+f)));
const holdersByTicker:Record<string,string[]>={},investorNames:Record<string,string>={},priceHistories:Record<string,NonNullable<Dossier['priceHistory']>>={};
for(const d of Object.values(dossiers)){if(d.priceHistory)priceHistories[d.id]=d.priceHistory;holdersByTicker[d.id.replace(/\.US$/,'').replaceAll('-','.')]=d.holders.map(h=>h.code);for(const h of d.holders)investorNames[h.code]=h.name;}
const {files}=buildOutput({analyses:Object.values(dossiers),prices,priceHistories,holdersByTicker,investorNames,fx:{},universe:read('meta.json').counts.universe});
// Preserve every published dossier even if it remains outside the decided index.
for(const [id,d]of Object.entries(dossiers)){
 const file=`dossiers/${shardOf(id)}.json`;
 const shard=(files[file]??={}) as Record<string,Dossier>;
 if(!shard[id])shard[id]=d;
 shard[id].ownerMemo=d.ownerMemo;
}

for(const f of readdirSync(path.join(store,'history')).filter(f=>f.endsWith('.json')))files['history/'+f]=read('history/'+f);
publishViews(files);
for(const [file,value]of Object.entries(files)){businessDiskGuard();mkdirSync(path.dirname(path.join(store,file)),{recursive:true});writeFileSync(path.join(store,file),JSON.stringify(value));}
console.log(`Local store: ${store}; ${Object.keys(dossiers).length} dossiers; ${changed.length} verdict changes`);
