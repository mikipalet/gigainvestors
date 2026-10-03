/** Counterfactual quote-only changes: keep every live financial input fixed. */
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {memoAtPrice} from '../../lib/value/owner-memo';
import {readPrices} from '../../lib/value/price-files';
import {publishedBuyPrice} from '../../lib/value/buy-price';
import type {Dossier,IndexRow} from '../../lib/value/types';
const [store,output,quoteDirectory]=process.argv.slice(2);
if(!store||!output)throw Error('Usage: nightly-price-expectations.ts BASELINE OUTPUT.json.gz');
const baselinePrices=readPrices(`${store}/prices`),prices=readPrices(quoteDirectory??`${store}/prices`);
const rows=new Map<string,IndexRow>();
for(const file of readdirSync(`${store}/index`).filter(f=>/^[A-Z]{2}\.json$/.test(f)))for(const row of JSON.parse(readFileSync(`${store}/index/${file}`,'utf8')) as IndexRow[])rows.set(row.id,row);
const fields=(row:IndexRow,quote:Parameters<typeof publishedBuyPrice>[1])=>{
 const p=publishedBuyPrice(row,quote);
 return {b:p.b,dataQualityFlags:p.dataQualityFlags,tests:{price:{key:'price',result:p.result,numeric:p.result,reasons:p.mos===null?['Valuation or price unavailable in trading currency']:[],metrics:{mos:p.mos},series:{},jev:[]}}};
};
const result:Record<string,unknown>={};
for(const file of readdirSync(`${store}/dossiers`).filter(f=>f.endsWith('.json'))){
 const dossiers=JSON.parse(readFileSync(`${store}/dossiers/${file}`,'utf8')) as Record<string,Dossier>;
 for(const [id,d]of Object.entries(dossiers)){
  const before=d.ownerMemo?.lines.find(l=>l.question===7);
  const after=memoAtPrice(d,prices[id])?.lines.find(l=>l.question===7);
  const row=rows.get(id),priceFields=row?{before:fields(row,baselinePrices[id]),after:fields(row,prices[id])}:undefined;
  if(JSON.stringify(before)!==JSON.stringify(after)||JSON.stringify(priceFields?.before)!==JSON.stringify(priceFields?.after))result[id]={quote:prices[id],before,after,priceFields};
 }
}
writeFileSync(output,gzipSync(JSON.stringify(result)));
console.log(JSON.stringify({repricedMemoCandidates:Object.keys(result).length}));
