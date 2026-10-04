/** Controller-owned, cache-only additions replay. Never publishes or uses EODHD. */
import dotenv from 'dotenv';
import os from 'node:os';
import path from 'node:path';
import {statfsSync} from 'node:fs';
import {corpusDir,readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import analyze from './stages/analyze';
process.env.VALUE_CORPUS_DIR??=path.join(os.homedir(),'data/value-cover');
dotenv.config({path:path.join(process.env.VALUE_BASE_CORPUS??path.join(os.homedir(),'value-corpus'),'.env.local'),quiet:true});
dotenv.config({path:process.env.VALUE_ENV_FILE,quiet:true});
process.env.VALUE_NO_EODHD='1';
process.env.VALUE_ANALYZE_CONCURRENCY??='2';
async function main(){
 if(path.resolve(corpusDir())===path.resolve(process.env.VALUE_BASE_CORPUS??path.join(os.homedir(),'value-corpus')))throw Error('Replay requires an isolated corpus');
 const ids=readCorpusJson<string[]>('held-membership/additions.json')!.filter(id=>readCorpusJson(`fundamentals/${id}.json`));
 const start=Number(process.env.VALUE_REPLAY_START??0),limit=Number(process.env.VALUE_REPLAY_LIMIT??ids.length);
 if(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(limit)||limit<=0)throw Error('Invalid replay range');
 const done:string[]=start?readCorpusJson<{ids:string[]}>('held-validation/cover-2-analysis-progress.json')?.ids??[]:[];
 const end=Math.min(ids.length,start+limit);
 for(let i=start;i<end;i+=25){
  const s=statfsSync('/');if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP: commit and stop');
  const batch=ids.slice(i,Math.min(end,i+25));await analyze({only:batch});done.push(...batch);
  writeCorpusJson('held-validation/cover-2-analysis-progress.json',{at:new Date().toISOString(),ids:[...new Set(done)],total:ids.length,nextOffset:Math.min(end,i+25)});
  console.log(`coverage replay: ${done.length}/${ids.length}`);
 }
}
main().catch(error=>{let message=error instanceof Error?error.message:'Analysis failed';for(const [k,v]of Object.entries(process.env))if(/KEY|TOKEN|SECRET|PASSWORD/.test(k)&&v)message=message.replaceAll(v,'[REDACTED]');console.error(message);process.exitCode=1;});
