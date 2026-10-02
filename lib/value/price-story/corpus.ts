import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync,statfsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import path from 'node:path';
import {corpusPath} from '../corpus';
import {eodhd} from '../eodhd';
import type {Dossier,PriceMap} from '../types';
import type {Source} from '../judgement/read';
import {filingCandidates,newsCandidates,type Candidate} from './selection';
const root=()=>corpusPath('price-story');
let lastCheck=0;
export function storyDiskGuard(){
 const disk=statfsSync('.');if(disk.bavail*disk.bsize<6*1024**3)throw Error('DISK STOP: below 6 GiB');
 if(Date.now()-lastCheck<10000)return;lastCheck=Date.now();
 mkdirSync(root(),{recursive:true});
 const paths=[process.cwd(),root()];
 const bytes=execFileSync('du',['-sk',...paths],{encoding:'utf8'}).trim().split('\n').reduce((n,s)=>n+Number(s.split(/\s/)[0])*1024,0);
 const file=path.join(root(),'disk-budget.json'),prior=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{baselineBytes:bytes,startedAt:new Date().toISOString(),worktree:process.cwd()};
 if(prior.worktree!==process.cwd())throw Error('Story budget belongs to another worktree');
 if(bytes-prior.baselineBytes>1_900_000_000)throw Error('DISK STOP: approaching 2 GB new-artifact ceiling');
 writeFileSync(file,JSON.stringify({...prior,newBytes:Math.max(0,bytes-prior.baselineBytes),freeBytes:disk.bavail*disk.bsize}));
}
export function readGzip<T>(file:string):T|null{return existsSync(file)?JSON.parse(gunzipSync(readFileSync(file)).toString()):null;}
export function writeGzip(file:string,value:unknown){storyDiskGuard();mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file+'.tmp',gzipSync(JSON.stringify(value)));renameSync(file+'.tmp',file);}
export function cachedFilings(d:Dossier):Source[]{
 // Read all retained versions: newer topical windows do not replace older full risk sections.
 const sources=['memo-sources','sections-v4','sections-v2','sections-v3'].flatMap(dir=>readGzip<Source[]>(corpusPath(`business-backfill/${dir}/${d.id}.json.gz`))??[]);
 const expanded=sources.flatMap(s=>{
  if(s.section!=='Annual filing')return [s];
  const out:Source[]=[];
  // Full retained reports avoid the backfill section cache's 10KB risk truncation.
  const risk=/^ITEM[ \t]+1A[. \t]*RISK FACTORS[. \t]*$|^[０-９0-9 　]*【事業等のリスク】[ \t]*$|^[ \t]*Principal risks(?: and uncertainties)?[ \t]*$/im.exec(s.text);
  if(risk)out.push({...s,section:'risk'});
  const mdna=/^ITEM[ \t]+7[. \t]+MANAGEMENT[^\n]*$/im.exec(s.text);
  if(mdna){const tail=s.text.slice(mdna.index),end=/^ITEM[ \t]+7A[. \t]/im.exec(tail);out.push({...s,section:'mdna',text:tail.slice(0,end?.index)});}
  return out;
 });
 return [...new Map(expanded.map(s=>[`${s.url}:${s.section}:${s.text}`,s])).values()];
}
export async function candidateCorpus(d:Dossier,now:string,offline=false):Promise<{candidates:Candidate[];newsStatus:string}>{
 const cache=path.join(root(),'news',d.id+'.json.gz'),previous=readGzip<{checked:string;rows:Parameters<typeof newsCandidates>[0]}>(cache);
 let rows=previous?.rows??[],newsStatus=previous?'cached':'pending';
 if(!offline&&previous?.checked!==now.slice(0,10)){
  const from=new Date(now);from.setUTCMonth(from.getUTCMonth()-18);
  const fetched:typeof rows=[];
  try{
   for(let offset=0;;offset+=1000){
    storyDiskGuard();const batch=await eodhd<typeof rows>('news',{s:d.id,from:from.toISOString().slice(0,10),to:now.slice(0,10),limit:'1000',offset:String(offset)},{retries:0});
    if(!Array.isArray(batch))throw Error('Invalid news response');
    fetched.push(...batch.map(row=>({...row,content:(row.content??'').split(/\n\s*\n|<\/p>/i)[0]})));
    if(batch.length<1000)break;
   }
   rows=fetched;writeGzip(cache,{checked:now.slice(0,10),rows});newsStatus='fetched';
  }catch(e){if(String(e).includes('DISK STOP'))throw e;newsStatus=String(e).includes('budget')?'budget-exhausted':'fetch-failed';}
 }
 return {candidates:[...newsCandidates(rows),...filingCandidates(cachedFilings(d),d.company.code)],newsStatus};
}
export function readDossiers(store=corpusPath('publish-repo')):Record<string,Dossier>{return Object.assign({},...readdirSync(path.join(store,'dossiers')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(path.join(store,'dossiers',f),'utf8'))));}
export function readPrices(directory=corpusPath('prices')):PriceMap{return Object.assign({},...readdirSync(directory).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(path.join(directory,f),'utf8'))));}
