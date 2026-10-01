import { discoverInterim } from './discover';
import { existsSync, readFileSync, statfsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { corpusPath, readCorpusJson } from '../corpus';
import { htmlToText } from '../reports/html-to-text';
import type { Company, ReportMeta } from '../types';
import type { ThesisSource } from './types';

export function diskGuard():void {
 const disk=statfsSync('/');
 if(disk.bavail*disk.bsize<5*1024**3)throw new Error('DISK STOP: less than 5 GiB free on /');
}
export async function fetchDocument(url:string, depth=0):Promise<string>{
 diskGuard();
 if(depth>2)throw new Error("Too many embedded filing redirects");
 const response=await fetch(url,{headers:{'User-Agent':process.env.SEC_USER_AGENT??'GigaInvestors value hello@gigainvestors.com'},signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw new Error(`Filing HTTP ${response.status}`);
 const reader=response.body!.getReader(),parts:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>64_000_000){await reader.cancel();throw new Error('Filing exceeds 64 MB memory limit');}parts.push(value);}
 const bytes=Buffer.concat(parts);
 if(bytes.subarray(0,4).toString()==='%PDF')return execFileSync('pdftotext',['-layout','-','-'],{input:bytes,maxBuffer:16_000_000}).toString().replace(/[^\S\n]+/g,' ');
 const raw=bytes.toString('utf8');
 const embedded=raw.match(/<embed[^>]+src=["']([^"']+)["']/i)?.[1];
 if(embedded)return fetchDocument(new URL(embedded,url).href,depth+1);
 return raw;
}
export const disclosurePattern=/provision|contingen|litigat|redress|covenant|going concern|suspend.{0,40}dividend|dividend.{0,40}suspend|guidance|outlook|exclusiv|patent|market share|regulator.{0,40}(ban|restrict)|loss of.{0,40}(customer|licen)/ig;
/** Supplement truncated cached notes with complete, overlapping disclosure windows. */
export function disclosureWindows(text:string):string {
 const windows:Array<[number,number]>=[];
 for(const match of text.matchAll(new RegExp(disclosurePattern))){
  const start=Math.max(0,match.index-600),end=Math.min(text.length,match.index+1800),last=windows.at(-1);
  if(last&&start<=last[1])last[1]=Math.max(last[1],end);else windows.push([start,end]);
 }
 return windows.map(([a,b])=>text.slice(a,b)).join('\n\n[Noncontiguous filing excerpt]\n\n');
}
export interface OfficialSource {url:string;filed:string;period:string;section:'annual'|'interim';textFile?:string}
export async function companySources(company:Company,asOf:string,extra:OfficialSource[]=[]):Promise<{sources:ThesisSource[];gaps:string[]}>{
 const sources:ThesisSource[]=[],gaps:string[]=[];
 const meta=readCorpusJson<ReportMeta>(`reports/${company.id}/meta.json`);
 if(meta?.url&&meta.filed&&meta.period&&meta.kind!=='description'){
  for(const section of ['business','risk','mdna','notes','auditor','capital'] as const){
   const file=corpusPath(`reports/${company.id}/${section}.txt`);
   if(existsSync(file)){const text=readFileSync(file,'utf8');if(text.trim())sources.push({url:meta.url,filed:meta.filed,period:meta.period,section,text});}
  }
  // The reports stage truncates notes from the beginning; litigation often sits later.
  try{const raw=await fetchDocument(meta.url);const text=disclosureWindows(htmlToText(raw));if(text)sources.push({url:meta.url,filed:meta.filed,period:meta.period,section:'annual disclosure notes',text});}
  catch(e){if(String(e).includes('DISK STOP'))throw e;gaps.push(`Annual notes supplement: ${e instanceof Error?e.message:'fetch failed'}`);}
 }else gaps.push('No cached annual filing sections');
 for(const source of extra.filter(s=>s.filed<=asOf)){
  try{
   const imported=source.textFile?.startsWith('thesis/imports/')?corpusPath(source.textFile):null;
   const raw=imported&&existsSync(imported)?readFileSync(imported,'utf8'):await fetchDocument(source.url);
   sources.push({...source,text:/<html|<body|<div|<p[ >]/i.test(raw)?htmlToText(raw):raw});}
  catch(e){if(String(e).includes('DISK STOP'))throw e;gaps.push(`${source.section}: ${e instanceof Error?e.message:'fetch failed'}`);}
 }
 const cik=company.cik??meta?.url?.match(/edgar\/data\/(\d+)/)?.[1];
 if(cik){
  try{
   const data=JSON.parse(await fetchDocument(`https://data.sec.gov/submissions/CIK${cik.padStart(10,'0')}.json`));
   const r=data.filings.recent;
   const indexes:number[]=r.form.map((f:string,i:number)=>['10-Q','6-K'].includes(f)&&r.filingDate[i]<=asOf&&r.filingDate[i]>(meta?.filed??'')?i:-1).filter((i:number)=>i>=0);
   let found=false;
   for(const i of indexes.slice(0,12)){
    const url=`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${r.accessionNumber[i].replace(/-/g,'')}/${r.primaryDocument[i]}`;
    const raw=await fetchDocument(url);let text=htmlToText(raw);
    if(r.form[i]==='6-K'){
     const exhibits=[...raw.matchAll(/href=["']([^"']+)["']/gi)].map(m=>m[1]).filter(h=>/ex[-_]?99|exhibit[-_]?99|ex99/i.test(h));
     for(const href of [...new Set(exhibits)].slice(0,3))text+='\n\n'+htmlToText(await fetchDocument(new URL(href,url).href));
     if(!/interim|half.year|quarter.{0,25}(results|ended)|consolidated.{0,25}(income|balance|financial)/i.test(text))continue;
    }
    sources.push({url,filed:r.filingDate[i],period:r.reportDate[i]||r.filingDate[i],section:r.form[i],text});found=true;break;
   }
   if(!found&&!extra.some(s=>s.section==='interim'))gaps.push('No newer SEC interim financial report found');
  }catch(e){if(String(e).includes('DISK STOP'))throw e;gaps.push(`SEC interim: ${e instanceof Error?e.message:'fetch failed'}`);}
 }else if(!extra.some(s=>s.section==='interim')){
  const found=await discoverInterim(company,asOf,meta?.period??null);sources.push(...found.sources);gaps.push(...found.gaps);
 }
 return {sources,gaps};
}
