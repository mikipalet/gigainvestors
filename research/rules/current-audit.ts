import {readFileSync,readdirSync,writeFileSync,existsSync,statfsSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {homedir} from 'node:os';
import {runNumericTests} from '../../.audit/rules/baseline/lib/value/tests';
import {qualityLtmAt,qualityLtmHistoryAt} from '../../lib/value/quality-ltm';
import {cachedQualityQuarters} from '../../lib/value/cached-quality-quarters';
globalThis.fetch=async()=>{throw Error('NETWORK DISABLED');};
const corpus=homedir()+'/value-corpus';
const read=(rel:string)=>existsSync(corpus+'/'+rel)?JSON.parse(readFileSync(corpus+'/'+rel,'utf8')):null;
const rows:any[]=[],errors:any[]=[];mkdirSync('research/rules/outputs/current',{recursive:true});let n=0;
for(const file of readdirSync(corpus+'/publish-repo/dossiers').filter(f=>/^\d{3}\.json$/.test(f))){
 for(const a of Object.values(read('publish-repo/dossiers/'+file)) as any[]){
  if(existsSync(`research/rules/outputs/current/${a.id}.json.gz`))continue;const inputs=read(`analysis/inputs/${a.id}.json`),f=read(`fundamentals/${a.id}.json`);
  if(!inputs?.memoYears||!f){errors.push({id:a.id,reason:'missing persisted inputs'});continue;}
  const years=inputs.memoYears,qs=cachedQualityQuarters(a.id,read),cutoff='2026-10-05';
  const qualityLtm=qualityLtmAt(qs,years,cutoff,f.splits),qualityLtmHistory=qualityLtmHistoryAt(qs,years,cutoff,f.splits,qualityLtm);
  const tests=runNumericTests({years,qualityLtm,qualityLtmHistory,kind:a.company.kind,industry:a.company.industry});
  const row={id:a.id,company:a.company,tests,published:Object.fromEntries(Object.entries(a.tests).map(([k,t]:any)=>[k,t.result])),valuation:a.valuation,volatility:a.volatility};writeFileSync(`research/rules/outputs/current/${a.id}.json.gz`,gzipSync(JSON.stringify(row)));if(++n>=100)process.exit(0);
 }
 for(const p of ['/',homedir()+'/data']){const s=statfsSync(p);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP');}
}
writeFileSync('research/rules/outputs/current-audit.json.gz',gzipSync(JSON.stringify({rows,errors})));
console.log('Current audit',rows.length,'errors',errors.length);
