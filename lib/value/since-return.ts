import {quarterEnd} from './time-travel';
import type {HistorySummary,PriceHistory,SnapshotRow} from './types';
export type ReturnPrices={currency:string;fetchedAt:string;prices:PriceHistory;latest:[number,string];lastTraded?:boolean};
const finite=(n:number|null|undefined):n is number=>n!=null&&Number.isFinite(n);
const percent=(value:number)=>`${Math.round(Math.abs(value)*100)}%`;
const signed=(value:number)=>`${Math.round(value*100)===0?'':value<0?'−':'+'}${percent(value)}`;
export function sinceLabel(value:number|null|undefined):string {return finite(value)?`Since then ${signed(value)}`:'';}
export function historyHeadline(frame:string,summary:Pick<HistorySummary,'atBuy'|'avgReturnAtBuy'|'avgReturnAll'>):string {
 const title=`${frame.replace(/^(\d{4})Q/, '$1 Q')}: ${summary.atBuy} at a fair price.`;
 return finite(summary.avgReturnAtBuy)&&finite(summary.avgReturnAll)
  ?`${title} ${Math.abs(summary.avgReturnAtBuy)<.005?'Flat':`${summary.avgReturnAtBuy<0?'Down':'Up'} ${percent(summary.avgReturnAtBuy)}`} since; analysed index companies ${Math.abs(summary.avgReturnAll)<.005?'flat':signed(summary.avgReturnAll)}.`:title;
}
/** A separately refreshed, same-provider price basis leaves the prediction untouched. */
export function refreshReturn(row:SnapshotRow,frame:string,prices:ReturnPrices|undefined):SnapshotRow {
 const result:SnapshotRow=[...row];result[4]=null;delete result[8];
 const cutoff=quarterEnd(frame.includes('Q')?frame:`${frame}Q4`);
 const start=prices?.prices.find(([month])=>month===cutoff.slice(0,7))?.[1];
 if(!prices||!finite(start)||start<=0||!finite(prices.latest[0])||prices.latest[0]<0||prices.latest[1]<cutoff)return result;
 result[4]=Number((prices.latest[0]/start-1).toFixed(6));
 result[8]={date:prices.latest[1],...(prices.lastTraded?{lastTraded:true}:{})};
 return result;
}
