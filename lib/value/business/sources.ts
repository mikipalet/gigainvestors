import {readFileSync,existsSync,mkdirSync,writeFileSync,renameSync,statSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {corpusPath,readCorpusJson} from '../corpus';
import {htmlToText} from '../reports/html-to-text';
import {cutEsefSections,latestEsef} from '../reports/esef';
import {cutSections} from '../reports/cut-sections';
import {fetchDocument} from '../thesis/sources';
import {createLimiter} from '../http';
const filingLimit=createLimiter({perSecond:2});
const documentText=(url:string)=>filingLimit(()=>fetchDocument(url,0,false));
import {latestFilings,resolveCik} from '../reports/edgar';
import {generalInfoFor} from '../enrichment';
import {businessDiskGuard} from './disk';
import type {Analysis} from '../types';
import type {Source} from '../judgement/read';
const textCache=new Map<string,{stamp:number;present:boolean}>();
function compressedSources(file:string):Source[]{
 return existsSync(file)?JSON.parse(gunzipSync(readFileSync(file)).toString()).filter((s:Source)=>!!s.text?.trim()):[];
}
export function hasBusinessText(a:Analysis):boolean {
 const cached=['memo-sources','sections-v2','sections-v4'].some(dir=>{
  const file=corpusPath(`business-backfill/${dir}/${a.id}.json.gz`);if(!existsSync(file))return false;
  const stamp=statSync(file).mtimeMs,old=textCache.get(file);if(old?.stamp===stamp)return old.present;
  const present=compressedSources(file).length>0;textCache.set(file,{stamp,present});return present;
 });
 if(cached)return true;
 const flags=readCorpusJson<{text?:string}>(`flags/sources/${a.id}.json`);
 return !!flags?.text?.trim()||(a.report.kind!=='description'&&a.report.sections.some(section=>existsSync(corpusPath(`reports/${a.id}/${section}.txt`))));
}
/** Bound retained text to topical sections and contiguous windows, compressed.
 * Never persist new PDFs, HTML documents or full annual-report text. */
export function topicalSources(documents:Source[]):Source[]{
 return documents.flatMap(source=>{
  const text=source.text,windows:Array<[number,number]>=[];
  const pattern=/pric(?:e|es|ing)|volume|margin|compet|depend|regulat|tariff|litigat|risk/ig;
  for(const m of text.matchAll(pattern)){
   const start=Math.max(0,m.index-500),end=Math.min(text.length,m.index+1600),last=windows.at(-1);
   if(last&&start<=last[1])last[1]=end;else windows.push([start,end]);
   if(windows.reduce((sum,[a,b])=>sum+b-a,0)>180000)break;
  }
  if(!windows.length)return [{...source,text:source.text.slice(0,180000)}];
  return windows.map(([a,b])=>({...source,text:text.slice(a,b),section:/risk|mdna/i.test(source.section)?source.section:'MD&A and risk excerpts'}));
 });
}
export async function businessSources(a:Analysis):Promise<{sources:Source[];status:string}>{
 businessDiskGuard();const id=a.id;
 const compact=corpusPath(`business-backfill/sections-v4/${id}.json.gz`);
 const compactSources=compressedSources(compact);if(compactSources.length)return {sources:compactSources,status:'cached-topical-sections'};
 const full=corpusPath(`business-backfill/memo-sources/${id}.json.gz`);
 if(existsSync(full)){
  const documents:import('../judgement/read').Source[]=JSON.parse(gunzipSync(readFileSync(full)).toString());
  const sources=documents.flatMap(source=>{const sections={...cutEsefSections(source.text),...cutSections({text:source.text,form:'10-K'})};const focused=['mdna','risk'].flatMap(section=>{const text=sections[section as keyof typeof sections];return text?[{...source,section,text}]:[];});return [...focused,...topicalSources([source])];});
  businessDiskGuard();mkdirSync(corpusPath('business-backfill/sections-v4'),{recursive:true});writeFileSync(compact,gzipSync(JSON.stringify(sources)));
  return {sources,status:'reused-compressed-filing'};
 }
 const file=corpusPath(`business-backfill/sections-v2/${id}.json.gz`);
 const priorSections=compressedSources(file);if(priorSections.length)return {sources:topicalSources(priorSections),status:'cached-sections'};
 const sources:Source[]=[];
 const save=(status:string)=>{if(sources.length){businessDiskGuard();mkdirSync(corpusPath('business-backfill/sections-v2'),{recursive:true});writeFileSync(file+'.tmp',gzipSync(JSON.stringify(topicalSources(sources))));renameSync(file+'.tmp',file);}return {sources,status};};
 const add=(text:string,url:string,filed:string,period:string|null)=>{
  const plain=/<(?:html|body|div|p)[ >]/i.test(text)?htmlToText(text):text;
  let sections=cutSections({text:plain,form:'10-K'});
  if(!Object.keys(sections).length)sections=cutEsefSections(plain);
  // Store bounded topical sections only. The raw response lives only in memory.
  for(const [section,body]of Object.entries(sections))if(body)sources.push({text:body,quote:'',url,filed,period,section});
  {
   const patterns:Record<string,RegExp>={business:/segment|revenue|products|customers|subscription/ig,risk:/risk|competitor|regulat|supplier/ig,mdna:/margin|pricing|capital expenditure|repurchases/ig,compensation:/beneficial ownership|voting power|executive compensation/ig};
   for(const [section,pattern]of Object.entries(patterns)){
    const windows=[...plain.matchAll(pattern)].slice(0,40).map(m=>plain.slice(Math.max(0,m.index-200),m.index+1200));
    if(windows.length)sources.push({text:windows.join('\n\n'),quote:'',url,filed,period,section});
   }
  }
 };
 const cached=readCorpusJson<{text:string;url:string;filed:string;period:string}>(`flags/sources/${id}.json`)??readCorpusJson<{text:string;url:string;filed:string;period:string}>(`judgement/sources/${id}.json`);
 if(cached?.text){add(cached.text,cached.url,cached.filed,cached.period);return save('reused-filing');}
 if(a.report.url&&a.report.kind!=='description'){
  for(const section of a.report.sections){const p=corpusPath(`reports/${id}/${section}.txt`);if(existsSync(p))sources.push({text:readFileSync(p,'utf8'),quote:'',url:a.report.url,filed:a.report.filed??'',period:a.report.period,section});}
  if(sources.length)return save('reused-report-sections');
  try{add(await documentText(a.report.url),a.report.url,a.report.filed??'',a.report.period);if(sources.length)return save('fetched-home-filing');}catch(e){if(String(e).includes('DISK STOP'))throw e;}
 }
 // Home filing feeds, then official issuer IR (also covers HKEX/NSE/DART/MOPS/cninfo/SEDAR+/ASX links).
 if(a.company.lei)try{const f=await latestEsef(a.company.lei);if(f){add(await documentText(f.url),f.url,f.filed,f.period);if(sources.length)return save('fetched-esef');}}catch(e){if(String(e).includes('DISK STOP'))throw e;}
 if(a.company.country==='US'||a.company.cik)try{const cik=await resolveCik(a.company);const f=cik?await latestFilings(cik):null;if(f?.annual){add(await documentText(f.annual.url),f.annual.url,f.annual.filed,f.annual.period);if(sources.length)return save('fetched-sec');}}catch(e){if(String(e).includes('DISK STOP'))throw e;}
 const website=generalInfoFor(a.company).WebURL;const queue=website?[website]:[],seen=new Set<string>();
 for(let n=0;n<4&&queue.length;n++){
  businessDiskGuard();const url=queue.shift()!;if(seen.has(url))continue;seen.add(url);
  try{
   const raw=await documentText(url);
   if(/\.pdf(?:\?|$)|annual.{0,30}report|20\d\d.*10k/i.test(url)&&htmlToText(raw).length>6000&&/financial statements|consolidated|annual report/i.test(raw)){add(raw,url,'',null);if(sources.length)return save('fetched-official-ir');}
   const links=[...raw.matchAll(/href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].flatMap(m=>{try{const u=new URL(m[1].replaceAll('&amp;','&'),url);if(u.protocol!=='https:')return [];const label=u.href+' '+htmlToText(m[2]);const score=(/annual|年報|有価証券|사업보고서|年报/i.test(label)?10:0)+(/2025|2026/.test(label)?4:0)+(/invest|report|financial|株主/i.test(label)?2:0)-(/sustainab|climate|esg/i.test(label)?20:0);return [{url:u.href,score}];}catch{return [];}}).filter(l=>l.score>=2&&!seen.has(l.url)).sort((a,b)=>b.score-a.score);
   queue.unshift(...links.slice(0,4).map(l=>l.url));
  }catch(e){if(String(e).includes('DISK STOP'))throw e;}
 }
 return save('source-retry');
}
