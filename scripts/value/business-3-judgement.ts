/** Local corpus migration only; never calls publish or a remote write. */
import {readdirSync} from 'node:fs';
import {readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {corpusPath} from '../../lib/value/corpus';
import {businessDiskGuard} from '../../lib/value/business/disk';
import analyze from './stages/analyze';
import type {Analysis} from '../../lib/value/types';
async function main(){
 const changed=readCorpusJson<Array<{id:string;before:unknown;after:unknown}>>('business-backfill/verdict-changes.json')??[];
 for(const file of readdirSync(corpusPath('analysis')).filter(f=>f.endsWith('.json'))){
  const a=readCorpusJson<Analysis>(`analysis/${file}`);if(!a?.tests)continue;
  if(!Object.values(a.tests).some(t=>t.result!==t.numeric))continue;
  businessDiskGuard();writeCorpusJson(`business-backfill/verdict-before/${a.id}.json`,a);
  const snapshot=(d:Analysis)=>({tests:Object.fromEntries(Object.entries(d.tests).map(([k,t])=>[k,{result:t.result,numeric:t.numeric,cashConversion:t.metrics.oeToNi}])),value:d.valuation?.perShare.mid,tier:d.valuation?.tier,qualityPass:Object.values(d.tests).every(t=>t.result==='pass')});
  await analyze({only:[a.id],force:true,ask:async()=>Object.values(a.tests).flatMap(t=>t.jev),evidence:async({questions})=>Object.fromEntries(Object.keys(questions).map(q=>[q,Object.values(a.tests).flatMap(t=>t.jev).find(x=>x.q===q)?.evidence??null]))});
  const after=readCorpusJson<Analysis>(`analysis/${file}`)!;
  const existing=changed.find(c=>c.id===a.id);
  if(existing)existing.after=snapshot(after);else changed.push({id:a.id,before:snapshot(a),after:snapshot(after)});
 }
 writeCorpusJson('business-backfill/verdict-changes.json',changed);console.log(JSON.stringify(changed,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
