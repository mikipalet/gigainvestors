import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {comparableValuation} from '../../lib/value/site-valuation';
import {QUALITY_TESTS, type Dossier} from '../../lib/value/types';
import manifest from './approved-coverage-changes.json';

export interface Archive {files:string[]; read:(file:string)=>any}
export interface CoverageApproval {baseline:string; metric:string; ids:string[]; reason:string; evidence:string[]}
export interface CoverageManifest {version:number; approvals:CoverageApproval[]}
export interface PageSample {id:string; file:string; logo:string|null; country:string}
export interface Coverage {metrics:Record<string,Set<string>>; missingLogos:Set<string>; logoSurfaces:Record<string,Record<string,boolean>>; pages:PageSample[]}
export function critical(message:string):never {throw Error(`CRITICAL: publication coverage invariant: ${message}`);}
export function archiveGit(repo:string,args:string[]):string {
 try{return execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:128*1024*1024}).trim();}
 catch{return critical(`archive git ${args[0]} failed`);}
}
export function workingArchive(repo:string):Archive {
 const files=['meta.json','aliases.json',...['dossiers','index','prices','logos'].flatMap(dir=>existsSync(path.join(repo,dir))?readdirSync(path.join(repo,dir)).map(f=>`${dir}/${f}`):[])];
 return {files,read:file=>existsSync(path.join(repo,file))?JSON.parse(readFileSync(path.join(repo,file),'utf8')):null};
}
export function committedArchive(repo:string,ref:string):Archive {
 if(!existsSync(path.join(repo,'.git')))critical('previous archive requires its own git repository');
 const commit=archiveGit(repo,['rev-parse','--verify',`${ref}^{commit}`]);
 const files=archiveGit(repo,['ls-tree','-r','--name-only',commit]).split('\n'),available=new Set(files);
 const cache=new Map<string,unknown>();
 const load=(wanted:string[])=>{
  let bytes:Buffer;
  try{bytes=execFileSync('git',['-C',repo,'cat-file','--batch'],{input:wanted.map(f=>`${commit}:${f}\n`).join(''),stdio:['pipe','pipe','pipe'],maxBuffer:64*1024*1024});}
  catch{return critical('previous archive batch read failed');}
  let offset=0;
  for(const file of wanted){
   const end=bytes.indexOf(10,offset),header=bytes.subarray(offset,end).toString().split(' '),size=Number(header[2]);
   if(end<offset||header[1]!=='blob'||!Number.isSafeInteger(size)||size<0)critical(`previous archive missing ${file}`);
   offset=end+1;cache.set(file,JSON.parse(bytes.subarray(offset,offset+size).toString()));offset+=size+1;
  }
 };
 return {files,read:file=>{
  if(!available.has(file))return null;
  if(!cache.has(file)){
   const siblings=files.filter(f=>path.dirname(f)===path.dirname(file));
   // Logos are small and reused by both dossiers and country/default indexes.
   const start=siblings.indexOf(file),wanted=file.startsWith('logos/')?siblings:siblings.slice(start,start+16);
   load(wanted.filter(f=>!cache.has(f)));
  }
  const result=cache.get(file);
  if(!file.startsWith('logos/'))cache.delete(file);
  return result;
 }};
}

/** Read one shard at a time: keep IDs and page metadata, not thousands of dossiers. */
export function measureCoverage(archive:Archive):Coverage {
 if(!archive.read('meta.json'))critical('archive meta.json missing');
 const metrics:Coverage['metrics']={logos:new Set(),valuation:new Set(),quality:new Set(),dossiers:new Set(),priceHistory:new Set()};
 const add=(metric:string,id:string)=>{(metrics[metric]??=new Set()).add(id);};
 const logos=new Map<string,boolean>(),pages:PageSample[]=[];
 const logoSurfaces:Record<string,Record<string,boolean>>={};
 const logo=(src:unknown):boolean=>{
  if(typeof src!=='string'||!src.trim())return false;
  const asset=/^\/api\/value\/logo\?asset=([a-f0-9]{64})$/.exec(src);
  if(!asset)return /^https:\/\//.test(src);
  const file=`logos/${asset[1]}.json`;
  const data=archive.read(file);
  return typeof data?.data==='string'&&createHash('sha256').update(Buffer.from(data.data,'base64')).digest('hex')===asset[1];
 };
 const setLogo=(id:string,src:unknown,surface:string)=>{const present=logo(src);logos.set(id,(logos.get(id)??true)&&present);(logoSurfaces[id]??={})[surface]=present;};
 for(const file of archive.files.filter(f=>/^dossiers\/\d{3}\.json$/.test(f))){
  const records=archive.read(file);
  if(!records||Array.isArray(records)||typeof records!=='object')critical(`unreadable dossiers: ${file}`);
  for(const [id,d] of Object.entries(records) as [string,Dossier][]){
   if(!d||d.id!==id||metrics.dossiers.has(id))critical(`invalid or duplicate dossier id: ${id}`);
   add('dossiers',id);setLogo(id,d.company?.logo,'dossier');
   const valuation=d.company&&comparableValuation(d.valuation,d.company.currency);
   if(valuation&&['low','mid','high'].every(k=>Number.isFinite(valuation.perShare?.[k as 'mid'])))add('valuation',id);
   if(d.status==='scored'&&QUALITY_TESTS.every(k=>['pass','fail'].includes(d.tests?.[k]?.result??'')))add('quality',id);
   if(Array.isArray(d.priceHistory)&&d.priceHistory.some(p=>Array.isArray(p)&&/^\d{4}-\d{2}$/.test(p[0])&&Number.isFinite(p[1])&&p[1]>0))add('priceHistory',id);
   pages.push({id,file,logo:d.company?.logo??null,country:d.company?.country??id.split('.').at(-1)!});
  }
 }
 for(const file of archive.files.filter(f=>/^index\/(?:default|[A-Z]{2})\.json$/.test(f))){
  const market=path.basename(file,'.json'),rows=archive.read(file);
  metrics[`index:${market}`]=new Set();metrics[`buy:${market}`]=new Set();
  if(!Array.isArray(rows))critical(`unreadable index: ${file}`);
  for(const row of rows){
   if(typeof row?.id!=='string'||metrics[`index:${market}`].has(row.id))critical(`invalid or duplicate index id in ${file}`);
   add(`index:${market}`,row.id);if(row.b===true){add(`buy:${market}`,row.id);add('buy:all',row.id);if(row.w)add('buy:western',row.id);}setLogo(row.id,row.lg,`index:${market}`);
   // Both the company page and compact public index must retain coverage.
   if(!Array.isArray(row.v)||row.v.length!==3||!row.v.every(Number.isFinite))metrics.valuation.delete(row.id);
   if(row.st!=='s'||!/^[PF]{5}$/.test(row.t))metrics.quality.delete(row.id);
  }
 }
 const missingLogos=new Set<string>();
 for(const [id,hasLogo] of logos)if(hasLogo)add('logos',id);else missingLogos.add(id);
 return {metrics,missingLogos,logoSurfaces,pages};
}
export function approvedIds(baseline:string,metric:string,approvals:CoverageManifest=manifest):Set<string>{
 if(approvals.version!==1||!Array.isArray(approvals.approvals))critical('invalid approval manifest');
 const ids=new Set<string>();
 for(const approval of approvals.approvals){
  if(!/^[a-f0-9]{40}$/.test(approval.baseline)||!approval.metric||!approval.reason?.trim()||!approval.evidence?.length||approval.evidence.some(e=>!/^https:\/\//.test(e))||!Array.isArray(approval.ids)||!approval.ids.length||approval.ids.some(id=>!id||!/^[A-Za-z0-9_.&-]+$/.test(id)))critical('invalid approval manifest entry');
  if(approval.baseline===baseline&&approval.metric===metric)for(const id of approval.ids)ids.add(id);
 }
 return ids;
}
export function coverageSummary(before:Coverage,after:Coverage):string {
 const countries=[...new Set([...before.pages,...after.pages].map(p=>p.country))].sort();
 const missing=(c:Coverage,country:string)=>c.pages.filter(p=>p.country===country&&c.missingLogos.has(p.id)).length;
 const logoCountries=countries.map(c=>`missingLogos:${c}=${missing(before,c)}->${missing(after,c)}`);
 const counts=Object.keys({...before.metrics,...after.metrics}).sort().map(k=>`${k}=${before.metrics[k]?.size??0}->${after.metrics[k]?.size??0}`);
 return `coverage: missingLogos=${before.missingLogos.size}->${after.missingLogos.size} ${[...counts,...logoCountries].join(' ')}`;
}
export function compareCoverage(before:Coverage,after:Coverage,baseline:string,approvals:CoverageManifest=manifest):void {
 const failures:string[]=[];
 for(const metric of Object.keys({...before.metrics,...after.metrics}).sort()){
  // Buy counts are outcomes, not evidence coverage. Keep them in the audit summary.
  if(metric.startsWith('buy:'))continue;
  const old=before.metrics[metric]??new Set<string>(),next=after.metrics[metric]??new Set<string>();
  const approved=approvedIds(baseline,metric,approvals);
  const lost=metric==='logos'?Object.keys(before.logoSurfaces).filter(id=>Object.entries(before.logoSurfaces[id]).some(([surface,present])=>present&&(after.logoSurfaces[id]?.[surface]===false||(surface==='dossier'&&!after.logoSurfaces[id]?.[surface])||!Object.values(after.logoSurfaces[id]??{}).some(Boolean)))):[...old].filter(id=>!next.has(id));
  const unapproved=lost.filter(id=>!approved.has(id));
  const tolerance=metric==='logos'?0:Math.max(5,old.size*.01);
  const drop=metric==='logos'?unapproved.length:Math.max(0,old.size-next.size-(lost.length-unapproved.length));
  if(drop>tolerance||(metric==='dossiers'&&old.size>0&&next.size===0&&unapproved.length>0))failures.push(`${metric} ${old.size}->${next.size}, drop=${drop}, tolerance=${tolerance}; ids=${unapproved.sort().join(',')}`);
 }
 const missingApproved=new Set([...approvedIds(baseline,'missingLogos',approvals),...approvedIds(baseline,'logos',approvals)]);
 const newMissing=[...after.missingLogos].filter(id=>!before.missingLogos.has(id)&&!missingApproved.has(id));
 const missingDrop=after.missingLogos.size-before.missingLogos.size-([...after.missingLogos].filter(id=>!before.missingLogos.has(id)&&missingApproved.has(id)).length);
 if(missingDrop>Math.max(5,before.metrics.dossiers.size*.01))failures.push(`missingLogos ${before.missingLogos.size}->${after.missingLogos.size}; ids=${newMissing.sort().join(',')}`);
 if(failures.length)critical(failures.join('\nCRITICAL: publication coverage invariant: '));
}
export function assertCoverage(repo:string,baseline:string,approvals:CoverageManifest=manifest):{before:Coverage;after:Coverage;baseline:string}{
 try{
  const commit=archiveGit(repo,['rev-parse','--verify',`${baseline}^{commit}`]);
  const before=measureCoverage(committedArchive(repo,commit)),after=measureCoverage(workingArchive(repo));
  console.log(coverageSummary(before,after));compareCoverage(before,after,commit,approvals);
  return {before,after,baseline:commit};
 }catch(error){if(error instanceof Error&&error.message.startsWith('CRITICAL:'))throw error;return critical('unreadable coverage archive');}
}
/** Stable, country-spread sample, including logo-bearing pages first in each country. */
export function samplePages(coverage:Coverage,limit=20):PageSample[]{
 const groups=new Map<string,PageSample[]>();
 for(const p of coverage.pages){const group=groups.get(p.country)??[];group.push(p);groups.set(p.country,group);}
 for(const group of groups.values())group.sort((a,b)=>Number(Boolean(b.logo))-Number(Boolean(a.logo))||a.id.localeCompare(b.id));
 const buckets=[...groups].sort(([a,ag],[b,bg])=>bg.length-ag.length||a.localeCompare(b)).map(([,g])=>g),sample:PageSample[]=[];
 while(sample.length<limit&&buckets.some(g=>g.length))for(const group of buckets){if(group.length&&sample.length<limit)sample.push(group.shift()!);}
 return sample;
}
