/** Repair a cached description overwrite only from the same filing's already
 * hashed reading inputs. Never move a reading onto a new report or new prose. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='/Users/miki/data/regress',corpus=root+'/corpus';
const read=(p:string)=>{try{return JSON.parse(readFileSync(corpus+'/'+p,'utf8'));}catch{return null;}};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const sectionHash=(s:Record<string,string>)=>hash(JSON.stringify(Object.entries(s).filter(([,v])=>v?.trim()).sort(([a],[b])=>a.localeCompare(b))));
const repairs:any[]=existsSync(root+'/evidence/bound-reading-repairs.json')?JSON.parse(readFileSync(root+'/evidence/bound-reading-repairs.json','utf8')):[];
for(const id of JSON.parse(readFileSync(process.env.RESTORE_IDS_FILE??root+'/evidence/released-ids.json','utf8'))){
 const cache=read(`jev/${id}.json`),meta=read(`reports/${id}/meta.json`),company=read(`companies/${id}.json`);
 for(const candidate of [corpus,'/Users/miki/data/value-cover']){
 const external=(file:string)=>{try{return JSON.parse(readFileSync(candidate+'/'+file,'utf8'));}catch{return null;}};
 const prior=external(`analysis/${id}.json`),inputs=external(`analysis/inputs/${id}.json`);
 if(!prior||!inputs?.sections||!cache||!meta||meta.kind==='description'||cache.version!==prior.versions.questions||cache.hash!==sectionHash(inputs.sections))continue;
 if(['kind','url','filed','period'].some(k=>meta[k]!==prior.report?.[k]))continue;
 const file=corpus+`/reports/${id}/business.txt`;
 if(!existsSync(file))continue;
 const current=readFileSync(file,'utf8'),bound=inputs.sections.business;
 if(!bound||bound.length<1000||current.length>=bound.length||current.trim()!==company?.description?.trim())continue;
 writeFileSync(file,bound);
 repairs.push({id,restoredFrom:candidate,path:`reports/${id}/business.txt`,source:meta.url,filed:meta.filed,readingHash:cache.hash,fromBytes:Buffer.byteLength(current),toBytes:Buffer.byteLength(bound),beforeSha256:hash(current),afterSha256:hash(bound),reason:'Provider description overwrote the same full filing section; restore exact existing source-bound reading text'});
}
}
writeFileSync(root+'/evidence/bound-reading-repairs.json',JSON.stringify(repairs,null,2));console.log(repairs.map(({id,fromBytes,toBytes})=>({id,fromBytes,toBytes})));
