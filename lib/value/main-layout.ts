import type { ResultEntry } from '@/app/value/_components/ResultRow';
import { companyName } from './presentation';
import { ownerReturn } from './owner-return';
export type MainCompany = ReturnType<typeof mainCompanies>[number];
const finite=(n:number|null|undefined)=>n!=null&&Number.isFinite(n)?n:null;
export function mainCompanies(entries:ResultEntry[],expectedReturns:Record<string,number|null>){
 return entries.map(entry=>{
  const {row}=entry;
  const price=entry.historical?entry.historicalPrice?.price??null:entry.quote;
  const buyPrice=entry.historical?entry.historicalPrice?.buyPrice??null:row.v?.[1]!=null?row.v[1]*(1-(row.m??.25)):null;
  const ratio=price!=null&&price>0&&buyPrice!=null&&buyPrice>0?finite(price/buyPrice):null;
  const expected=entry.historical?null:finite(ownerReturn(row.ownerReturnInputs?.valuation??null,row.cur,row.ownerReturnInputs?.marketCapUsd??null,entry.quote)?.expected??expectedReturns[row.id]);
  return {entry,id:row.id,name:companyName(row),price,buyPrice,ratio,expected,returnValue:entry.historical?finite(entry.historicalReturn):expected,buy:row.b===true&&row.t==='PPPPP'};
 });
}
const byReturn=(a:MainCompany,b:MainCompany)=>(b.returnValue??-Infinity)-(a.returnValue??-Infinity)||a.id.localeCompare(b.id);
const bySize=(a:MainCompany,b:MainCompany)=>(b.entry.row.mc??0)-(a.entry.row.mc??0)||a.id.localeCompare(b.id);
export function mainZones(companies:MainCompany[]){
 return {
  buy:companies.filter(c=>c.buy).sort(byReturn),
  next:companies.filter(c=>!c.buy&&c.ratio!==null&&c.ratio<=1.5).sort((a,b)=>a.ratio!-b.ratio!||byReturn(a,b)),
  middle:companies.filter(c=>!c.buy&&c.ratio!==null&&c.ratio>1.5&&c.ratio<=3).sort(bySize),
  far:companies.filter(c=>!c.buy&&c.ratio!==null&&c.ratio>3).sort(bySize),
  missing:companies.filter(c=>!c.buy&&c.ratio===null).sort(bySize),
 };
}
export function distancePosition(ratio:number){return Math.max(0,Math.min(1,(ratio-1)/.5));}
export function distanceLabel(ratio:number|null){
 if(ratio===null)return 'Distance unavailable';
 if(Math.abs(ratio-1)<.00005)return 'At buy price';
 const n=Math.abs(ratio-1)*100;
 return `${n<.5?'<1':Math.round(n)}% ${ratio<1?'below':'above'}`;
}
/** Each desktop row reserves two name lines. Header, axis and more link reserve 88px. */
export function nextLayout(width:number,height:number,count:number,phone=false){
 const columns=phone?1:width>=850?2:1;
 const rows=phone?5:Math.max(0,Math.floor((height-88)/48));
 return {columns,rows,capacity:Math.min(count,columns*rows)};
}
export const returnLabel=(value:number|null)=>value===null?'—':`${value<0?'−':''}${(Math.abs(value)*100).toFixed(1)}%`;
