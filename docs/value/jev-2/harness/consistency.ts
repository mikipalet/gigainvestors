import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {assertDossierConsistency} from '../../../../lib/value/consistency';
const root=process.env.PUBFIX_ROOT!;
const load=(dir:string)=>Object.assign({},...readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(dir+'/'+f,'utf8'))));
const before=load(root+'/baseline-out/dossiers'),after=load(root+'/dry-run/dossiers'),prices=load(root+'/dry-run/prices');
const rows=[];
for(const id of Object.keys(after)){
 let baselineError:string|null=null,error:string|null=null;
 try{assertDossierConsistency(before[id],prices[id]);}catch(e){baselineError=(e as Error).message;}
 try{assertDossierConsistency(after[id],prices[id]);}catch(e){error=(e as Error).message;}
 if(error||baselineError)rows.push({id,baselineError,error});
}
const result={checked:Object.keys(after).length,existingFailures:rows.filter(r=>r.error&&r.error===r.baselineError),newFailures:rows.filter(r=>r.error&&r.error!==r.baselineError)};
writeFileSync(root+'/evidence/consistency.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
if(result.newFailures.length)process.exitCode=1;
