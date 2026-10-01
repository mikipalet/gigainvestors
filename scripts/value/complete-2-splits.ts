import dotenv from 'dotenv';dotenv.config({path:'.env.local',quiet:true});
import {eodhd} from '../../lib/value/eodhd';
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync,statfsSync} from 'node:fs';import {join} from 'node:path';import {homedir} from 'node:os';
const root=join(homedir(),'value-corpus/staging/release-8/complete-2');if(process.env.VALUE_CORPUS_DIR!==root)throw Error('Staging only');
async function main(){mkdirSync(join(root,'sources/splits'),{recursive:true});for(const file of readdirSync(join(root,'completeness/verified'))){
 if(!file.endsWith('.JP.json')&&!JSON.parse(readFileSync(join(root,'numeric-audit.json'),'utf8')).some((r:any)=>r.id+'.json'===file&&r.reasons.length))continue;const d=statfsSync('/');if(d.bavail*d.bsize<5*1024**3)throw Error('Disk below 5 GiB');
 const path=join(root,'completeness/verified',file),entry=JSON.parse(readFileSync(path,'utf8'));
 if(entry.sourceId.startsWith('http'))continue;
 try{const cache=join(root,'sources/splits',file);const events=existsSync(cache)?JSON.parse(readFileSync(cache,'utf8')):await eodhd<any[]>(`splits/${entry.sourceId}`,{from:'2010-01-01',to:'2026-10-01'});writeFileSync(cache,JSON.stringify(events));
 const splits=events.flatMap((e:any)=>{const [a,b]=String(e.split).split('/').map(Number);return /^\d{4}-\d{2}-\d{2}$/.test(e.date)&&a>0&&b>0?[{date:e.date,factor:a/b}]:[]});
 entry.fundamentals.splits=splits;writeFileSync(path,JSON.stringify(entry));console.log(entry.id,splits.length);
 }catch(e){console.log(entry.id,(e as Error).message);}
}}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
