/** Seed the publication fallback from an already audited local store.
 * Never edits the research/backfill writer's files. */
import {readFileSync,readdirSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {corpusPath} from '../../lib/value/corpus';
import type {Dossier} from '../../lib/value/types';
const source=process.argv[2];if(!source)throw Error('Usage: import-published-memos <audited-local-store>');
const out=corpusPath('published-memos');mkdirSync(out,{recursive:true});
let written=0;
for(const file of readdirSync(path.join(source,'dossiers')).filter(f=>/^\d{3}\.json$/.test(f))){
 const dossiers=JSON.parse(readFileSync(path.join(source,'dossiers',file),'utf8')) as Record<string,Dossier>;
 for(const d of Object.values(dossiers))if(d.ownerMemo){
  if(!/^[\w.&-]+$/.test(d.id))throw Error('Invalid company ID');
  const dest=path.join(out,`${d.id}.json`);
  if(existsSync(dest))continue;
  writeFileSync(dest,JSON.stringify(d.ownerMemo)+'\n',{flag:'wx'});written++;
 }
}
console.log(JSON.stringify({out,written}));
