import type {Year} from '../types';

/** Explicit depositary ratios, never inferred from a share-count discontinuity. */
const depositaryUnits:Record<string,{ordinarySymbol:string;ratio:number;source:string}>={
 'SKLUY.US':{ordinarySymbol:'SKL.NZ',ratio:20,source:'https://depositaryreceipts.citi.com/adr/guides/pgm_dispabook.aspx?cusip=830573101&pageId=15&subpageID=111'},
};
export function secondaryListingYears(id:string,years:Year[]):Year[]{
 const unit=depositaryUnits[id];if(!unit)return years;
 return years.map(original=>{
  const y={...original,provenance:{...original.provenance}};
  for(const field of ['dilutedShares','sharesOutstanding','basicEps','dilutedEps','dividendsPerShare','navPerShare'] as const){
   const p=y.provenance[field],value=y[field];
   if(value==null||!p||!p.source.split('?')[0].endsWith('/'+unit.ordinarySymbol)||p.inputs?.some(s=>s.startsWith('Listing unit:')))continue;
   y[field]=field==='dilutedShares'||field==='sharesOutstanding'?value/unit.ratio:value*unit.ratio;
   // Preserve reported-vs-estimated evidence strength after an explicit unit conversion.
   y.provenance[field]={...p,inputs:[...(p.inputs??[]),`Listing unit: ${unit.ratio} ordinary shares per depositary receipt; ${unit.source}`,`Original ${unit.ordinarySymbol} ${field}: ${value}`]};
  }
  return y;
 });
}
