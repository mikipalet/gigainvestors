import {formatRate} from '@/lib/format';
import type { ResultEntry } from '@/lib/value/result-entry';
import { companyName } from './presentation';
export type MainCompany = ReturnType<typeof mainCompanies>[number];
const finite=(n:number|null|undefined)=>n!=null&&Number.isFinite(n)?n:null;
export function mainCompanies(entries:ResultEntry[]){
 return entries.map(entry=>{
  const {row}=entry;
  const price=entry.historical?entry.historicalPrice?.price??null:entry.quote;
  const unavailable=!entry.historical&&Boolean(row.dataQualityFlags?.length);
  const buyPrice=unavailable?null:entry.historical?entry.historicalPrice?.buyPrice??null:row.v?.[1]!=null?row.v[1]*(1-(row.m??.25)):null;
  const ratio=price!=null&&price>0&&buyPrice!=null&&buyPrice>0?finite(price/buyPrice):null;
  const expected=unavailable||(entry.historical&&!entry.basis)?null:finite(entry.expected);
  return {entry,id:row.id,name:companyName(row),price,buyPrice,ratio,expected,returnValue:entry.historical&&!entry.basis?finite(entry.historicalReturn):expected,buy:!row.businessChanged&&!unavailable&&row.b===true&&row.t==='PPPPP'};
 });
}
const byReturn=(a:MainCompany,b:MainCompany)=>(b.returnValue??-Infinity)-(a.returnValue??-Infinity)||a.id.localeCompare(b.id);
export function mainZones(companies:MainCompany[]){
 const next=(c:MainCompany)=>!c.entry.row.businessChanged&&!c.buy&&c.ratio!==null&&c.returnValue!==null;
 return {
  buy:companies.filter(c=>c.buy).sort(byReturn),
  next:companies.filter(next).sort((a,b)=>a.ratio!-b.ratio!||byReturn(a,b)),
  rest:companies.filter(c=>!c.buy&&!next(c)).sort((a,b)=>(b.entry.row.mc??0)-(a.entry.row.mc??0)||a.id.localeCompare(b.id)),
 };
}
/** Shared premium scale: buy price at zero, +60% at the right edge. */
export function distancePosition(ratio:number){return Math.max(0,Math.min(1,(ratio-1)/.6));}
export const dropToBuy=(ratio:number|null)=>ratio===null?'':ratio<=1?'At buy price':`needs −${Math.round((1-1/ratio)*100)}%`;
export const returnLabel=(value:number|null)=>value===null?'':`${value<0?'−':''}${formatRate(Math.abs(value))}`;
