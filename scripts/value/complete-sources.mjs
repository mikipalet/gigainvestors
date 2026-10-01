// Parallel local parsing, disjoint companies, unchanged aggregate provider request rates.
import {spawn} from 'node:child_process';
import {readFileSync,existsSync,createWriteStream,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root=process.env.VALUE_CORPUS_DIR??path.join(os.homedir(),'value-corpus');
const universe=readFileSync(path.join(root,'universe.jsonl'),'utf8').trim().split('\n').map(s=>JSON.parse(s).id);
const pending=universe.filter(id=>!existsSync(path.join(root,'completeness/attempts',id+'.json')));
const parts=Array.from({length:4},(_,i)=>pending.filter((_,j)=>j%4===i));
console.log(`Source completion: ${universe.length-pending.length} already processed; ${pending.length} remaining across four local processes`);
const results=await Promise.all(parts.map((ids,i)=>new Promise(resolve=>{
 const log=path.join(root,'logs',`complete-1-source-part-${i+1}.log`),out=createWriteStream(log);
 if(!ids.length){out.end();resolve({partition:i+1,companies:0,code:0});return;}
 const child=spawn(process.execPath,['--import','tsx','scripts/value/cli.ts','complete-data','--only='+ids.join(',')],{
  env:{...process.env,VALUE_NO_EODHD:'1',VALUE_SOURCE_WORKERS:'4'},stdio:['ignore','pipe','pipe'],
 });
 child.stdout.pipe(out);child.stderr.pipe(out);
 child.on('error',error=>resolve({partition:i+1,companies:ids.length,error:String(error),log}));
 child.on('close',code=>{out.end();const row={partition:i+1,companies:ids.length,code,log};console.log(JSON.stringify(row));resolve(row);});
})));
const remaining=universe.filter(id=>!existsSync(path.join(root,'completeness/attempts',id+'.json')));
writeFileSync(path.join(root,'completeness/source-run.json'),JSON.stringify({companies:universe.length,alreadyProcessed:universe.length-pending.length,results,remaining},null,2));
if(remaining.length||results.some(r=>r.code!==0))process.exitCode=1;
