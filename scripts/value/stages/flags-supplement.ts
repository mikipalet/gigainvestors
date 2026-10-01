import {createHash} from 'node:crypto';
import {readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {fetchDocument,diskGuard} from '../../../lib/value/thesis/sources';
import {htmlToText} from '../../../lib/value/reports/html-to-text';
import {FLAG_COMPANIES,type FlagSource} from './flags-fetch';
import type {Analysis} from '../../../lib/value/types';
/** Bounded, keyless discovery of executed contracts and annual subsidiary exhibits. */
export default async function supplement({only=FLAG_COMPANIES}:{only?:string[]}){
 for(const id of only){diskGuard();if(readCorpusJson(`flags/supplements/${id}.json`)){console.log(id,'cached');continue;}
  const a=readCorpusJson<Analysis>(`analysis/${id}.json`),annual=readCorpusJson<FlagSource>(`flags/sources/${id}.json`),cik=a?.company.cik??annual?.url.match(/edgar\/data\/(\d+)/)?.[1];if(!cik||!annual)continue;
  const sources:FlagSource[]=[],gaps:string[]=[];
  async function add(url:string,filed:string,period:string){const raw=await fetchDocument(url),text=htmlToText(raw);if(text.length>1000)sources.push({url,filed,period,text,hash:createHash('sha256').update(raw).digest('hex')});}
  try{
   const d=JSON.parse(await fetchDocument(`https://data.sec.gov/submissions/CIK${cik.padStart(10,'0')}.json`)),r=d.filings.recent;
   const rows=r.form.map((f:string,i:number)=>f==='8-K'&&r.filingDate[i]<='2026-10-01'&&r.filingDate[i]>='2025-01-01'&&/1\.01|2\.01/.test(r.items?.[i]??'')?i:-1).filter((i:number)=>i>=0).slice(0,3);
   for(const i of rows)await add(`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${r.accessionNumber[i].replace(/-/g,'')}/${r.primaryDocument[i]}`,r.filingDate[i],r.reportDate[i]||r.filingDate[i]);
   const acc=annual.url.match(/\/([0-9]{18})\//)?.[1];if(acc){
    const index=annual.url.slice(0,annual.url.lastIndexOf('/')+1)+`${acc.slice(0,10)}-${acc.slice(10,12)}-${acc.slice(12)}-index.html`,html=await fetchDocument(index);
    const links=[...html.matchAll(/href=["']([^"']+)["']/gi)].map(m=>m[1]).filter(h=>/(?:ex(?:hibit)?[-_]?21|subsidiar)/i.test(h)&&/\.(?:htm|html)$/i.test(h));
    for(const link of [...new Set(links)].slice(0,1))await add(new URL(link,index).href,annual.filed,annual.period);
   }
  }catch(e){if(String(e).includes('DISK STOP'))throw e;gaps.push(e instanceof Error?e.message:'Discovery failed');}
  writeCorpusJson(`flags/supplements/${id}.json`,{sources,gaps});console.log(id,`${sources.length} contract/exhibit filings`,gaps.join('; '));
 }
}
