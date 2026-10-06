/** Free, public Yahoo evidence only. Does not install quotes or call EODHD. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {reportRequest} from '../../../lib/value/reports/transport';
async function main(){
const root=process.argv[2];if(!root)throw Error('Provide private evidence directory');
const release=JSON.parse(readFileSync(process.argv[3],'utf8'));
const ids=[...release.held.map((x:{id:string})=>x.id),'FRFHF.US','AVBH.US','FFH.TO','FFH-U.TO'];
mkdirSync(root+'/prices',{recursive:true});const results=[];
for(const id of ids){
 const symbol=id.endsWith('.US')?id.slice(0,-3):id;
 const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=10y&interval=1mo`;
 try{const r=await reportRequest(url,{headers:{'User-Agent':'Mozilla/5.0'}});const j=await r.json();const data=j.chart?.result?.[0];
  if(!r.ok||!data)throw Error(`HTTP ${r.status}`);
  writeFileSync(root+'/prices/'+id+'.json',JSON.stringify(j));
  results.push({id,url,status:r.status,symbol:data.meta.symbol,currency:data.meta.currency,price:data.meta.regularMarketPrice,priceAt:new Date(data.meta.regularMarketTime*1000).toISOString(),observations:data.timestamp?.length??0});
 }catch(e){results.push({id,url,error:e instanceof Error?e.message:'request failed'});}
}
writeFileSync(root+'/prices.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));

}
main().catch(()=>{console.error("Price acquisition failed");process.exitCode=1;});
