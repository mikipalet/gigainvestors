export type HistoricalPrice = {discount:number;price:number|null;buyPrice:number|null};
export type {SnapshotRow} from './types';
type SnapshotSummary = {analysed:number;qualityPasses:number;atBuy:number;medianReturnAtBuy?:number|null;medianReturnAll?:number|null;returnCountAtBuy?:number;returnCountAll?:number;avgReturnAtBuy:number|null;avgReturnQuality:number|null;avgReturnAll:number|null};
export type HistoryIndex = {quarters?:string[];perQuarter?:Record<string,SnapshotSummary>;western?:{perYear:Record<string,SnapshotSummary>;perQuarter?:Record<string,SnapshotSummary>};years:number[];assumptions?:string[];caveats?:string[];asOf?:string;perYear:Record<string,SnapshotSummary>};

/** The oldest cohort's median is not a pooled median across overlapping yearly cohorts. */
export function trackRecord(history:HistoryIndex|null) {
 const years=(history?.years??[]).filter(y=>Number.isFinite(history?.perYear[y]?.medianReturnAtBuy)&&Number.isFinite(history?.perYear[y]?.medianReturnAll)).sort((a,b)=>a-b);
 if(!history||!years.length)return null;
 const first=history.perYear[years[0]];
 return {since:years[0],buy:first.medianReturnAtBuy!,all:first.medianReturnAll!,wins:years.filter(y=>history.perYear[y].medianReturnAtBuy!>history.perYear[y].medianReturnAll!).length,years:years.length};
}

/** Small early cohorts stay unpublished; later cohorts retain their honest counts. */
export function availableHistoryYears(counts: Record<number,number>, minimum=300): number[] {
 const years=Object.keys(counts).map(Number).sort((a,b)=>a-b);
 const first=years.find(y=>counts[y]>=minimum);
 return first===undefined?[]:years.filter(y=>y>=first);
}

export function quarterEnd(q:string):string {
 if(!/^\d{4}Q[1-4]$/.test(q))throw new Error('Invalid calendar quarter');
 return new Date(Date.UTC(Number(q.slice(0,4)),Number(q.at(-1))*3,0)).toISOString().slice(0,10);
}
export function calendarQuarters(asOf:string,from=2005):string[] {
 const quarters:string[]=[];
 for(let year=from;year<=Number(asOf.slice(0,4));year++)for(let q=1;q<=4;q++){
  const key=`${year}Q${q}`;if(quarterEnd(key)<asOf)quarters.push(key);
 }
 return quarters;
}
export function historyFrame(query:Record<string,string>,quarters:string[]):string {
 const key=/^\d{4}Q[1-4]$/.test(query.q??'')?query.q:/^\d{4}$/.test(query.year??'')?`${query.year}Q4`:'';
 return quarters.includes(key)?key:'Today';
}
