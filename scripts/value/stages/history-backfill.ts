import {loadCompanies} from '../../../lib/value/companies';
import {readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {parseYahooHistory,yahooSymbol} from '../../../lib/value/price-history';
import {pool,createLimiter} from '../../../lib/value/http';
import type {Fundamentals,PriceHistory} from '../../../lib/value/types';
/** Separate full-range cache; never splices differently split-adjusted price series. */
export default async function backfill(options:{only?:string[];limit?:number}={}) {
 const companies=loadCompanies(options).filter(c=>{
  const f=readCorpusJson<Fundamentals>(`fundamentals/${c.id}.json`);
  return f&&f.years.filter(y=>y.fy<2016).length>=10&&!readCorpusJson(`prices-history-long/${c.id}.json`);
 });
 const limit=createLimiter({perSecond:5}),stats={eligible:companies.length,written:0,failed:0};
 await pool({items:companies,concurrency:5,run:async c=>{
  try {
   const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(c))}?period1=0&period2=${Math.floor(Date.now()/1000)}&interval=1mo`;
   const r=await limit(()=>fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)}));
   if(!r.ok){await r.body?.cancel();throw Error(String(r.status));}
   const prices=parseYahooHistory(await r.json());
   if(prices.length){writeCorpusJson(`prices-history-long/${c.id}.json`,prices);stats.written++;}
  }catch{stats.failed++;}
  if((stats.written+stats.failed)%100===0)console.log(JSON.stringify(stats));
 }});
 writeCorpusJson('prices-history-long/report.json',{...stats,at:new Date().toISOString()});console.log(stats);
}
