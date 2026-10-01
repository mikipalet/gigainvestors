import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { askJev } from '../../../lib/value/jev/client';
import { classify } from '../../../lib/value/judgement/read';
import { TOPICS, JUDGEMENT_VERSION, questionVersion } from '../../../lib/value/judgement/questions';
import { diskGuard } from '../../../lib/value/thesis/sources';
import { readCorpusJson, writeCorpusJson } from '../../../lib/value/corpus';
import type { Evidence, Trust } from '../../../lib/value/judgement/types';
export default async function calibrate(){
 const file=path.resolve(__dirname,'../../../tests/fixtures/value/judgement/calibration.json');
 const fixture=JSON.parse(readFileSync(file,'utf8')) as {cases:Array<{id:string;topic:string;company:string;expected:string;evidence:Evidence}>};
 const previous=readCorpusJson<{results:any[]}>('judgement/calibration.json');
 const results=[];
 for(const c of fixture.cases){
  diskGuard();const old=previous?.results.find(r=>r.topic===c.topic&&r.reading.version===questionVersion(c.topic)&&JSON.stringify(r.evidence)===JSON.stringify(c.evidence)&&JSON.stringify(r.recording.questions[c.topic])===JSON.stringify(TOPICS[c.topic].question));
  const result=old?{reading:old.reading,recording:old.recording}:await classify(c.topic,c.evidence,input=>askJev({...input,usageFile:'judgement/jev-usage.jsonl'}));
  results.push({...c,...result,correct:c.expected===result.reading.value});
  console.log(c.id,result.reading.value,c.expected===result.reading.value?'ok':`expected ${c.expected}`);
 }
 const trust:Trust={};
 for(const id of Object.keys(TOPICS)){
  const rows=results.filter(r=>r.topic===id);
  trust[id]={version:questionVersion(id),accuracy:rows.filter(r=>r.correct).length/rows.length,n:rows.length,positive:rows.filter(r=>r.expected!=='unclear').length,negative:rows.filter(r=>r.expected==='unclear').length};
 }
 const summary={asOf:new Date().toISOString(),fixtureHash:createHash('sha256').update(readFileSync(file)).digest('hex'),trust,results};
 writeCorpusJson('judgement/calibration.json',summary);
 writeFileSync(path.resolve(__dirname,'../../../tests/fixtures/value/judgement/recorded-jev.json'),JSON.stringify(summary,null,2)+'\n');
 writeFileSync(path.resolve(__dirname,'../../../lib/value/judgement/trust.json'),JSON.stringify(trust,null,2)+'\n');
 console.log(JSON.stringify(trust));
}
