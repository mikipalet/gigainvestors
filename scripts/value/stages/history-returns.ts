import {statfsSync} from 'node:fs';
import {loadCompanies} from '../../../lib/value/companies';
import {readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {createLimiter,pool} from '../../../lib/value/http';
import {eodhd} from '../../../lib/value/eodhd';
import {marketCapCurrency} from '../../../lib/value/currency';
import {parseEodHistory,parseYahooHistory,yahooSymbol} from '../../../lib/value/price-history';
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
 const companies=new Map(loadCompanies({only:[...ids]}).map(c=>[c.id,c]));
 const day=new Date().toISOString().slice(0,10),limit=createLimiter({perSecond:5});
 const failed:Array<{id:string;reason:string}>=[];let written=0,cached=0;
 await pool({items:[...ids].filter(id=>!options.only||options.only.includes(id)).slice(0,options.limit),concurrency:5,run:async id=>{
  const disk=statfsSync('/');if(disk.bavail*disk.bsize<5*1024**3)throw Error('DISK STOP: below 5 GiB');
  const old=readCorpusJson<ReturnPrices>(`history-return-prices/${id}.json`);
  if(!options.force&&old?.fetchedAt===day){cached++;return;}
  const delisted=readCorpusJson<{General?:{IsDelisted?:boolean}}>(`raw/eodhd/${id}.json`)?.General?.IsDelisted===true;
  const company=companies.get(id);
  try{
   const identity=identities.find(c=>c.id===id);
   const symbol=yahooSymbol(company??{code:id.slice(0,id.lastIndexOf('.')),exchange:identity?.exchange??id.split('.').at(-1)!});
   const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=1104537600&period2=${Math.floor(Date.now()/1000)}&interval=1mo`;
   const response=await limit(()=>fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)}));
   if(!response.ok){await response.body?.cancel();throw Error(`Yahoo HTTP ${response.status}`);}
   const raw=await response.json(),result=raw.chart?.result?.[0],meta=result?.meta;
   const prices=parseYahooHistory(raw);
   if(!prices.length||!meta?.currency||!Number.isFinite(meta.regularMarketPrice)||!meta.regularMarketTime)throw Error('Missing dated price');
   const date=new Date(meta.regularMarketTime*1000).toISOString().slice(0,10);
   if(date>day)throw Error('Future quote');
   if(company&&marketCapCurrency(meta.currency)!==marketCapCurrency(company.currency))throw Error('Quote currency mismatch');
   // An old quote is not proof of delisting: do not silently relabel stale active listings.
   if(!delisted&&Date.parse(day)-Date.parse(date)>7*86400000)throw Error(`Stale active quote ${date}`);
   writeCorpusJson(`history-return-prices/${id}.json`,{currency:meta.currency,fetchedAt:day,prices,latest:[meta.regularMarketPrice,date],...(delisted?{lastTraded:true}:{})} satisfies ReturnPrices);
   written++;
  }catch(error){
   try{
    if(!company)throw Error('Historical company identity missing');
    const [rows,splits]=await Promise.all([
     eodhd<EodClose[]>(`eod/${encodeURIComponent(id)}`,{from:'2005-01-01',to:day,period:'d'},{retries:0}),
     eodhd<EodSplit[]>(`splits/${encodeURIComponent(id)}`,{from:'2005-01-01',to:day},{retries:0}),
    ]);
    const prices=eodReturnPrices(rows,splits,company.currency,day,delisted);
    if(!delisted&&Date.parse(day)-Date.parse(prices.latest[1])>7*86400000)throw Error(`Stale active quote ${prices.latest[1]}`);
    writeCorpusJson(`history-return-prices/${id}.json`,prices);written++;
   }catch(fallback){failed.push({id,reason:`${error instanceof Error?error.message:'Yahoo failed'}; ${fallback instanceof Error?fallback.message:'EODHD failed'}`});}
  }
  if((written+failed.length)%100===0)console.log(`history returns: ${written} refreshed, ${failed.length} failed`);
 }});
 writeCorpusJson('history-return-prices/report.json',{day,written,cached,failed});
 console.log(`history returns: ${written} refreshed, ${cached} cached, ${failed.length} failed`);
 return {written,cached,failed};
}

type EodClose={date:string;close:number;adjusted_close?:number};
type EodSplit={date:string;split:string};
/** EOD close is raw: apply every later split, never cash dividends. */
export function eodReturnPrices(rows:EodClose[],splits:EodSplit[],currency:string,day:string,lastTraded=false):ReturnPrices {
 if(!Array.isArray(rows)||!Array.isArray(splits))throw Error('Invalid EOD return inputs');
 const factors=splits.map(s=>{const [n,d]=s.split.split('/').map(Number);if(!(n>0&&d>0))throw Error('Invalid split');return {date:s.date,factor:n/d};});
 const adjusted=rows.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date<=day&&Number.isFinite(r.close)&&r.close>0).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>({date:r.date,close:r.close/factors.filter(s=>s.date>r.date&&s.date<=day).reduce((n,s)=>n*s.factor,1)}));
 const latest=adjusted.at(-1);if(!latest)throw Error('Missing dated terminal price');
 return {currency,fetchedAt:day,prices:parseEodHistory(adjusted),latest:[latest.close,latest.date],...(lastTraded?{lastTraded:true}:{})};
}
