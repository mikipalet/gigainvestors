// Four independent analysis processes, with the paid source disabled in every child.
import {spawn} from 'node:child_process';
import {readdirSync,readFileSync,existsSync,mkdirSync,createWriteStream,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root=process.env.VALUE_CORPUS_DIR??path.join(os.homedir(),'value-corpus');
const universe=readFileSync(path.join(root,'universe.jsonl'),'utf8').trim().split('\n').map(s=>JSON.parse(s).id);
const prior=readdirSync(path.join(root,'analysis')).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5));
const ids=[...new Set([...universe,...prior])].filter(id=>existsSync(path.join(root,'fundamentals',id+'.json'))).sort();
const parts=Array.from({length:4},(_,i)=>ids.filter((_,j)=>j%4===i));
mkdirSync(path.join(root,'logs'),{recursive:true});
const results=await Promise.all(parts.map((part,i)=>new Promise(resolve=>{
 const log=path.join(root,'logs',`complete-1-analyze-${i+1}.log`),out=createWriteStream(log);
 const child=spawn(process.execPath,['--import','tsx','scripts/value/cli.ts','analyze','--only='+part.join(',')],{
  env:{...process.env,VALUE_NO_EODHD:'1',VALUE_ANALYZE_CONCURRENCY:'8'},stdio:['ignore','pipe','pipe'],
 });
 child.stdout.pipe(out);child.stderr.pipe(out);
 child.on('error',e=>resolve({partition:i+1,companies:part.length,error:String(e),log}));
 child.on('close',code=>{out.end();const result={partition:i+1,companies:part.length,code,log};console.log(JSON.stringify(result));resolve(result);});
})));
writeFileSync(path.join(root,'completeness','analysis-run.json'),JSON.stringify({companies:ids.length,results},null,2));
if(results.some(r=>r.code!==0))process.exitCode=1;
