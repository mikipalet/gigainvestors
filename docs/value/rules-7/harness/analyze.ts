import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,appendFileSync,existsSync,statfsSync} from 'node:fs';
import analyze from '../../../../scripts/value/stages/analyze';
import {askCompany} from '../../../../lib/value/jev/run';
import {QUESTIONS_VERSION} from '../../../../lib/value/jev/questions';
const root='/Users/miki/data/value-rules/.audit/rules-7',corpus=root+'/corpus';
const implementationFiles=['lib/value/completeness/rules-7-facts.json','lib/value/issuer-separation.ts','lib/value/issuer-registry.json','lib/value/owner-earnings.ts','lib/value/valuation.ts','lib/value/valuation-inputs.ts','lib/value/companies.ts','lib/value/method-version.ts','lib/value/tests/understandable.ts','lib/value/tests/moat.ts','lib/value/tests/management.ts','lib/value/tests/index.ts','lib/value/analyze-company.ts','lib/value/annual-source-corrections.ts','lib/value/share-fact-scale.ts','lib/value/completeness/cached-years.ts','lib/value/completeness/reported-facts.ts','lib/value/latest-balance.ts','lib/value/config.ts','scripts/value/stages/analyze.ts'];
const implementationHash=()=>createHash('sha256').update(implementationFiles.map(p=>p+'\n'+readFileSync((process.env.REGRESS_CODE_DIR??'.')+'/'+p,'utf8')).join('\n')).digest('hex');
const started=new Date().toISOString(),implementationSha256=implementationHash();
const read=(p:string)=>{try{return JSON.parse(readFileSync(corpus+'/'+p,'utf8'));}catch{return null;}};
if(process.env.VALUE_CORPUS_DIR!==corpus||!process.env.NODE_OPTIONS?.includes('preload.cjs'))throw Error('Isolated corpus/network guard required');
const check=()=>{for(const p of ['/',root]){const s=statfsSync(p);if(s.bavail*s.bsize<4*1024**3)throw Error('DISK STOP');}if(existsSync(root+'/evidence/DISK_STOP'))throw Error('DISK STOP');};
const ids=process.env.REGRESS_IDS_FILE?JSON.parse(readFileSync(process.env.REGRESS_IDS_FILE,'utf8')):process.env.REGRESS_IDS?.split(',');
const receipt=root+'/evidence/'+(process.env.REGRESS_RUN??'analyze')+'-cache-receipt.json';
const evidence=new Map<string,Record<string,string|null>>();
const receipts:any[]=[];
(async()=>{if(process.env.REGRESS_RUN==='candidate'&&!process.env.RULES_WORKER){await (await import('./analyze-full')).runFull();return;} await analyze({only:ids,ask:async args=>{
 check();
 const entries=Object.entries(args.sections).filter(([,v])=>v?.trim()).sort(([a],[b])=>a.localeCompare(b));
 const hash=createHash('sha256').update(JSON.stringify(entries)).digest('hex');
 const cache=read(`jev/${encodeURIComponent(args.id)}.json`);
 if(cache?.version!==QUESTIONS_VERSION||cache.hash!==hash)throw Error(`Cached reading unavailable or changed: ${args.id}`);
 const prior=read(`analysis/${args.id}.json`),inputs=read(`analysis/inputs/${args.id}.json`);
 for(const [key,section]of entries){
  const answers=Object.values(prior?.tests??{}).flatMap((t:any)=>t.jev??[]).filter((a:any)=>a.section===key);
  if(section===inputs?.sections?.[key])evidence.set(section!,Object.fromEntries(answers.map((a:any)=>[a.q,a.evidence??null])));
  while(evidence.size>64)evidence.delete(evidence.keys().next().value!);
 }
 receipts.push({id:args.id,hash,version:cache.version});
 if(receipts.length%100===0)console.log(`Cached readings: ${receipts.length}`);
 return askCompany(args);
},evidence:async args=>Object.fromEntries(Object.keys(args.questions).map(q=>[q,evidence.get(args.section)?.[q]??null]))});
writeFileSync(receipt,JSON.stringify({started,completed:new Date().toISOString(),implementationSha256,implementationUnchanged:implementationHash()===implementationSha256,count:receipts.length,readings:receipts},null,2));

})().catch(error=>{writeFileSync(receipt,JSON.stringify({started,completed:new Date().toISOString(),implementationSha256,implementationUnchanged:implementationHash()===implementationSha256,count:receipts.length,readings:receipts,error:error.message},null,2));console.error(error.message);process.exitCode=1;});
