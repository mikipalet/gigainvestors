import type {MemoFacts} from '../owner-memo';
import type {PriceMap} from '../types';
const record=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&v.trim()&&Number.isFinite(Number(v))?Number(v):null;
export function latestMemoPrices(...maps:PriceMap[]):PriceMap {
 const result:PriceMap={};
 for(const map of maps)for(const [id,quote]of Object.entries(map))if(quote&&Number.isFinite(quote[0])&&quote[0]>0&&(!result[id]||quote[1]>result[id][1]))result[id]=quote;
 return result;
}
/** Extract literal product noun phrases, not a generated business description. */
export function factsFromVendor(raw:unknown,id:string,asOf:string):MemoFacts {
 const data=record(raw),general=record(data.General),shares=record(data.SharesStats),facts:MemoFacts={};
 const description=typeof general.Description==='string'?general.Description:'';
 const product=description.match(/(?:manufactures?|sells?|retails?|provides?|offers?|develops?)\s+(?:and\s+\w+\s+)?((?:(?!\b(?:in|for|through|under|across|and|as|to|with)\b)[\w-]+\s*){1,6})(?=[,.;]|\s*\b(?:in|for|through|under|across|and|as|to|with)\b)/i)?.[1]?.trim();
 const url='https://eodhd.com/financial-apis/stock-etfs-fundamental-data-feeds/';
 if(product&&product.split(/\s+/).length<=6&&!/^(a|an|the|its|various|range|operates|products|services|deposit)(?:$|\s)/i.test(product)){
  facts.product=product[0].toUpperCase()+product.slice(1);
  facts.productEvidence={quote:`${id}: ${description}`,url,filed:asOf,section:'Company description'};
 }
 const insiders=number(shares.PercentInsiders);
 // Institutional blocks close to the provider's insider total need a filing
 // reconciliation. Never subtract them: overlaps and beneficial control vary.
 const blockholders=Object.values(record(record(data.Holders).Institutions)).map(record);
 const conflated=insiders!==null&&blockholders.some(h=>{const stake=number(h.totalShares);return stake!==null&&stake>=5&&insiders>=stake&&insiders-stake<=1;});
 if(!conflated&&insiders!==null&&insiders>=0&&insiders<=100){facts.insiderPercent=insiders;facts.insiderEvidence={quote:`${id} SharesStats.PercentInsiders = ${insiders} percentage points; cache date ${asOf}.`,url,filed:asOf,section:'Insider ownership'};}
 return facts;
}
