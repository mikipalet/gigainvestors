import type {PriceHistory} from './types';

/** A provider switch must not silently undo split adjustments. Three recent
 * closed months on the same basis plus multiple conflicting older months flag
 * a historical restatement requiring reconciliation, rather than a new quote.
 * Keep released observations until a compatible source refresh is available;
 * never infer a split factor or fabricate older adjusted prices from ratios. */
export function historyBasisConflict(incoming:PriceHistory,reviewed:PriceHistory):boolean {
 const prices=new Map(incoming);
 const boundary=reviewed.at(-1)?.[0];
 if(!boundary)return false;
 const common=reviewed.filter(([month])=>month<boundary&&prices.has(month));
 const recent=common.slice(-3);
 return recent.length===3&&recent.every(([m,p])=>Math.abs(prices.get(m)!/p-1)<=.005)
  &&common.slice(0,-3).filter(([m,p])=>Math.abs(prices.get(m)!/p-1)>.02).length>=3;
}

export function retainReviewedPriceHistory(incoming:PriceHistory,reviewed:PriceHistory):PriceHistory {
 if(!historyBasisConflict(incoming,reviewed))return incoming;
 const latest=reviewed.at(-1)![0],prices=new Map(incoming);
 // The last observation can be an open month. Refresh a material quote move,
 // while preserving exact reviewed observations against float/decimal noise.
 return [...reviewed.map(([month,price]):[string,number]=>{
  const next=prices.get(month);
  return [month,month===latest&&next!==undefined&&Math.abs(next/price-1)>1e-6?next:price];
 }),...incoming.filter(([month])=>month>latest)];
}
