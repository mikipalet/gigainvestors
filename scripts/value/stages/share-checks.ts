import {loadCompanies} from '../../../lib/value/companies';
import {readCorpusJson,writeCorpusJson} from '../../../lib/value/corpus';
import {reconcileShares,type ShareObservation} from '../../../lib/value/share-check';
import {yahooSymbol} from '../../../lib/value/price-history';
import {pool,createLimiter} from '../../../lib/value/http';
import type {Analysis} from '../../../lib/value/types';
export default async function checks(options:{only?:string[];limit?:number}={}) {
 const limit=createLimiter({perSecond:3}),reports:Record<string,unknown>={};
 const companies=loadCompanies(options).filter(c=>options.only||Object.values(readCorpusJson<Analysis>(`analysis/${c.id}.json`)?.tests??{}).filter(t=>t.result==='pass').length>=4);
 await pool({items:companies,concurrency:3,run:async c=>{
  const raw=readCorpusJson<{General?:{CIK?:string;UpdatedAt?:string};SharesStats?:{SharesOutstanding?:number}}>(`raw/eodhd/${c.id}.json`);
  const observations:ShareObservation[]=[];
  if(raw?.SharesStats?.SharesOutstanding)observations.push({source:'eodhd',shares:raw.SharesStats.SharesOutstanding,date:raw.General?.UpdatedAt});
  try{
   const symbol=yahooSymbol(c),url=`https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=shares_out&period1=${Math.floor(Date.now()/1000)-366*86400}&period2=${Math.floor(Date.now()/1000)}`;
   const r=await limit(()=>fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(10000)}));
   if(r.ok){const d=await r.json(),series=d.timeseries?.result?.[0],values=series?.shares_out??[],timestamps=series?.timestamp??[];const i=values.length-1;
    if(i>=0){const date=new Date(timestamps[i]*1000).toISOString().slice(0,10);if(Date.now()-timestamps[i]*1000<400*86400_000)observations.push({source:'yahoo',shares:values[i],date,url,basis:'listing shares outstanding'});}
   }else await r.body?.cancel();
  }catch{}
  const cik=c.cik??raw?.General?.CIK;
  if(cik)try{
   const url=`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10,'0')}.json`;
   const r=await limit(()=>fetch(url,{headers:{'User-Agent':'GigaInvestors contact@gigainvestors.com'},signal:AbortSignal.timeout(15000)}));
   if(r.ok){const d=await r.json();writeCorpusJson(`enrichment-v7/share-facts/${c.id}.json`,d);
    const values=d.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares??[];
    const latest=values.filter((v:{end:string;filed:string})=>v.end<=new Date().toISOString().slice(0,10)).sort((a:{end:string},b:{end:string})=>a.end.localeCompare(b.end)).at(-1);
    // Foreign ordinary shares require explicit ADR-ratio evidence. INFY's filing states one equity share per ADS.
    const adr=c.exchange==='US'&&(/ADR|ADS/i.test(c.name)||c.country!=='US'||latest?.form==='20-F');
    let ratio:number|null=adr?null:1;
    if(adr){const text=readCorpusJson<{ratio:number}>(`enrichment-v7/adr-ratios/${c.id}.json`);ratio=text?.ratio??null;}
    if(latest&&ratio&&Date.now()-Date.parse(latest.end)<240*86400_000)observations.push({source:'sec',shares:latest.val/ratio,date:latest.end,url,basis:`ordinary shares / ${ratio} per ADS`});
   }else await r.body?.cancel();
  }catch{}
  const check={...reconcileShares(observations),checkedAt:new Date().toISOString()};writeCorpusJson(`enrichment-v7/share-checks/${c.id}.json`,check);reports[c.id]=check;
 }});writeCorpusJson('enrichment-v7/share-check-report.json',reports);console.log(JSON.stringify(reports));
}
