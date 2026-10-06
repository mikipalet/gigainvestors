import {readCorpusJson} from '../../lib/value/corpus';
import {refreshBalanceValuation} from '../../lib/value/refresh-balance-valuation';
import {publishedBuyPrice} from '../../lib/value/buy-price';
import {buyReturnInputs} from '../../lib/value/owner-return';
import {memoAtPrice} from '../../lib/value/owner-memo';
import {publicAnalysis} from '../../lib/value/public-analysis';
import {composePriceStory,retainStoryTimestamp} from '../../lib/value/price-story/compose';
import {refreshPublishedSummaries} from './verdict-freeze';
import type {Dossier,IndexRow,PriceMap} from '../../lib/value/types';

/** Reprice the already-bound publication: do not repeat unrelated company/cap
 * checks on preserved research. Explicit second-source freezes remain binding. */
export function publishBalances(files:Record<string,any>,prices:PriceMap,_fx:Record<string,number>,read:(file:string)=>any=readCorpusJson):void {
 const frozen=new Set<string>(read('verdict-freeze.json')?.ids??[]);
 const indexes=new Map<string,IndexRow>();
 for(const [file,rows]of Object.entries(files))if(/^index\/[A-Z]{2}\.json$/.test(file))for(const row of rows as IndexRow[])indexes.set(row.id,row);
 const changed=new Map<string,IndexRow>();
 for(const [file,shard] of Object.entries(files))if(/^dossiers\/\d{3}\.json$/.test(file))for(const d of Object.values(shard) as Dossier[]){
  if(frozen.has(d.id))continue;
  let next=refreshBalanceValuation(d,read,new Date().toISOString().slice(0,10));
  const row=indexes.get(d.id);if(next===d||!row)continue;
  const v=next.valuation,range=v?.perShareTrading??(v?.currency===d.company.currency?v.perShare:null);
  const candidate:IndexRow={...row,v:range?[range.low,range.mid,range.high]:null,m:next.requiredMos,buyReturnInputs:buyReturnInputs(v,d.company.currency),priceTestFreeze:undefined};
  const price=publishedBuyPrice(candidate,prices[d.id]);
  candidate.b=price.b;
  if(price.dataQualityFlags.length){candidate.v=null;candidate.buyReturnInputs=null;}
  next={...next,b:price.b,priceTestFreeze:undefined,dataQualityFlags:price.dataQualityFlags,tests:{...d.tests,price:{key:'price',result:price.result,numeric:price.result,reasons:[],metrics:{mos:price.mos},series:{},jev:[]}}};
  const visible=publicAnalysis(next);
  // Keep every quality outcome and non-price public field exactly bound.
  next={...d,valuation:visible.valuation,valuationReason:visible.valuationReason,requiredMos:next.requiredMos,b:visible.b,priceTestFreeze:undefined,tests:{...d.tests,price:visible.tests.price}};
  next.ownerMemo=memoAtPrice(next,prices[d.id]);
  next.priceStory=retainStoryTimestamp(composePriceStory(next,prices[d.id]??null,d.priceStory?.selected??null,d.priceStory?.events??[],d.priceStory?.asOf??new Date().toISOString()),d.priceStory);
  files[file][d.id]=next;changed.set(d.id,candidate);
 }
 if(!changed.size)return;
 for(const [file,rows]of Object.entries(files))if(/^index\/(?:default|[A-Z]{2})\.json$/.test(file))files[file]=rows.map((row:IndexRow)=>changed.get(row.id)??row);
 refreshPublishedSummaries(files);
}
