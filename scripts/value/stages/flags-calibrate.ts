import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {askJev} from '../../../lib/value/jev/client';
import {readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {diskGuard} from '../../../lib/value/thesis/sources';
import {classifySignal,classifyRelationship,type Passage} from '../../../lib/value/flags/extract';
import {extractionVersion} from '../../../lib/value/flags/questions';
import type {Company} from '../../../lib/value/types';
export default async function calibrate(){
 const fixture=JSON.parse(readFileSync('tests/fixtures/value/flags/calibration.json','utf8')) as {cases:Array<{id:string;company:string;topic:'signal'|'relationship';expected:string;counterparty?:string;evidence:Passage}>};
 const results:any[]=[];let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<fixture.cases.length){
  const c=fixture.cases[cursor++];diskGuard();const cache=`flags/calibration/${createHash('sha256').update(JSON.stringify(c)+extractionVersion(c.topic)).digest('hex')}.json`;
  let result=readCorpusJson<any>(cache);
  if(!result){
   const company=readCorpusJson<Company>(`companies/${c.company}.json`),ask=(input:Parameters<typeof askJev>[0])=>askJev({...input,usageFile:'flags/jev-usage.jsonl'});
   result=c.topic==='signal'?await classifySignal(c.evidence,ask):await classifyRelationship(c.evidence,{id:c.company,name:company?.name??c.company},c.counterparty!,ask);
   writeCorpusJson(cache,result);
  }
  const actual=result.signal??result.relation;results.push({...c,...result,actual,correct:actual===c.expected});console.log(c.id,actual,actual===c.expected?'ok':`expected ${c.expected}`);
 }}));
 const trust=Object.fromEntries(['signal','relationship'].map(topic=>{
  const rows=results.filter(r=>r.topic===topic),positive=rows.filter(r=>r.expected!=='none'),negative=rows.filter(r=>r.expected==='none');
  // Balanced accuracy cannot be inflated by a large negative class.
  const accuracy=Math.min(rows.filter(r=>r.correct).length/rows.length,positive.filter(r=>r.correct).length/positive.length,negative.filter(r=>r.correct).length/negative.length);
  return [topic,{version:extractionVersion(topic as 'signal'|'relationship'),accuracy,n:rows.length,positive:positive.length,negative:negative.length,classes:Object.fromEntries([...new Set(positive.map(r=>r.expected))].map(kind=>{const cases=rows.filter(r=>r.expected===kind||r.actual===kind);return [kind,cases.filter(r=>r.correct).length/cases.length]}))}];
 }));
 const summary={asOf:new Date().toISOString(),trust,results:results.sort((a,b)=>a.id.localeCompare(b.id))};
 diskGuard();writeCorpusJson('flags/calibration.json',summary);writeFileSync('tests/fixtures/value/flags/recorded-jev.json',JSON.stringify(summary,null,2)+'\n');writeFileSync('lib/value/flags/trust.json',JSON.stringify(trust,null,2)+'\n');console.log(trust);
}
