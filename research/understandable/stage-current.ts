/** Evaluate the frozen candidate on an independent corpus copy, from persisted
 * analysis inputs. Other tests are preserved; valuation uses the existing rule. */
import {existsSync,readFileSync,writeFileSync,statfsSync,realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {homedir} from 'node:os';
import {isDeepStrictEqual} from 'node:util';
import {runNumericTests as baseline} from '../../.audit/understandable/baseline/lib/value/tests';
import {runNumericTests as candidate} from '../../lib/value/tests';
import {qualityLtmAt,qualityLtmHistoryAt} from '../../lib/value/quality-ltm';
import {cachedQualityQuarters} from '../../lib/value/cached-quality-quarters';
import {attachJudgements} from '../../lib/value/judgement/apply';
import judgementTrust from '../../lib/value/judgement/trust.json';
import {trustedContradictions} from '../../lib/value/jev/combine';
const corpus=resolve('.audit/understandable/corpus');
if(realpathSync(process.env.VALUE_CORPUS_DIR??'')!==realpathSync(corpus)||realpathSync(corpus)===realpathSync(homedir()+'/value-corpus'))throw Error('Independent corpus copy required');
globalThis.fetch=async()=>{throw Error('Offline proof');};
const read=(rel:string)=>existsSync(corpus+'/'+rel)?JSON.parse(readFileSync(corpus+'/'+rel,'utf8')):null;
const screen=JSON.parse(readFileSync(new URL('./outputs/current-screen.json',import.meta.url),'utf8'));
const changes:any[]=[];
for(const entry of screen.changes){
 const id=entry.id,a=read(`analysis/${id}.json`),f=read(`fundamentals/${id}.json`),inputs=read(`analysis/inputs/${id}.json`);
 if(!a||!f||!inputs?.memoYears)throw Error('Incomplete copied inputs: '+id);
 const years=inputs.memoYears,qs=cachedQualityQuarters(id,read),cutoff='2026-10-05';
 const ltm=qualityLtmAt(qs,years,cutoff,f.splits),history=qualityLtmHistoryAt(qs,years,cutoff,f.splits,ltm);
 const args={years,qualityLtm:ltm,qualityLtmHistory:history,kind:a.company.kind,industry:a.company.industry};
 const b=baseline(args).understandable,c=candidate(args).understandable;
 if(b.numeric!==a.tests.understandable.numeric)throw Error('Baseline numeric mismatch: '+id);
 if(c.numeric===b.numeric)throw Error('Expected change disappeared: '+id);
 const old=structuredClone(a),jev=a.tests.understandable.jev;
 a.tests.understandable={...a.tests.understandable,...c,result:c.numeric,jev,reasons:[...(c.numeric==='pass'?trustedContradictions(jev,a.company.kind).map(x=>`${x.label}: ${x.probability!>=.5?'yes':'no'} (filing evidence)`):[]),...c.reasons]};
 const rawYears=years.map((y:any)=>{const copy={...y};delete copy.marginOperatingIncomeJudgement;return copy;});
 const raw=candidate({...args,years:rawYears}).understandable;
 a.tests.understandable=attachJudgements({...a,tests:{understandable:a.tests.understandable}},read(`judgement/${id}.json`),judgementTrust,a.judgement?.adjustments??[],{understandable:raw} as any).tests.understandable;
 // The only valuation quality dependency is compounder eligibility, which
 // requires !cyclical. Every exception here retains raw CV > 0.35, so that
 // dependency stays disabled and the complete stored valuation is unchanged.
 if(c.metrics.opMarginCv!==b.metrics.opMarginCv || !(c.metrics.opMarginCv!>.35))throw Error('Unexpected valuation-volatility input change: '+id);
 if(a.volatility!=='volatile')throw Error('Expected existing volatile valuation classification: '+id);
 for(const key of ['moat','economics','management','accounting'])if(!isDeepStrictEqual(old.tests[key],a.tests[key]))throw Error('Unrelated test changed: '+id);
 writeFileSync(corpus+`/analysis/${id}.json`,JSON.stringify(a)+'\n');
 changes.push({id,before:b.numeric,after:c.numeric,reason:c.reasons,valuationChanged:!isDeepStrictEqual(old.valuation,a.valuation)});
}
writeFileSync(new URL('./outputs/staged-current.json',import.meta.url),JSON.stringify(changes,null,2)+'\n');
for(const p of ['/',homedir()+'/data']){const s=statfsSync(p);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP: commit and stop');}
console.log('Staged',changes.length,'understandable verdict changes');
