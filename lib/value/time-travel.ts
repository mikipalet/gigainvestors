export type HistoricalPrice = {discount:number;price:number|null;buyPrice:number|null};
/** Additive round-seven publication contract. History contains numerical tests, never Jev readings. */
export type SnapshotRow = [id:string,t5:string,pm:number|null,b:boolean,r:number|null,price?:HistoricalPrice];
export type SnapshotSummary = {analysed:number;qualityPasses:number;atBuy:number;medianReturnAtBuy?:number|null;medianReturnAll?:number|null;returnCountAtBuy?:number;returnCountAll?:number;avgReturnAtBuy:number|null;avgReturnQuality:number|null;avgReturnAll:number|null};
export type HistoryIndex = {western?:{perYear:Record<string,SnapshotSummary>};years:number[];assumptions?:string[];caveats?:string[];asOf?:string;perYear:Record<string,SnapshotSummary>};

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
