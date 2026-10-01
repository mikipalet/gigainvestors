import { isThesisCandidate, thesisFingerprint, thesisNeedsRefresh, THESIS_DAILY_LIMIT, THESIS_CALL_LIMIT } from '../../../lib/value/thesis/refresh';
import defaults from '../../../lib/value/thesis/official-sources.json';
import { gzipSync, gunzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
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
 const overrides:Record<string,OfficialSource[]>={...defaults as Record<string,OfficialSource[]>,...readCorpusJson<Record<string,OfficialSource[]>>('thesis/official-sources.json')};
 const eligible=all.filter(c=>isThesisCandidate(c.triggers)&&(!only||only.includes(c.company.id))).map(c=>{
  const {asOf:_date,...analysis}=c.analysis;
  const report=['meta.json','business.txt','risk.txt','mdna.txt','notes.txt','auditor.txt','capital.txt'].map(file=>{
   const p=corpusPath(`reports/${c.company.id}/${file}`);return existsSync(p)?readFileSync(p,'utf8'):null;
  });
  const official=(overrides[c.company.id]??[]).map(source=>({...source,text:source.textFile&&existsSync(corpusPath(source.textFile))?readFileSync(corpusPath(source.textFile),'utf8'):null}));
  const inputFingerprint=thesisFingerprint({company:c.company,analysis,fundamentals:c.fundamentals,market:c.market,report,official});
  const prior=readCorpusJson<ThesisResult>(`thesis/${c.company.id}.json`);
  return {...c,inputFingerprint,prior};
 });
 const due=eligible.filter(c=>force||thesisNeedsRefresh(c.prior,c.inputFingerprint,asOf)).sort((a,b)=>(a.prior?.asOf??'').localeCompare(b.prior?.asOf??'')||Number(b.triggers.includes('buy'))-Number(a.triggers.includes('buy'))||a.company.id.localeCompare(b.company.id));
 const candidates=due.slice(0,limit??THESIS_DAILY_LIMIT);
 console.log(`thesis: eligible=${eligible.length} cached=${eligible.length-due.length} due=${due.length} selected=${candidates.length} deferred=${due.length-candidates.length} callLimit=${THESIS_CALL_LIMIT}`);
 let calls=0;
 diskGuard();writeCorpusJson('thesis/selection.json',{asOf,companies:all.map(c=>({id:c.company.id,name:c.company.name,triggers:c.triggers,drawdownFromMonthlyCloses:c.drawdown}))});
 const ask=async(input:Parameters<typeof askJev>[0])=>{diskGuard();if(calls>=THESIS_CALL_LIMIT)throw new Error('Thesis Jev call budget exhausted');calls++;return askJev({...input,usageFile:'thesis/jev-usage.jsonl'});};
 try { await pool({items:candidates,concurrency:1,run:async({company,analysis,fundamentals:f,triggers,market,inputFingerprint})=>{
  diskGuard();
  const {sources,gaps}=await companySources(company,asOf,overrides[company.id]);
  const latest=f?.years.at(-1);
  const context=`Company ${company.name}; reporting currency ${market.currency}. Market value ${market.marketValue??'not supplied'}; annual owner earnings ${market.ownerEarnings??'not available'} absolute reporting units; market date ${market.asOf}. Materiality is calculated separately as exposure >10% of market value. Prior full-year revenue ${latest?.revenue??'not supplied'}; prior full-year operating profit ${latest?.operatingIncome??'not supplied'} absolute reporting units.`;
  const fingerprint=createHash('sha256').update(JSON.stringify({version:THESIS_VERSION,asOf,context,sources})).digest('hex');
  const recordingPath=corpusPath(`thesis/recordings/${company.id}.json.gz`);
  const recorded=existsSync(recordingPath)?JSON.parse(gunzipSync(readFileSync(recordingPath)).toString()) as NonNullable<ThesisResult['recordings']>:[];
  const cached=new Map(recorded.map(r=>[`${r.stateHash}:${JSON.stringify(r.questions)}`,r.answers]));
  let reused=0;
  const companyAsk:typeof ask=async input=>{
   diskGuard();
   const key=`${createHash('sha256').update(input.state).digest('hex')}:${JSON.stringify(input.questions)}`;
   const answers=cached.get(key);
   if(!force&&answers){reused++;return {answers,usage:{input_tokens:0}};}
   return ask(input);
  };
  const reading=await readThesis(sources,asOf,context,companyAsk);
  await extractAmounts(reading.answers,f?.currency??analysis.valuation?.currency??'',latest,async input=>{
   const response=await companyAsk(input);
   reading.recordings.push({stateHash:createHash('sha256').update(input.state).digest('hex'),questions:input.questions,answers:response.answers});
   return response;
  });
  const priorOwnerEarnings=f?ownerEarningsBridge(f.years).at(-1)?.value:null;
  for(const answer of reading.answers)if(answer.guidance&&priorOwnerEarnings!=null)answer.guidance.priorOwnerEarnings=priorOwnerEarnings;
  const result:ThesisResult={id:company.id,version:THESIS_VERSION,asOf,fingerprint,inputFingerprint,triggers,answers:reading.answers,sources:sources.map(({text,...s})=>s),gaps,market};
  diskGuard();mkdirSync(corpusPath('thesis/recordings'),{recursive:true});
  writeFileSync(corpusPath(`thesis/recordings/${company.id}.json.gz`),gzipSync(JSON.stringify(reading.recordings)));
  writeCorpusJson(`thesis/${company.id}.json`,result);
  console.log(`thesis ${company.id}: ${reading.answers.map(a=>`${a.id.replace('thesis_','')}=${a.value}`).join(' ')}; ${gaps.length} coverage gaps; ${reused} identical recorded calls reused`);
 }}); } finally { console.log(`thesis: Jev calls=${calls}/${THESIS_CALL_LIMIT}; selected=${candidates.length}`); }
 console.log(`thesis: ${candidates.length} candidates processed; results in thesis/`);
}
