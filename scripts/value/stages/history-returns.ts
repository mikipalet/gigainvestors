import {statfsSync} from 'node:fs';
import {loadCompanies} from '../../../lib/value/companies';
import {readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {createLimiter,pool} from '../../../lib/value/http';
import {parseYahooHistory,yahooSymbol} from '../../../lib/value/price-history';
import type {ReturnPrices} from '../../../lib/value/since-return';
import type {IndexRow,SnapshotRow} from '../../../lib/value/types';
import {latestHistoryFiles} from './history-snapshots';

/** Fresh split-only closes for returns, independent of the frozen prediction inputs.
 * Yahoo quote.close is split-adjusted; adjclose (cash distributions) is never read.
 * Read-only network requests; the compact cache is local, never a remote publish. */
export default async function historyReturns(options:{only?:string[];limit?:number;force?:boolean}={}) {
 const files=latestHistoryFiles();
 const ids=new Set(Object.entries(files).filter(([f])=>/^history\/\d{4}Q[1-4]\.json$/.test(f)).flatMap(([,v])=>(v as SnapshotRow[]).map(r=>r[0])));
 const identities=files['history/companies.json'] as IndexRow[]??[];
 const companies=new Map(loadCompanies({}).map(c=>[c.id,c]));
 const day=new Date().toISOString().slice(0,10),limit=createLimiter({perSecond:5});
 const failed:Array<{id:string;reason:string}>=[];let written=0,cached=0;
 await pool({items:[...ids].filter(id=>!options.only||options.only.includes(id)).slice(0,options.limit),concurrency:5,run:async id=>{
  const disk=statfsSync('/');if(disk.bavail*disk.bsize<6*1024**3)throw Error('DISK STOP: below 6 GiB');
  const old=readCorpusJson<ReturnPrices>(`history-return-prices/${id}.json`);
  if(!options.force&&old?.fetchedAt===day){cached++;return;}
  try{
   const identity=identities.find(c=>c.id===id),company=companies.get(id);
   const symbol=yahooSymbol(company??{code:id.slice(0,id.lastIndexOf('.')),exchange:identity?.exchange??id.split('.').at(-1)!});
   const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=1104537600&period2=${Math.floor(Date.now()/1000)}&interval=1mo`;
   const response=await limit(()=>fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)}));
   if(!response.ok){await response.body?.cancel();throw Error(`Yahoo HTTP ${response.status}`);}
   const raw=await response.json(),result=raw.chart?.result?.[0],meta=result?.meta;
   const prices=parseYahooHistory(raw);
   if(!prices.length||!meta?.currency||!Number.isFinite(meta.regularMarketPrice)||!meta.regularMarketTime)throw Error('Missing dated price');
   const date=new Date(meta.regularMarketTime*1000).toISOString().slice(0,10);
   if(date>day)throw Error('Future quote');
   const delisted=readCorpusJson<{General?:{IsDelisted?:boolean}}>(`raw/eodhd/${id}.json`)?.General?.IsDelisted===true;
   // An old quote is not proof of delisting: do not silently relabel stale active listings.
   if(!delisted&&Date.parse(day)-Date.parse(date)>7*86400000)throw Error(`Stale active quote ${date}`);
   writeCorpusJson(`history-return-prices/${id}.json`,{currency:meta.currency,fetchedAt:day,prices,latest:[meta.regularMarketPrice,date],...(delisted?{lastTraded:true}:{})} satisfies ReturnPrices);
   written++;
  }catch(error){failed.push({id,reason:error instanceof Error?error.message:'Price fetch failed'});}
  if((written+failed.length)%100===0)console.log(`history returns: ${written} refreshed, ${failed.length} failed`);
 }});
 writeCorpusJson('history-return-prices/report.json',{day,written,cached,failed});
 console.log(`history returns: ${written} refreshed, ${cached} cached, ${failed.length} failed`);
 return {written,cached,failed};
}
