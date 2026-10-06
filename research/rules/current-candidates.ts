import {readFileSync,readdirSync,writeFileSync,existsSync,statfsSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {homedir} from 'node:os';
import {runNumericTests as baseline} from '../../.audit/rules/baseline/lib/value/tests';
import {runNumericTests as recovered_dip} from '../../.audit/rules/recovered_dip/lib/value/tests';
import {runNumericTests as recent_typical_margin} from '../../.audit/rules/recent_typical_margin/lib/value/tests';
import {runNumericTests as combined} from '../../.audit/rules/combined/lib/value/tests';
import {qualityLtmAt,qualityLtmHistoryAt} from '../../lib/value/quality-ltm';
import {cachedQualityQuarters} from '../../lib/value/cached-quality-quarters';
globalThis.fetch=async()=>{throw Error('NETWORK DISABLED');};
const corpus=homedir()+'/value-corpus',out='research/rules/outputs/current-candidates';mkdirSync(out,{recursive:true});
const read=(rel:string)=>existsSync(corpus+'/'+rel)?JSON.parse(readFileSync(corpus+'/'+rel,'utf8')):null;
let n=0;const mask=(tests:any)=>['understandable','moat','economics','management','accounting'].map(k=>tests[k].numeric[0].toUpperCase()).join('');
for(const file of readdirSync('research/rules/outputs/current')){
 const a=JSON.parse(gunzipSync(readFileSync('research/rules/outputs/current/'+file)).toString());
 if(existsSync(out+'/'+file))continue;
 const inputs=read(`analysis/inputs/${a.id}.json`),f=read(`fundamentals/${a.id}.json`);
 const years=inputs.memoYears,qs=cachedQualityQuarters(a.id,read),cutoff='2026-10-05';
 const qualityLtm=qualityLtmAt(qs,years,cutoff,f.splits),qualityLtmHistory=qualityLtmHistoryAt(qs,years,cutoff,f.splits,qualityLtm);
 const args={years,qualityLtm,qualityLtmHistory,kind:a.company.kind,industry:a.company.industry};
 const b=baseline(args);if(mask(b)!==mask(a.tests))throw Error('Current inputs drifted: '+a.id);
 const variants:any={};
 for(const [key,run] of Object.entries({recovered_dip,recent_typical_margin,combined})){
  const tests=run(args);if(mask(tests).slice(2)!==mask(b).slice(2))throw Error('Unrelated test changed: '+a.id);
  variants[key]={mask:mask(tests),changed:mask(tests)!==mask(b),tests:{understandable:tests.understandable,moat:tests.moat}};
 }
 writeFileSync(out+'/'+file,gzipSync(JSON.stringify({id:a.id,baseline:mask(b),variants})));
 for(const p of ['/',homedir()+'/data']){const s=statfsSync(p);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP');}
 if(++n>=100)break;
}
console.log('Current candidates evaluated',n);
