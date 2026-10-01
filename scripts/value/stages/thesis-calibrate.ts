import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { askJev } from '../../../lib/value/jev/client';
import { readThesis } from '../../../lib/value/thesis/evidence';
import { diskGuard } from '../../../lib/value/thesis/sources';
import { THESIS_QUESTIONS, THESIS_VERSION } from '../../../lib/value/thesis/questions';
import { questionTrusted } from '../../../lib/value/thesis/decision';
import { writeCorpusJson } from '../../../lib/value/corpus';
import type { ThesisSource, ThesisQuestionId, ThesisTrust } from '../../../lib/value/thesis/types';
export default async function calibrate():Promise<void>{
 diskGuard();
 const file=path.resolve(__dirname,'../../../tests/fixtures/value/thesis/calibration.json');
 const fixture=JSON.parse(readFileSync(file,'utf8')) as {cases:Array<{id:string;asOf:string;context:string;sources:ThesisSource[];expected:Record<ThesisQuestionId,string>}>};
 const results=[];
 for(const item of fixture.cases){
  diskGuard();
  const result=await readThesis(item.sources,item.asOf,item.context,input=>askJev({...input,usageFile:'thesis/jev-usage.jsonl'}));
  const graded=result.answers.map(answer=>({id:answer.id,expected:item.expected[answer.id],actual:answer.value,correct:answer.value===item.expected[answer.id]&&(answer.value!=='yes'||!!answer.evidence)}));
  const record={id:item.id,...result,graded};
  diskGuard();writeCorpusJson(`thesis/calibration/${item.id}-result.json`,record);results.push(record);
  console.log(item.id,graded.map(g=>`${g.id.replace('thesis_','')}=${g.actual}${g.correct?'':' [mismatch]'}`).join(' '));
 }
 const thesis:ThesisTrust={};
 for(const id of Object.keys(THESIS_QUESTIONS) as ThesisQuestionId[]){
  const rows=results.flatMap(r=>r.graded).filter(g=>g.id===id);
  thesis[id]={version:THESIS_VERSION,accuracy:rows.filter(g=>g.correct).length/rows.length,n:rows.length,positives:rows.filter(g=>g.expected==='yes').length,negatives:rows.filter(g=>g.expected==='no').length};
 }
 const trustPath=path.resolve(__dirname,'../../../lib/value/jev-trust.json');
 const trust=JSON.parse(readFileSync(trustPath,'utf8'));
 trust.thesis=thesis;trust.thesis_calibration={graded_at:new Date().toISOString(),fixture_sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),method:'Official filing excerpt labels; accuracy >=0.90, with both positive and negative labels; yes requires an exact selected filing passage and a second affirmative on that passage alone; positive evidence must be dated within 18 months. No trust granted to all-negative question sets.'};
 const ids=new Set(Object.keys(THESIS_QUESTIONS));trust.trusted=trust.trusted.filter((id:string)=>!ids.has(id));
 for(const [id,grade]of Object.entries(thesis)){trust.versions[id]=THESIS_VERSION;trust.agreement[id]=grade.accuracy;if(questionTrusted(THESIS_VERSION,grade))trust.trusted.push(id);}
 diskGuard();writeFileSync(trustPath,JSON.stringify(trust,null,2)+'\n');
 writeCorpusJson('thesis/calibration/summary.json',{thesis,results:results.map(r=>({id:r.id,graded:r.graded}))});
 console.log(JSON.stringify(thesis));
}
