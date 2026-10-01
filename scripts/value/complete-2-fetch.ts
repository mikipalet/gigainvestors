/** Download into the single private staging corpus, never the shared runner corpus. */
import dotenv from 'dotenv';dotenv.config({path:'.env.local',quiet:true});
import {readFileSync,writeFileSync,mkdirSync,existsSync,statfsSync} from 'node:fs';
import {join} from 'node:path';import {homedir} from 'node:os';
import {getFundamentals,callsUsedToday} from '../../lib/value/eodhd';
import {normalizeEodhd} from '../../lib/value/normalize-eodhd';
const root=join(homedir(),'value-corpus'),stage=join(root,'staging/release-8/complete-2');
if(process.env.VALUE_CORPUS_DIR!==stage)throw Error('Set VALUE_CORPUS_DIR to release-8/complete-2');
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const baseline=read(join(stage,'baseline.json')) as Array<{id:string;indexes:string[]}>;
const alternate=read(join(stage,'alternate-symbols.json'));
const rank=(id:string)=>['US','XETRA','F','LSE','SW','PA'].indexOf(id.split('.').at(-1)!)<0?100:['US','XETRA','F','LSE','SW','PA'].indexOf(id.split('.').at(-1)!);
const priority=new Set(['S&P 500','Nikkei 225','Euro Stoxx 50','FTSE 100','DAX','CAC 40','SMI','AEX','IBEX 35','FTSE MIB']);
const selected=baseline.filter(c=>!c.id.endsWith('.JP')&&!c.id.endsWith('.NSE')).sort((a,b)=>Number(b.indexes.some(i=>priority.has(i)))-Number(a.indexes.some(i=>priority.has(i))));
mkdirSync(join(stage,'completeness/verified'),{recursive:true});
async function main(){
console.log('Provider usage',await callsUsedToday(),'selected',selected.length);
let cursor=0,done=0;
await Promise.all(Array.from({length:3},async()=>{while(cursor<selected.length){
 const c=selected[cursor++];const dest=join(stage,`completeness/verified/${c.id}.json`);if(existsSync(dest))continue;
 const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('Disk below 5 GiB');
 const alternatives=(alternate[c.id]??[]).sort((a:any,b:any)=>rank(a.id)-rank(b.id));
 const candidates=[...(!c.id.endsWith('.MI')?[{id:c.id}]:[]),...alternatives.slice(0,2)];
 let best:any=null;const attempts=[];
 for(const candidate of candidates){try{
  const rawPath=join(stage,`raw/eodhd/${candidate.id}.json`);
  const raw=existsSync(rawPath)?read(rawPath):await getFundamentals(candidate.id);
  if(candidate.isin&&raw.General?.ISIN?.toUpperCase()!==candidate.isin.toUpperCase())throw Error('ISIN mismatch or unavailable');
  writeFileSync(rawPath,JSON.stringify(raw));
  const normalized=normalizeEodhd(raw,c.id);
  const entry={id:c.id,sourceId:candidate.id,isin:candidate.isin??raw.General?.ISIN, ...normalized};
  for(const y of entry.fundamentals.years)for(const p of Object.values(y.provenance??{}))p.source=p.source.replace(`raw/eodhd/${c.id}`,`https://eodhd.com/api/fundamentals/${candidate.id}`);
  if(!best||entry.fundamentals.years.length>best.fundamentals.years.length)best=entry;
  attempts.push([candidate.id,entry.fundamentals.years.length]);
  if(entry.fundamentals.years.length>=7)break;
 }catch(e){attempts.push([candidate.id,(e as Error).message]);}}
 if(best)writeFileSync(dest,JSON.stringify(best));
 if(++done%10===0||!best)console.log(done,c.id,JSON.stringify(attempts));
}}));
console.log('Done',done);

}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
