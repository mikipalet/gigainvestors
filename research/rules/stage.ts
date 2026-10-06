/** Controlled offline migration on an independent copy; same input rows in both arms. */
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync,realpathSync,statfsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {homedir} from 'node:os';
import {runNumericTests as baseline} from '../../.audit/rules/baseline/lib/value/tests';
import {runNumericTests as candidate} from '../../lib/value/tests';
import {qualityLtmAt,qualityLtmHistoryAt} from '../../lib/value/quality-ltm';
import {cachedQualityQuarters} from '../../lib/value/cached-quality-quarters';
import {attachJudgements} from '../../lib/value/judgement/apply';
import trust from '../../lib/value/judgement/trust.json';
import {valueCompany,valuationMargin} from '../../lib/value/valuation';
import {PIPELINE_VERSION} from '../../lib/value/analyze-company';
import {QUESTIONS_VERSION} from '../../lib/value/jev/questions';
const mode=process.argv[2];if(!['baseline','candidate'].includes(mode))throw Error('Specify comparison arm');
const corpus=realpathSync('.audit/rules/corpus');if(realpathSync(process.env.VALUE_CORPUS_DIR??'')!==corpus||corpus===realpathSync(homedir()+'/value-corpus'))throw Error('Independent copy required');
globalThis.fetch=async()=>{throw Error('Offline staging');};
const read=(p:string)=>existsSync(corpus+'/'+p)?JSON.parse(readFileSync(corpus+'/'+p,'utf8')):null;
const backup='.audit/rules/original-analyses';mkdirSync(backup,{recursive:true});const out='research/rules/outputs/staged-'+mode;mkdirSync(out,{recursive:true});
const frozen=new Set(read('verdict-freeze.json')?.ids??[]);let n=0;
const mask=(ts:any)=>['understandable','moat','economics','management','accounting'].map(k=>ts[k].numeric[0].toUpperCase()).join('');
for(const file of readdirSync('research/rules/outputs/current')){
 const recorded=JSON.parse(gunzipSync(readFileSync('research/rules/outputs/current/'+file)).toString()),id=recorded.id;
 if(recorded.company.kind!=='operating'||frozen.has(id)||existsSync(out+'/'+id+'.json'))continue;
 const saved=backup+'/'+file;if(!existsSync(saved))writeFileSync(saved,gzipSync(JSON.stringify(read('analysis/'+id+'.json'))));
 const original=JSON.parse(gunzipSync(readFileSync(saved)).toString());if(!original||original.status!=='scored')continue;
 const a=structuredClone(original),inputs=read('analysis/inputs/'+id+'.json'),f=read('fundamentals/'+id+'.json');
 const years=inputs.memoYears,qs=cachedQualityQuarters(id,read),ltm=qualityLtmAt(qs,years,'2026-10-05',f.splits),history=qualityLtmHistoryAt(qs,years,'2026-10-05',f.splits,ltm);
 const args={years,qualityLtm:ltm,qualityLtmHistory:history,kind:a.company.kind,industry:a.company.industry};
 const b=baseline(args);if(mask(b)!==mask(recorded.tests))throw Error('Copied inputs differ from audited inputs: '+id);
 const c=candidate(args),numeric=mode==='baseline'?b:c,run=mode==='baseline'?baseline:candidate;
 const raw=run({...args,years:years.map((y:any)=>{const r={...y};delete r.marginOperatingIncomeJudgement;delete r.maintenanceCapexJudgement;delete r.acquisitionIssuanceJudgement;return r;})});
 for(const [key,value] of Object.entries(numeric)){
  const clean={...value} as any;delete clean.auditChecks;
  a.tests[key]={...a.tests[key],...clean,result:value.numeric,jev:a.tests[key]?.jev??[]};
 }
 a.tests=attachJudgements(a,read('judgement/'+id+'.json'),trust,a.judgement?.adjustments??[],raw as any).tests;
 const originalQuality=mask(original.tests)==='PPPPP',baseQuality=mask(b)==='PPPPP',newQuality=mask(c)==='PPPPP';
 // Quality affects only compounder eligibility in valueCompany. Recompute both
 // comparison arms on identical persisted inputs where that dependency can move.
 const revalue=!!original.valuation&&a.volatility!=='volatile'&&(originalQuality!==baseQuality||baseQuality!==newQuality);
 if(revalue){
  const old=original.valuation,fx=old.perShareTrading;
  const result=valueCompany({years,kind:a.company.kind,bondYield:old.bondYield,cyclical:false,currency:a.reportingCurrency??f.currency,currentShares:old.shares,reportedShares:true,shareAssumptions:old.assumptions,shareSource:old.sharesSource,ttm:f.ttm??null,priceHistory:read('prices-history-long/'+id+'.json')??read('prices-history/'+id+'.json'),qualityPass:mask(numeric)==='PPPPP',investmentHolding:a.company.investmentHolding});
  a.valuation=result.valuation;a.valuationReason=result.reason;
  if(a.valuation&&fx)a.valuation.perShareTrading={...fx,...Object.fromEntries(Object.entries(a.valuation.perShare).map(([k,v])=>[k,(v as number)*fx.fxRate]))};
  a.requiredMos=valuationMargin(a.valuation,a.volatility);
 }
 a.versions={pipeline:PIPELINE_VERSION,questions:QUESTIONS_VERSION};
 writeFileSync(corpus+'/analysis/'+id+'.json',JSON.stringify(a)+'\n');
 writeFileSync(out+'/'+id+'.json',JSON.stringify({id,original:mask(original.tests),baseline:mask(b),candidate:mask(c),staged:mask(numeric),revalue,valuationChanged:JSON.stringify(original.valuation)!==JSON.stringify(a.valuation),pipelineBefore:original.versions,pipelineAfter:a.versions})+'\n');
 for(const p of ['/',homedir()+'/data']){const s=statfsSync(p);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP');}
 if(++n>=100)break;
}
console.log(mode,'staged',n);
