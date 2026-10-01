import {createHash} from 'node:crypto';
import {readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {diskGuard,fetchDocument} from '../../../lib/value/thesis/sources';
import {htmlToText} from '../../../lib/value/reports/html-to-text';
import type {Analysis} from '../../../lib/value/types';
export const FLAG_COMPANIES=['ORCL.US','META.US','MSFT.US','GOOGL.US','AMZN.US','NVDA.US','CRWV.US','KO.US','AAPL.US','LULU.US','WKL.AS','CBG.LSE','AMD.US','AVGO.US','2330.TW','QCOM.US','SWKS.US'];
export interface FlagSource {url:string;filed:string;period:string;text:string;html?:string;hash:string}
export default async function fetchFlags({only=FLAG_COMPANIES,force=false}:{only?:string[];force?:boolean}){
 for(const id of only){
  diskGuard();if(!force&&readCorpusJson(`flags/sources/${id}.json`)){console.log(`${id}: cached`);continue;}
  const analysis=readCorpusJson<Analysis>(`analysis/${id}.json`);
  const r=analysis?.report;
  const saved=readCorpusJson<FlagSource>(`judgement/sources/${id}.json`);
  if(saved?.text){writeCorpusJson(`flags/sources/${id}.json`,{...saved,hash:createHash('sha256').update(saved.text).digest('hex')});console.log(`${id}: saved annual`);continue;}
  if(!r?.url||!r.filed||!r.period){console.log(`${id}: no filing URL`);continue;}
  try{
   const raw=await fetchDocument(r.url);const isHtml=/<html|<body|<ix:/i.test(raw),text=isHtml?htmlToText(raw):raw;
   if(text.length<3000)throw Error('Filing body too short');
   diskGuard();writeCorpusJson(`flags/sources/${id}.json`,{url:r.url,filed:r.filed,period:r.period,text,...(isHtml?{html:raw}:{}),hash:createHash('sha256').update(raw).digest('hex')});
   console.log(`${id}: ${text.length} characters`);
  }catch(e){console.log(`${id}: ${e instanceof Error?e.message:'fetch failed'}`);if(String(e).includes('DISK STOP'))throw e;}
 }
}
