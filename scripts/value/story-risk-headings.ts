import dotenv from 'dotenv';
import {chromium} from '@playwright/test';
import {createHash} from 'node:crypto';
import {corpusPath,readCorpusJson} from '../../lib/value/corpus';
import {readDossiers,readGzip,writeGzip,storyDiskGuard} from '../../lib/value/price-story/corpus';
import {htmlToText} from '../../lib/value/reports/html-to-text';
import {pool,createLimiter} from '../../lib/value/http';
dotenv.config({path:'.env.local',quiet:true});
async function main(){
 const ds=readDossiers(),ordered=readCorpusJson<{id:string}[]>('price-story/news-priority-story-2b.json')!;
 const requested=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
 const rows=ordered.filter(({id})=>!requested||requested.includes(id)).map(({id})=>({id,meta:ds[id].report})).filter(({meta})=>meta.kind==='10-K'&&meta.url?.includes('sec.gov')&&meta.filed);
 const browser=await chromium.launch(),limit=createLimiter({perSecond:2});let done=0,failed=0;
 console.log('HEADING UNIVERSE',rows.length);
 try{await pool({items:rows,concurrency:2,run:async({id,meta})=>{
  const file=corpusPath(`price-story/headings/${id}.json.gz`);if(!process.argv.includes('--force')&&readGzip<{version:number}>(file)?.version===2)return;
  storyDiskGuard();const page=await browser.newPage();
  try{
   const response=await limit(()=>fetch(meta.url!,{headers:{'User-Agent':process.env.SEC_USER_AGENT??'GigaInvestors value hello@gigainvestors.com'},signal:AbortSignal.timeout(45000)}));
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const raw=await response.text();if(Buffer.byteLength(raw)>64000000)throw Error('Document size limit');
   const marked=await page.evaluate(({html,issuer})=>{
    const doc=new DOMParser().parseFromString(html,'text/html');
    // Intel's report uses blue 12pt section headings over 9pt body text.
    const headings=[...doc.querySelectorAll('b,strong,h1,h2,h3,h4,h5,h6,[style]')].filter(el=>/^(B|STRONG|H[1-6])$/.test(el.tagName)||/font-weight\s*:\s*(?:bold|[6-9]00)/i.test(el.getAttribute('style')??'')||(issuer==='INTC.US'&&/color\s*:\s*#(?:026dce|0068b5)\b/i.test(el.getAttribute('style')??'')&&/font-size\s*:\s*12pt\b/i.test(el.getAttribute('style')??''))).filter(el=>{const text=el.textContent!.replace(/\s+/g,' ').trim();return text.length>=8&&text.length<=650;});
    headings.forEach((el,i)=>{el.prepend(doc.createTextNode(`\uE000S${i}\uE001`));el.append(doc.createTextNode(`\uE000E${i}\uE001`));});
    return doc.documentElement.outerHTML;
   },{html:raw,issuer:id});
   const plain=htmlToText(marked),parts:string[]=[],bounds=new Map<string,{start:number;end?:number}>();let cursor=0,length=0;
   for(const marker of plain.matchAll(/\uE000([SE])(\d+)\uE001/g)){
    const part=plain.slice(cursor,marker.index);parts.push(part);length+=part.length;
    if(marker[1]==='S')bounds.set(marker[2],{start:length});else{const bound=bounds.get(marker[2]);if(bound)bound.end=length;}
    cursor=marker.index!+marker[0].length;
   }
   parts.push(plain.slice(cursor));const text=parts.join('');
   const headings=[...bounds.values()].flatMap(({start,end})=>{if(end===undefined)return [];const raw=text.slice(start,end),quote=raw.trim();return quote.length>=8&&quote.length<=650&&!quote.includes('\n')?[{text:quote,offset:start+raw.indexOf(quote)}]:[];});
   writeGzip(corpusPath(`price-story/risk-filings/${id}.json.gz`),[{text,url:meta.url,filed:meta.filed,period:meta.period,section:'Verified risk filing',quote:''}]);
   writeGzip(file,{version:2,textHash:createHash('sha256').update(text).digest('hex'),meta:{url:meta.url,filed:meta.filed},headings});
   done++;if(done%25===0)console.log('HEADINGS',done,'failed',failed);
  }catch(e){if(String(e).includes('DISK STOP'))throw e;failed++;console.log('HEADING ERROR',id,e instanceof Error?e.message:'Failed');}
  finally{await page.close();}
 }});}finally{await browser.close();}
 console.log('HEADINGS FINISHED',done,'failed',failed);
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Failed');process.exitCode=1;});
