import {assertFilingIssuer} from '../../lib/value/issuer-separation';
import {shardOf} from '../../lib/value/shard';
import {readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {retainPublishedNumbers} from '../../lib/value/retain-published-numbers';
import type {readVerdictFreeze} from './verdict-freeze';
import {publishedBuyPrice} from '../../lib/value/buy-price';
import {isDeepStrictEqual} from 'node:util';
import type {Dossier,IndexRow,PriceMap} from '../../lib/value/types';

/** Filing-backed nulls are real changes, not incomplete cache observations. */
function justifiedNulls(d:Dossier,old:Dossier):Set<string>{
 const paths=new Set<string>();
 const prior=new Map(old.series?.bookValuePerShare??[]);
 if(!d.series?.bookValuePerShare?.some(([fy,value])=>value===null&&typeof prior.get(fy)==='number'))return paths;
 const years=readCorpusJson<{memoYears?:any[]}>(`analysis/inputs/${d.id}.json`)?.memoYears??[];
 const facts=readCorpusJson<any>(`raw/sec-companyfacts/${d.id}.json`)?.facts?.['us-gaap']??{};
 for(const y of years){
  if(typeof y.equity==='number'&&y.equity<=0&&d.series?.bookValuePerShare?.some(([fy,value])=>fy===y.fy&&value===null)){
   const source=facts.StockholdersEquity?.units?.[y.currency]??[];
   if(source.some((f:any)=>f.end===y.end&&!f.start&&f.val===y.equity&&['10-K','20-F','40-F'].includes(f.form)))paths.add(`series.bookValuePerShare[${y.fy}]`);
  }
 }
 return paths;
}
/** Retain missing numeric observations without suppressing computed verdicts.
 * Evidence loss and verdict changes are distinct: only the former is retained. */
export function retainPublicationObservations(files:Record<string,any>,baseline:ReturnType<typeof readVerdictFreeze>,prices:PriceMap={}):void{
 const currentRows=new Map<string,IndexRow>();
 for(const [file,rows]of Object.entries(files))if(/^index\/[A-Z]{2}\.json$/.test(file))for(const row of rows as IndexRow[])currentRows.set(row.id,row);
 const retention:any[]=[];
 for(const [file,shard]of Object.entries(files))if(/^dossiers\/\d{3}\.json$/.test(file))for(const d of Object.values(shard) as Dossier[]){
  const old=baseline.previous[file]?.[d.id];if(!old||baseline.ids.has(d.id))continue;
  const row=currentRows.get(d.id);
  if(!d.tests.price&&old.tests.price&&row?.v){
   const price=publishedBuyPrice(row,prices[d.id]);
   if(price.mos!==null)d.tests.price={key:'price',result:price.result,numeric:price.result,reasons:[],metrics:{mos:price.mos},series:{},jev:[]};
  }
  // A known wrong-issuer dossier is not a source for retained observations.
  try{assertFilingIssuer({id:d.id},old.report?.url);}catch{
   retention.push({id:d.id,asOf:old.asOf,retained:[],rejectedSource:old.report?.url,reason:'wrong issuer filing'});
   continue;
  }
  const retained=retainPublishedNumbers(old,d,justifiedNulls(d,old));
  if(retained.length){
   retention.push({id:d.id,asOf:old.asOf,retained});
   d.historyAssumptions=[...(d.historyAssumptions??[]),`Prior published observations retained from ${old.asOf} where newer inputs omit a numeric field or fiscal period.`];
  }
 }
 // Record actual published transitions, including both directions and unchanged
 // aggregate counts. These observations explain inputs; they never authorize a verdict.
 const priorRows=new Map<string,IndexRow>();
 for(const [file,rows]of Object.entries(baseline.previous))if(/^index\/[A-Z]{2}\.json$/.test(file))for(const row of rows as IndexRow[])priorRows.set(row.id,row);
 const transitions=[];
 for(const [id,after]of currentRows){
  const before=priorRows.get(id);if(!before||(before.b===after.b&&before.t===after.t))continue;
  const oldPrice=baseline.previous[`prices/${before.c}.json`]?.[id];
  const changedFields=['b','t','v','m','buyReturnInputs'].filter(key=>!isDeepStrictEqual(before[key as keyof IndexRow],after[key as keyof IndexRow]));
  const priceChanged=!isDeepStrictEqual(oldPrice,prices[id]);
  const attribution=before.t!==after.t?'quality-inputs-or-method':!isDeepStrictEqual(before.v,after.v)||!isDeepStrictEqual(before.buyReturnInputs,after.buyReturnInputs)?'valuation-inputs-or-method':before.m!==after.m?'required-discount':priceChanged?'quote':'other-published-inputs';
  const dossierFile=`dossiers/${shardOf(id)}.json`;
  transitions.push({id,at:new Date().toISOString(),attribution,changedFields,priceChanged,
   before:{b:before.b,t:before.t,v:before.v,m:before.m},after:{b:after.b,t:after.t,v:after.v,m:after.m},
   evidence:{before:{dossier:baseline.previous[dossierFile]?.[id],index:before,price:oldPrice},after:{dossier:files[dossierFile]?.[id],index:after,price:prices[id]}}});
 }
 writeCorpusJson('staging/verdict-changes.json',transitions);
 writeCorpusJson('staging/retained-published-numbers.json',retention);
}
