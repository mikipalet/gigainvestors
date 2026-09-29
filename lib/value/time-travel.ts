/** Additive round-seven publication contract. History contains numerical tests, never Jev readings. */
export type SnapshotRow = [id:string,t5:string,pm:number|null,b:boolean,r:number|null];
export type SnapshotSummary = {analysed:number;qualityPasses:number;atBuy:number;avgReturnAtBuy:number|null;avgReturnQuality:number|null;avgReturnAll:number|null};
export type HistoryIndex = {years:number[];perYear:Record<string,SnapshotSummary>};
