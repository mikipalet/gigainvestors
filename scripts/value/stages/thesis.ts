import defaults from '../../../lib/value/thesis/official-sources.json';
import { gzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { corpusPath } from '../../../lib/value/corpus';
import { pool } from '../../../lib/value/http';
import { ownerEarningsBridge } from '../../../lib/value/owner-earnings';
import { createHash } from 'node:crypto';
import { readCorpusJson, writeCorpusJson } from '../../../lib/value/corpus';
import { askJev } from '../../../lib/value/jev/client';
import { readThesis } from '../../../lib/value/thesis/evidence';
import { extractAmounts } from '../../../lib/value/thesis/amounts';
import { companySources, diskGuard, type OfficialSource } from '../../../lib/value/thesis/sources';
import { selectThesisCandidates } from '../../../lib/value/thesis/select';
import { THESIS_VERSION } from '../../../lib/value/thesis/questions';
import type { ThesisResult } from '../../../lib/value/thesis/types';

export default async function thesis({only,limit,force=false}:{only?:string[];limit?:number;force?:boolean}):Promise<void>{
 diskGuard();const asOf=new Date().toISOString().slice(0,10);
 const all=selectThesisCandidates(asOf);
 const candidates=all.filter(c=>!only||only.includes(c.company.id)).sort((a,b)=>Number(b.triggers.includes('buy'))-Number(a.triggers.includes('buy'))||a.company.id.localeCompare(b.company.id)).slice(0,limit);
 const overrides:Record<string,OfficialSource[]>={...defaults as Record<string,OfficialSource[]>,...readCorpusJson<Record<string,OfficialSource[]>>('thesis/official-sources.json')};
 diskGuard();writeCorpusJson('thesis/selection.json',{asOf,companies:all.map(c=>({id:c.company.id,name:c.company.name,triggers:c.triggers,drawdownFromMonthlyCloses:c.drawdown}))});
 const ask=async(input:Parameters<typeof askJev>[0])=>{diskGuard();return askJev({...input,usageFile:'thesis/jev-usage.jsonl'});};
 await pool({items:candidates,concurrency:4,run:async({company,analysis,fundamentals:f,triggers})=>{
  diskGuard();
  const {sources,gaps}=await companySources(company,asOf,overrides[company.id]);
  const latest=f?.years.at(-1);
  const context=`Company ${company.name}; reporting currency ${f?.currency??analysis.valuation?.currency}. Latest annual shareholders equity ${latest?.equity??'not supplied'} absolute reporting units, fiscal year ${latest?.fy??'unknown'}. Prior full-year revenue ${latest?.revenue??'not supplied'}; prior full-year operating profit ${latest?.operatingIncome??'not supplied'} absolute reporting units.`;
  const fingerprint=createHash('sha256').update(JSON.stringify({version:THESIS_VERSION,asOf,context,sources})).digest('hex');
  const prior=readCorpusJson<ThesisResult>(`thesis/${company.id}.json`);
  if(!force&&prior?.fingerprint===fingerprint){console.log(`thesis ${company.id}: cached`);return;}
  const reading=await readThesis(sources,asOf,context,ask);
  await extractAmounts(reading.answers,f?.currency??analysis.valuation?.currency??'',latest,async input=>{
   const response=await ask(input);
   reading.recordings.push({stateHash:createHash('sha256').update(input.state).digest('hex'),questions:input.questions,answers:response.answers});
   return response;
  });
  const priorOwnerEarnings=f?ownerEarningsBridge(f.years).at(-1)?.value:null;
  for(const answer of reading.answers)if(answer.guidance&&priorOwnerEarnings!=null)answer.guidance.priorOwnerEarnings=priorOwnerEarnings;
  const result:ThesisResult={id:company.id,version:THESIS_VERSION,asOf,fingerprint,triggers,answers:reading.answers,sources:sources.map(({text,...s})=>s),gaps};
  diskGuard();mkdirSync(corpusPath('thesis/recordings'),{recursive:true});
  writeFileSync(corpusPath(`thesis/recordings/${company.id}.json.gz`),gzipSync(JSON.stringify(reading.recordings)));
  writeCorpusJson(`thesis/${company.id}.json`,result);
  console.log(`thesis ${company.id}: ${reading.answers.map(a=>`${a.id.replace('thesis_','')}=${a.value}`).join(' ')}; ${gaps.length} coverage gaps`);
 }});
 console.log(`thesis: ${candidates.length} candidates processed; results in thesis/`);
}
