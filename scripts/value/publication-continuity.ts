import {readCorpusJson,writeCorpusJson} from '../../lib/value/corpus';
import {retainPublishedNumbers} from '../../lib/value/retain-published-numbers';
import {applyVerdictFreeze,type readVerdictFreeze} from './verdict-freeze';
import approved from './approved-verdict-changes.json';
import type {ApprovedVerdictChange} from './publish-invariants';
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
/** Preserve unapproved Buy changes using the existing complete-record freeze.
 * Numerical observations lost to incomplete inputs remain dated live evidence.
 * This is a publication policy, not a change to valuation/quality thresholds. */
export function applyPublicationContinuity(files:Record<string,any>,baseline:ReturnType<typeof readVerdictFreeze>,prices:PriceMap={}):void{
 const priorRows=new Map<string,IndexRow>();
 for(const [file,rows]of Object.entries(baseline.previous))if(/^index\/[A-Z]{2}\.json$/.test(file))for(const row of rows as IndexRow[])priorRows.set(row.id,row);
 const ids=new Set<string>(),transitions:any[]=[];
 for(const [file,rows]of Object.entries(files))if(/^index\/[A-Z]{2}\.json$/.test(file))for(const row of rows as IndexRow[]){
  const before=priorRows.get(row.id);if(!before||before.b===row.b||approved.some((a:ApprovedVerdictChange)=>a.id===row.id))continue;
  const oldPrice=baseline.previous[`prices/${before.c}.json`]?.[row.id];
  if(!isDeepStrictEqual(oldPrice,prices[row.id])&&publishedBuyPrice(before,prices[row.id]).b===row.b)continue;
  ids.add(row.id);transitions.push({id:row.id,before:{b:before.b,v:before.v,m:before.m,t:before.t},proposed:{b:row.b,v:row.v,m:row.m,t:row.t}});
 }
 const dossiers:Record<string,Dossier>={};
 for(const [file,shard]of Object.entries(baseline.previous))if(file.startsWith('dossiers/'))for(const [id,d]of Object.entries(shard))if(ids.has(id))dossiers[id]=d as Dossier;
 applyVerdictFreeze(files,{...baseline,ids,dossiers},{extendSearch:true});
 const currentRows=new Map<string,IndexRow>();
 for(const [file,rows]of Object.entries(files))if(/^index\/[A-Z]{2}\.json$/.test(file))for(const row of rows as IndexRow[])currentRows.set(row.id,row);
 const retention:any[]=[];
 for(const [file,shard]of Object.entries(files))if(/^dossiers\/\d{3}\.json$/.test(file))for(const d of Object.values(shard) as Dossier[]){
  const old=baseline.previous[file]?.[d.id];if(!old||baseline.ids.has(d.id)||ids.has(d.id))continue;
  const row=currentRows.get(d.id);
  if(!d.tests.price&&old.tests.price&&row?.v){
   const price=publishedBuyPrice(row,prices[d.id]);
   if(price.mos!==null)d.tests.price={key:'price',result:price.result,numeric:price.result,reasons:[],metrics:{mos:price.mos},series:{},jev:[]};
  }
  const retained=retainPublishedNumbers(old,d,justifiedNulls(d,old));
  if(retained.length){
   retention.push({id:d.id,asOf:old.asOf,retained});
   d.historyAssumptions=[...(d.historyAssumptions??[]),`Prior published observations retained from ${old.asOf} where newer inputs omit a numeric field or fiscal period.`];
  }
 }
 writeCorpusJson('staging/preserved-buy-transitions.json',transitions);
 writeCorpusJson('staging/retained-published-numbers.json',retention);
}
