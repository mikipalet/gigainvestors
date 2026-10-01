import {reportedAdjustmentFacts} from '../../../lib/value/judgement/amounts';
import {createHash} from 'node:crypto';
import { readCorpusJson, writeCorpusJson } from '../../../lib/value/corpus';
import { universeCompanies } from '../../../lib/value/companies';
import { askJev } from '../../../lib/value/jev/client';
import { diskGuard } from '../../../lib/value/thesis/sources';
import { judgementSources } from '../../../lib/value/judgement/sources';
import { readBusiness } from '../../../lib/value/judgement/read';
import { JUDGEMENT_VERSION, TOPICS } from '../../../lib/value/judgement/questions';
import type { Analysis } from '../../../lib/value/types';
import type { JudgementRecord } from '../../../lib/value/judgement/types';
import analyze from './analyze';
export default async function judgement({only,limit,force}:{only?:string[];limit?:number;force?:boolean}){
 const selected=universeCompanies().filter(c=>!only||only.includes(c.id)).slice(0,limit);
 const failures:string[]=[];
 const questionsHash=createHash('sha256').update(JSON.stringify(TOPICS)).digest('hex');
 for(const company of selected){
  diskGuard();
  const analysis=readCorpusJson<Analysis>(`analysis/${company.id}.json`);if(!analysis)continue;
  if(!readCorpusJson(`judgement/before/${company.id}.json`))writeCorpusJson(`judgement/before/${company.id}.json`,analysis);
  try{
   const {sources,facts}=await judgementSources(company,analysis.report);
   const previous=readCorpusJson<JudgementRecord>(`judgement/${company.id}.json`);
   if(force||previous?.version!==JUDGEMENT_VERSION||previous.questionsHash!==questionsHash||previous.inputHash!==createHash('sha256').update(JSON.stringify(sources)).digest('hex')){
    const result=await readBusiness(sources,input=>{diskGuard();return askJev({...input,usageFile:'judgement/jev-usage.jsonl'});});
    writeCorpusJson(`judgement/${company.id}.json`,{id:company.id,version:JUDGEMENT_VERSION,questionsHash,asOf:new Date().toISOString(),numericFacts:reportedAdjustmentFacts(sources,analysis.reportingCurrency??analysis.valuation?.currency??company.currency),facts,...result});
    console.log(`${company.id}: ${result.readings.filter(r=>r.value!=='unclear').length} evidenced readings`);
   }
   // Freeze the existing report answers; only the new judgement calls need the service.
   const baseline=readCorpusJson<Analysis>(`judgement/before/${company.id}.json`)??analysis;
   const priorEvidence=Object.values(baseline.tests).flatMap(t=>t.jev);
   await analyze({only:[company.id],force:true,ask:async()=>Object.values(analysis.tests).flatMap(t=>t.jev),
    evidence:async({questions})=>Object.fromEntries(Object.keys(questions).map(id=>[id,priorEvidence.find(a=>a.q===id)?.evidence??null]))});
  }catch(e){failures.push(company.id);console.error(`${company.id}: ${e instanceof Error?e.message:'judgement failed'}`);}
 }
 if(failures.length)throw Error(`Judgement failed: ${failures.join(', ')}`);
}
