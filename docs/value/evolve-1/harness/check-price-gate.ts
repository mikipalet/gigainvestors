import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {publishedBuyPrice} from '../../../../lib/value/buy-price';
const root='.audit/evolve-1/candidate-final';
const read=(p:string)=>JSON.parse(readFileSync(root+'/'+p,'utf8'));
const rows=new Map<string,any>(readdirSync(root+'/index').flatMap(f=>read('index/'+f).map((r:any)=>[r.id,r])));
const prices=Object.assign({},...readdirSync(root+'/prices').map(f=>read('prices/'+f)));
const prior=new Map<string,any>(readdirSync('.audit/evolve-1/baseline/index').flatMap(f=>JSON.parse(readFileSync('.audit/evolve-1/baseline/index/'+f,'utf8')).map((r:any)=>[r.id,r])));
let buys=0,frozen=0;const errors:any[]=[];
for(const r of rows.values()){
 const gate=publishedBuyPrice(r,prices[r.id]);
 if(r.b){buys++;if(r.priceTestFreeze)frozen++;
  if(!gate.b||r.t!=='PPPPP')errors.push({id:r.id,why:'production gate disagrees'});
  if(!prior.get(r.id)?.b&&!publishedBuyPrice({...r,priceTestFreeze:undefined},prices[r.id]).b)errors.push({id:r.id,why:'new buy fails current price/value gate without a legacy freeze'});
  if(!r.priceTestFreeze&&!(prices[r.id]?.[0]>0&&r.v?.[1]>0&&prices[r.id][0]<=r.v[1]*(1-r.m)+1e-9))errors.push({id:r.id,why:'MOS inequality'});
 }
}
const examples=['GOOGL.US','NVDA.US','MSFT.US','AAPL.US','COST.US'].map(id=>{const r=rows.get(id);return {id,quality:r.t,buy:r.b,quote:prices[id],value:r.v,requiredMargin:r.m,buyCeiling:r.v?.[1]*(1-r.m),gate:publishedBuyPrice(r,prices[id])};});
writeFileSync('.audit/evolve-1/evidence/price-gate-proof.json',JSON.stringify({rows:rows.size,buys,frozenBuys:frozen,examples,errors,pass:!errors.length},null,2)+'\n');
if(errors.length)throw Error('Price gate failed');console.log(rows.size,'rows;',buys,'buys pass production price/value + expected-return gate');
