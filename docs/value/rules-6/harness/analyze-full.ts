/** Process workers call the unchanged nightly stage on disjoint company IDs.
 * This is data processing, not agent delegation. The union is the full normal
 * universe with fundamentals; no limit or selected-company shortcut is used. */
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {universeCompanies} from '../../../../lib/value/companies';
const root='/Users/miki/data/value-rules/.audit/rules-6';
export async function runFull(){
 const ids=[...new Set(universeCompanies().map(c=>c.id))].filter(id=>existsSync(root+'/corpus/fundamentals/'+id+'.json')).sort();
 const groups=Array.from({length:4},()=>[] as string[]);ids.forEach((id,i)=>groups[i%4].push(id));
 const children:ReturnType<typeof spawn>[]=[];
 const stop=()=>{for(const child of children)child.kill('SIGTERM');};process.once('SIGTERM',stop);
 const started=new Date().toISOString();
 const statuses=await Promise.all(groups.map(async(group,i)=>{
  const file=root+'/evidence/candidate-'+i+'-ids.json';writeFileSync(file,JSON.stringify(group)+'\n');
  return await new Promise<number>((resolve,reject)=>{
   const child=spawn(process.execPath,['--conditions=react-server','--import','tsx','docs/value/rules-6/harness/analyze.ts'],{stdio:'inherit',env:{...process.env,RULES_WORKER:String(i),REGRESS_RUN:'candidate-'+i,REGRESS_IDS_FILE:file}});children.push(child);
   child.once('error',reject);child.once('close',code=>resolve(code??1));
  });
 }));
 process.removeListener('SIGTERM',stop);
 const receipts=groups.map((_,i)=>JSON.parse(readFileSync(root+'/evidence/candidate-'+i+'-cache-receipt.json','utf8')));
 const readings=receipts.flatMap(r=>r.readings);if(new Set(readings.map(r=>r.id)).size!==readings.length)throw Error('Duplicate cache job');
 if(!receipts.every(r=>r.implementationUnchanged)||new Set(receipts.map(r=>r.implementationSha256)).size!==1)throw Error('Analysis implementations differ');
 writeFileSync(root+'/evidence/candidate-cache-receipt.json',JSON.stringify({started,completed:new Date().toISOString(),count:readings.length,readings,implementationUnchanged:true,implementationSha256:receipts[0].implementationSha256,workers:receipts.map((r,i)=>({jobs:groups[i].length,status:statuses[i],error:r.error??null})),jobCount:ids.length,disjoint:true},null,2)+'\n');
 writeFileSync(root+'/evidence/full-nightly-scope.json',JSON.stringify({jobCount:ids.length,ids,partitionSizes:groups.map(g=>g.length),statuses,ordinaryStage:true,limited:false},null,2)+'\n');
 console.log('Full nightly scope:',ids.length,'jobs; cache-bound readings:',readings.length,'worker statuses:',statuses.join(','));
 if(statuses.some(s=>s!==0))process.exitCode=1;
}
