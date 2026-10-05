/** Offline pipeline-26 -> 27 migration on fixed, persisted analysis inputs.
 * 25eca9a changes numeric evaluation to rolling LTM; no evidence is reacquired.
 * Run on the independent copy before BOTH exports. */
import {readFileSync,writeFileSync,realpathSync,statfsSync} from 'node:fs';
import {homedir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {runNumericTests} from '../../.audit/understandable/baseline/lib/value/tests';
import {qualityLtmAt,qualityLtmHistoryAt} from '../../lib/value/quality-ltm';
import {cachedQualityQuarters} from '../../lib/value/cached-quality-quarters';
import {attachJudgements} from '../../lib/value/judgement/apply';
import trust from '../../lib/value/judgement/trust.json';
import {combine,trustedContradictions} from '../../lib/value/jev/combine';
import {PIPELINE_VERSION} from '../../lib/value/analyze-company';
import {QUESTIONS_VERSION} from '../../lib/value/jev/questions';
const corpus=realpathSync('.audit/understandable/corpus');
if(realpathSync(process.env.VALUE_CORPUS_DIR??'')!==corpus||corpus===realpathSync(homedir()+'/value-corpus'))throw Error('Independent copy required');
const read=(p:string)=>{try{return JSON.parse(readFileSync(corpus+'/'+p,'utf8'));}catch{return null;}};
const entries=JSON.parse(readFileSync('research/understandable/outputs/current-screen.json','utf8')).changes;
const originals=JSON.parse(gunzipSync(readFileSync('research/understandable/inputs/current-analyses.json.gz')).toString());
const results:any[]=[];
for(const path of ['/',homedir()+'/data']){const s=statfsSync(path);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP: commit and stop');}
for(const {id} of entries){
 const original=originals[id];
 // Restore the first isolated staging attempt before paired pipeline migration.
 const a=structuredClone(original),inputs=read('analysis/inputs/'+id+'.json'),f=read('fundamentals/'+id+'.json');
 if(a.versions.pipeline!=='26'){writeFileSync(corpus+'/analysis/'+id+'.json',JSON.stringify(a)+'\n');continue;}
 const years=inputs.memoYears,qs=cachedQualityQuarters(id,read),ltm=qualityLtmAt(qs,years,'2026-10-05',f.splits),history=qualityLtmHistoryAt(qs,years,'2026-10-05',f.splits,ltm);
 const args={years,qualityLtm:ltm,qualityLtmHistory:history,kind:a.company.kind,industry:a.company.industry};
 const numeric=runNumericTests(args),raw=runNumericTests({...args,years:years.map((y:any)=>{const r={...y};delete r.marginOperatingIncomeJudgement;return r;})});
 for(const [key,n]of Object.entries(numeric)){
  const jev=a.tests[key].jev;
  a.tests[key]={...a.tests[key],...n,result:combine({numeric:n.numeric,jev,kind:a.company.kind}),jev,reasons:[...(n.numeric==='pass'?trustedContradictions(jev,a.company.kind).map(x=>`${x.label}: ${x.probability!>=.5?'yes':'no'} (filing evidence)`):[]),...n.reasons]};
 }
 a.tests=attachJudgements(a,read('judgement/'+id+'.json'),trust,a.judgement?.adjustments??[],raw as any).tests;
 if(a.volatility!=='volatile')throw Error('Valuation quality dependency needs reevaluation: '+id);
 const verdicts=Object.keys(a.tests).filter(k=>a.tests[k].result!==original.tests[k].result);
 if(verdicts.length)throw Error('Unrelated pipeline migration verdict changes: '+id+' '+verdicts.join(','));
 a.versions={pipeline:PIPELINE_VERSION,questions:QUESTIONS_VERSION};
 results.push({id,before:original.versions,after:a.versions,changedTests:Object.keys(a.tests).filter(k=>JSON.stringify(a.tests[k])!==JSON.stringify(original.tests[k])),verdictChanges:verdicts});
 writeFileSync(corpus+'/analysis/'+id+'.json',JSON.stringify(a)+'\n');
}
writeFileSync('research/understandable/outputs/pipeline-refresh.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
