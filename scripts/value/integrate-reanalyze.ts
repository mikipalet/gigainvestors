import dotenv from 'dotenv';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {corpusPath,readCorpusJson} from '../../lib/value/corpus';
import analyze,{loadSections} from './stages/analyze';
import type {Analysis,TestOutcome} from '../../lib/value/types';
import {diskGuard} from '../../lib/value/thesis/sources';
dotenv.config({path:'.env.local',quiet:true});dotenv.config({path:corpusPath('.env.local'),quiet:true});process.env.VALUE_NO_EODHD='1';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
async function main(){
 const published=readFileSync('.integrate/staging/published-ids.txt','utf8').trim().split(',');
 // Apply audit-1's financial share-basis and common-ROE repairs beyond the sample too.
 const financial=published.filter(id=>{const a=readCorpusJson<Analysis>(`analysis/${id}.json`);return a&&a.company.kind!=='operating';});
 const ids=process.argv[2]?.split(',')??[...new Set<string>([...JSON.parse(readFileSync('.integrate/staging/inventory.json','utf8')).entries.map((r:any)=>r.id),...JSON.parse(readFileSync('.integrate/staging/cohort.json','utf8')).map((r:any)=>r.id),...financial])];
 for(let i=0;i<ids.length;i+=20){
  diskGuard();const batch=ids.slice(i,i+20),byId=new Map(batch.map(id=>[id,readCorpusJson<Analysis>(`analysis/${id}.json`)]));
  const byText=new Map<string,TestOutcome[]>();
  for(const a of byId.values())if(a)for(const text of Object.values(loadSections({company:a.company,report:a.report})))if(text)byText.set(hash(text),Object.values(a.tests));
  await analyze({only:batch.filter(id=>byId.get(id)),force:true,ask:async({id})=>Object.values(byId.get(id)?.tests??{}).flatMap(t=>t.jev),evidence:async({section,questions})=>Object.fromEntries(Object.keys(questions).map(q=>[q,byText.get(hash(section))?.flatMap(t=>t.jev).find(a=>a.q===q)?.evidence??null]))});
  console.log(`REANALYZE ${Math.min(i+20,ids.length)}/${ids.length}`);
 }
}main().catch(e=>{console.error(e.message);process.exitCode=1;});
