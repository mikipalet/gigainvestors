import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdirSync,readFileSync,existsSync,writeFileSync,rmSync} from 'node:fs';
import sharp from 'sharp';
import {corpusPath,readCorpusJson} from './corpus';
import {checkLogoDisk} from './logo-fetch';
import {robotsRequest,type LogoAttempt} from './logo-discovery';
const exec=promisify(execFile);
/** Retain only a bounded first-page preview, never an entire downloaded report. */
export async function reportCover(id:string,request:typeof fetch,attempts:LogoAttempt[],reportUrl?:string):Promise<string|null>{
 let report=readCorpusJson<{url?:string;kind?:string;filed?:string}>(`reports/${id}/meta.json`);
 if(reportUrl)report={...report,url:reportUrl,kind:'PDF'};
 if(!report?.url||(!/\.pdf(?:[?#]|$)/i.test(report.url)&&report.kind!=='PDF'&&report.kind!=='EDINET')){attempts.push({source:'annual-report',url:report?.url,outcome:'no PDF report in latest report metadata'});return null;}
 const dir=corpusPath('enrichment-v7/logos/report-covers');mkdirSync(dir,{recursive:true});const target=dir+'/'+id+'.png',pdf=dir+'/'+id+'.pdf';
 const receipt=readCorpusJson<{url:string}>(`enrichment-v7/logos/report-covers/${id}.json`);
 if(existsSync(target)&&receipt?.url===report.url){attempts.push({source:'annual-report',url:report.url,outcome:'first-page preview available: '+target});return target;}
 try{
  checkLogoDisk();const r=await robotsRequest(request,attempts)(report.url);if(!r.ok)throw Error('HTTP '+r.status);
  const bytes=Buffer.from(await r.arrayBuffer());if(!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('not a PDF');
  writeFileSync(pdf,bytes);await exec('pdftoppm',['-f','1','-l','1','-singlefile','-scale-to','1600','-png',pdf,target.slice(0,-4)],{timeout:30000,maxBuffer:500000});
  await sharp(readFileSync(target),{limitInputPixels:4_000_000}).metadata();
  writeFileSync(dir+'/'+id+'.json',JSON.stringify({url:report.url,filed:report.filed,at:new Date().toISOString()}));
  attempts.push({source:'annual-report',url:report.url,outcome:'rendered first page for unambiguous-logo review: '+target});return target;
 }catch(e){attempts.push({source:'annual-report',url:report.url,outcome:String(e).slice(0,220)});return null;}
 finally{rmSync(pdf,{force:true});}
}

export interface ReviewedReportCrop {url:string;left:number;top:number;width:number;height:number;review:string}
/** Coordinates refer to the 1600px page preview; only a visually approved region is reusable. */
export async function reviewedReportLogo(id:string,cover:string,crop:ReviewedReportCrop|undefined):Promise<Buffer|null>{
 if(!crop?.review)return null;
 const receipt=readCorpusJson<{url:string}>(`enrichment-v7/logos/report-covers/${id}.json`);
 if(receipt?.url!==crop.url)return null;
 const {left,top,width,height}=crop;
 if(![left,top,width,height].every(Number.isSafeInteger)||left<0||top<0||width<16||height<16||Math.max(width,height)<64)return null;
 const input=sharp(readFileSync(cover),{limitInputPixels:4_000_000}),m=await input.metadata();
 if(left+width>(m.width??0)||top+height>(m.height??0))return null;
 return input.extract({left,top,width,height}).png().toBuffer();
}
