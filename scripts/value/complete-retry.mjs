// Retry transient free-source failures; deterministic empty/unsupported sources remain audited.
import {spawn} from 'node:child_process';
import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root=process.env.VALUE_CORPUS_DIR??path.join(os.homedir(),'value-corpus');
const companies=new Map(readFileSync(path.join(root,'universe.jsonl'),'utf8').trim().split('\n').map(line=>{const c=JSON.parse(line);return [c.id,c];}));
const pending=()=>readdirSync(path.join(root,'completeness/attempts')).filter(f=>f.endsWith('.json')).flatMap(file=>{
 const row=JSON.parse(readFileSync(path.join(root,'completeness/attempts',file),'utf8'));
 const latest=[...new Map(row.attempts.map(a=>[a.source,a.status])).values()];
 const companyFile=path.join(root,'companies',file),company={...companies.get(row.id),...(existsSync(companyFile)?JSON.parse(readFileSync(companyFile,'utf8')):{})};
 const nameLookup=latest.includes('No matching LEI')&&!company.isin&&!existsSync(path.join(root,'raw/esef/gleif',`name-${company.code}.json`));
 return nameLookup||latest.some(s=>/HTTP (?:429|5\d\d)|fetch failed|timeout|terminated|circuit open|Unsupported Yahoo exchange: (?:NEO|STU|MU|DU|KAR|VN)|No Yahoo listing mapping/i.test(s))?[row.id]:[];
});
for(let round=1;round<=3;round++){
 const ids=pending();if(!ids.length)break;
 console.log(`Free-source retry ${round}: ${ids.length} companies`);
 if(round>1)await new Promise(resolve=>setTimeout(resolve,30000));
 const code=await new Promise(resolve=>{
  const child=spawn(process.execPath,['--import','tsx','scripts/value/cli.ts','complete-data','--force','--only='+ids.join(',')],{env:{...process.env,VALUE_NO_EODHD:'1'},stdio:'inherit'});
  child.on('close',resolve);child.on('error',e=>{console.error(e);resolve(1);});
 });
 if(code!==0){process.exitCode=1;break;}
}
const remaining=pending();writeFileSync(path.join(root,'completeness/transient-residual.json'),JSON.stringify({remaining},null,2));
console.log(`Transient source failures remaining: ${remaining.length}`);if(remaining.length)process.exitCode=1;
if(!process.exitCode){
 const code=await new Promise(resolve=>{
  const child=spawn(process.execPath,['--import','tsx','scripts/value/complete-balance.ts'],{env:{...process.env,VALUE_NO_EODHD:'1'},stdio:'inherit'});
  child.on('close',resolve);child.on('error',e=>{console.error(e);resolve(1);});
 });
 if(code!==0)process.exitCode=1;
}
