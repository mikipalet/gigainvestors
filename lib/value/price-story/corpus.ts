import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync,statfsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {corpusPath,readCorpusJson} from '../corpus';
import {eodhd} from '../eodhd';
import type {Dossier,PriceMap} from '../types';
import type {Source} from '../judgement/read';
import {filingCandidates,newsCandidates,type Candidate,type FilingSource} from './selection';
// Issuer-confirmed depositary listing; business news applies to the same company.
export const NEWS_ALIASES:Record<string,{symbols:string[];source:string}>={'7203.JP':{symbols:['TM.US'],source:'https://global.toyota/en/faq/facility/'}};
const root=()=>corpusPath('price-story');
let lastCheck=0;
let diskStopped=false;
export function storyDiskGuard(){
 if(diskStopped)throw Error('DISK STOP: this process already crossed its floor');
 const disk=statfsSync('.');if(disk.bavail*disk.bsize<Number(process.env.STORY_MIN_FREE_GIB??6)*1024**3){diskStopped=true;throw Error('DISK STOP: below configured free-space floor');}
 if(Date.now()-lastCheck<10000)return;lastCheck=Date.now();
 mkdirSync(root(),{recursive:true});
 const paths=[process.cwd(),root()];
 const bytes=execFileSync('du',['-sk',...paths],{encoding:'utf8'}).trim().split('\n').reduce((n,s)=>n+Number(s.split(/\s/)[0])*1024,0);
 const file=path.join(root(),process.env.STORY_DISK_LEDGER??'disk-budget.json'),prior=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{baselineBytes:bytes,startedAt:new Date().toISOString(),worktree:process.cwd()};
 if(prior.worktree!==process.cwd())throw Error('Story budget belongs to another worktree');
 if(bytes-prior.baselineBytes>Number(process.env.STORY_MAX_NEW_BYTES??1_900_000_000))throw Error('DISK STOP: new-artifact ceiling');
 writeFileSync(file,JSON.stringify({...prior,newBytes:Math.max(0,bytes-prior.baselineBytes),freeBytes:disk.bavail*disk.bsize}));
}
export function readGzip<T>(file:string):T|null{return existsSync(file)?JSON.parse(gunzipSync(readFileSync(file)).toString()):null;}
export function writeGzip(file:string,value:unknown){storyDiskGuard();mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file+'.tmp',gzipSync(JSON.stringify(value)));renameSync(file+'.tmp',file);}
export function cachedFilings(d:Dossier):FilingSource[]{
 // Read all retained versions: newer topical windows do not replace older full risk sections.
 const recovered=readGzip<Source[]>(corpusPath(`price-story/filings/${d.id}.json.gz`))??[];
 const riskOnly=readGzip<Source[]>(corpusPath(`price-story/risk-filings/${d.id}.json.gz`))??[];
 const sources=[...riskOnly,...recovered,...['memo-sources','sections-v4','sections-v2','sections-v3'].flatMap(dir=>readGzip<Source[]>(corpusPath(`business-backfill/${dir}/${d.id}.json.gz`))??[])];
 for(const dir of ['flags','judgement']){
  const retained=readCorpusJson<Source>(`${dir}/sources/${d.id}.json`);
  if(retained?.text&&retained.url)sources.push({...retained,section:'Annual filing'});
 }
 const fullRiskUrls=new Set(sources.filter(s=>['Annual filing','Verified risk filing'].includes(s.section)&&/risk factors|principal risks|事業等のリスク/i.test(s.text)).map(s=>s.url));
 const expanded=sources.flatMap(s=>{
  if(/^(?:risk|principal risks?|business risks?|事業等のリスク)$/i.test(s.section)&&fullRiskUrls.has(s.url))return [];
  if(s.section==='Verified risk filing')return [{...s,section:'risk'}];
  if(s.section!=='Annual filing')return [s];
  const out:Source[]=[];
  // Full retained reports avoid the backfill section cache's 10KB risk truncation.
  const risk=/^[ \t]*(?:ITEM[ \t]+1A[. :—–-]*[\s]*)?RISK FACTORS[. \t]*$|^[０-９0-9 　]*【事業等のリスク】[ \t]*$|^[ \t]*Principal risks(?: and uncertainties)?[ \t]*$/im.exec(s.text);
  if(risk&&!riskOnly.some(r=>r.url===s.url))out.push({...s,section:'risk'});
  const mdna=/^ITEM[ \t]+7[. \t]+MANAGEMENT[^\n]*$/im.exec(s.text);
  if(mdna){const tail=s.text.slice(mdna.index),end=/^ITEM[ \t]+7A[. \t]/im.exec(tail);out.push({...s,section:'mdna',text:tail.slice(0,end?.index)});}
  return out;
 });
 const markup=readGzip<{version:number;textHash:string;meta:{url:string;filed:string};headings:Array<{text:string;offset:number}>}>(corpusPath(`price-story/headings/${d.id}.json.gz`));
 return [...new Map(expanded.map(s=>[`${s.url}:${s.section}:${s.text}`,s])).values()].map(s=>markup?.version===2&&s.url===markup.meta.url&&s.filed===markup.meta.filed&&createHash('sha256').update(s.text).digest('hex')===markup.textHash?{...s,riskHeadings:markup.headings}:s);
}
export async function candidateCorpus(d:Dossier,now:string,offline=false):Promise<{candidates:Candidate[];newsStatus:string}>{
 const cache=path.join(root(),'news',d.id+'.json.gz'),previous=readGzip<{checked:string;rows:Parameters<typeof newsCandidates>[0]}>(cache);
 let rows=previous?.rows??[],newsStatus=previous?'cached':'pending';
 if(!offline&&previous?.checked!==now.slice(0,10)){
  const from=new Date(now);from.setUTCMonth(from.getUTCMonth()-18);
  const fetched:typeof rows=[];
  try{
   for(const symbol of [d.id,...(NEWS_ALIASES[d.id]?.symbols??[])])for(let offset=0;;offset+=1000){
    storyDiskGuard();const batch=await eodhd<typeof rows>('news',{s:symbol,from:from.toISOString().slice(0,10),to:now.slice(0,10),limit:'1000',offset:String(offset)},{retries:0});
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
