// Complete second-source routing for populated but inconsistent statements.
import {spawn} from 'node:child_process';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root=process.env.VALUE_CORPUS_DIR??path.join(os.homedir(),'value-corpus');
const read=file=>JSON.parse(readFileSync(path.join(root,file),'utf8'));
const universe=new Set(readFileSync(path.join(root,'universe.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line).id));
const before=readdirSync(path.join(root,'fundamentals')).filter(file=>file.endsWith('.json')).flatMap(file=>{
 const f=read('fundamentals/'+file);return universe.has(f.id)&&f.integrity.reasons.some(r=>r.includes('balance sheet off'))?[{id:f.id,reasons:f.integrity.reasons}]:[];
});
writeFileSync(path.join(root,'completeness/balance-before-second-sources.json'),JSON.stringify(before,null,2));
console.log(`Populated inconsistent statements requiring second sources: ${before.length}`);
if(before.length){
 const code=await new Promise(resolve=>{const child=spawn(process.execPath,['--import','tsx','scripts/value/cli.ts','complete-data','--force','--only='+before.map(r=>r.id).join(',')],{env:{...process.env,VALUE_NO_EODHD:'1'},stdio:'inherit'});child.on('close',resolve);child.on('error',e=>{console.error(e);resolve(1);});});
 if(code!==0)process.exitCode=1;
}
const repairs=read('completeness/integrity-repairs.json');
for(const b of before){const f=read(`fundamentals/${b.id}.json`);if(!f.integrity.reasons.some(r=>r.includes('balance sheet off'))&&!repairs.some(r=>r.id===b.id))repairs.push({id:b.id,before:b.reasons,after:f.integrity.reasons});}
writeFileSync(path.join(root,'completeness/integrity-repairs.json'),JSON.stringify(repairs,null,2));
console.log(`Balance repairs recorded: ${repairs.length}`);
