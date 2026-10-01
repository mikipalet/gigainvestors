/** Retrieve reported minority interests for inconsistent balances; never plug a residual. */
import {readdirSync} from 'node:fs';
import {corpusPath,readCorpusJson,readJsonl,writeCorpusJson} from '../../lib/value/corpus';
import {yearsFromYahoo,fillYears} from '../../lib/value/completeness/second-sources';
import {yahooSymbol} from '../../lib/value/price-history';
import {createLimiter,pool} from '../../lib/value/http';
import type {Company,Fundamentals,Year} from '../../lib/value/types';
async function main(){
const companies=new Map(readJsonl<Company>('universe.jsonl').map(c=>[c.id,c]));
const pending=readdirSync(corpusPath('fundamentals')).filter(f=>f.endsWith('.json')).map(file=>readCorpusJson<Fundamentals>(`fundamentals/${file}`)!).filter(f=>f.integrity.reasons.some(r=>r.includes('balance sheet off')));
const limit=createLimiter({perSecond:3}),results:any[]=[];
await pool({items:pending,concurrency:6,run:async f=>{
 const c={...companies.get(f.id),...readCorpusJson<Company>(`companies/${f.id}.json`)} as Company;
 try{
  const symbol=yahooSymbol(c),url=`https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?${new URLSearchParams({type:'annualMinorityInterest',period1:'1262304000',period2:String(Math.floor(Date.now()/1000))})}`;
  let raw:any;
  for(let attempt=0;attempt<3;attempt++){
   try{const response=await limit(()=>fetch(url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)}));if(!response.ok)throw new Error(`HTTP ${response.status}`);raw=await response.json();break;}
   catch(e){if(attempt===2)throw e;await new Promise(resolve=>setTimeout(resolve,2000));}
  }
  const ys=yearsFromYahoo(raw,f.currency,url),file=`completeness/yahoo/${f.id}.json`;
  writeCorpusJson(file,fillYears(readCorpusJson<Year[]>(file)??[],ys));
  results.push({id:f.id,source:url.split('?')[0],status:ys.length?'read':'no annual observations',years:ys.length});
  if(f.id==='008060.KO')writeCorpusJson('completeness/manual/008060-minority.json',raw);
 }catch(e){results.push({id:f.id,status:String(e),years:0});}
}});
writeCorpusJson('completeness/balance-sources.json',results);
console.log(`Balance source reconciliation: ${results.filter(r=>r.years>0).length}/${results.length} have reported minority interests`);
if(results.some(r=>/429|5\d\d|fetch failed|timeout/i.test(r.status)))process.exitCode=1;

}
main().catch(error=>{console.error(error);process.exitCode=1;});
