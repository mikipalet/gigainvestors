/** Actual analyze stage with strictly cached filing judgements and bond yields. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,statfsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import analyze from '../../../scripts/value/stages/analyze';
import {readCorpusJson} from '../../../lib/value/corpus';
import {askCompany} from '../../../lib/value/jev/run';
import {QUESTIONS_VERSION} from '../../../lib/value/jev/questions';
import type {Analysis,JevAnswer} from '../../../lib/value/types';
const base=path.join(os.homedir(),'data/value-holds');
if(process.env.VALUE_CORPUS_DIR!==path.join(base,'corpus'))throw Error('Isolated holds corpus required');
process.env.VALUE_NO_EODHD='1';process.env.VALUE_ANALYZE_CONCURRENCY='1';
const ids=[...JSON.parse(readFileSync('docs/value/holds-2/source-sample.json','utf8')).population,'BAYRY.US','AGO.US','AMPY.US','TOST.US','FRFHF.US'].filter(id=>!process.env.VALUE_ONLY||process.env.VALUE_ONLY.split(',').includes(id));
const before=Object.fromEntries(ids.map(id=>[id,readCorpusJson<Analysis>(`analysis/${id}.json`)]));
async function main(){
 for(const id of ids){
  for(const volume of ['/',base]){const s=statfsSync(volume);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP: commit');}
  await analyze({only:[id],ask:async args=>{
   const hash=createHash('sha256').update(JSON.stringify(Object.entries(args.sections).filter(([,text])=>!!text?.trim()).sort(([a],[b])=>a.localeCompare(b)))).digest('hex');
   const cached=readCorpusJson<{version:string;hash:string;answers:JevAnswer[]}>(`jev/${id}.json`);
   if(cached?.hash!==hash||cached.version!==QUESTIONS_VERSION)throw Error(`No bound cached filing judgement: ${id}`);
   return askCompany(args);
  },
  evidence:async()=>{throw Error('New filing evidence requested in cache-only replay');}});
 }
 const rows=ids.map(id=>({id,before:before[id],after:readCorpusJson(`analysis/${id}.json`),inputs:readCorpusJson(`analysis/inputs/${id}.json`)}));
 writeFileSync(path.join(base,`evidence/holds-2/reanalysis${process.env.VALUE_ONLY?'-selected':''}.json`),JSON.stringify(rows,null,2)+'\n');
 console.log(JSON.stringify({replayed:ids.length}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
