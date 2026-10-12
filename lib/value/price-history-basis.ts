import type {PriceHistory,Year} from './types';

type ShareYear=Pick<Year,'end'|'dilutedShares'>;
const month=(m:string)=>Number(m.slice(0,4))*12+Number(m.slice(5,7));

/** The refreshed history differs from the released one only by whole split
 * steps the released history never applied: the ratio refreshed/released is
 * constant (within 1%) on each run of older months, changes by at least 10%
 * only between consecutive months where the refresh is continuous and the
 * released history jumps by that step, and is 1 on the recent months. That is the signature of a
 * split missing from the released adjustment (the vendor lists only its last
 * split). The refresh is on the released share basis only when the annual
 * diluted share counts are already restated across every such step (they do
 * not jump by the step); otherwise the released prices match unrestated shares
 * and the conflict is genuine. */
export function splitAdjustedRefresh(incoming:PriceHistory,reviewed:PriceHistory,years:readonly ShareYear[]):boolean {
 const prices=new Map(incoming);
 const common=reviewed.filter(([m,p])=>prices.has(m)&&p>0).map(([m,p]):[string,number]=>[m,prices.get(m)!/p]);
 if(common.length<6)return false;
 const runs:Array<{from:string;to:string;ratio:number}>=[];
 for(const [m,r] of common){
  const run=runs.at(-1);
  if(run&&Math.abs(r/run.ratio-1)<=.01){run.to=m;continue;}
  runs.push({from:m,to:m,ratio:r});
 }
 const last=runs.at(-1)!;
 if(Math.abs(last.ratio-1)>.005||runs.length<2)return false;
 const shares=[...years].filter(y=>y.dilutedShares!=null&&y.dilutedShares>0).sort((a,b)=>a.end.localeCompare(b.end));
 for(let i=1;i<runs.length;i++){
  const before=runs[i-1],after=runs[i],step=after.ratio/before.ratio;
  // A single-month run or a gap is not a split boundary.
  if(Math.abs(Math.log(step))<Math.log(1.1)||month(after.from)-month(before.to)!==1)return false;
  if(i<runs.length-1&&month(after.to)===month(after.from))return false;
  // The refresh is the adjusted side: continuous across the step, where the released history jumps by it.
  const move=prices.get(after.from)!/prices.get(before.to)!;
  if(Math.abs(Math.log(move))>=Math.abs(Math.log(step))/2)return false;
  const boundary=`${after.from}-01`;
  const a=shares.filter(y=>y.end<boundary).at(-1),b=shares.find(y=>y.end>=boundary);
  if(!a||!b)return false;
  // Restated shares move far less than the step across it; unrestated ones move by the step.
  if(Math.abs(Math.log(b.dilutedShares!/a.dilutedShares!))>Math.abs(Math.log(step))/2)return false;
 }
 return true;
}

/** A provider switch must not silently undo split adjustments. Three recent
 * closed months on the same basis plus multiple conflicting older months flag
 * a historical restatement requiring reconciliation, rather than a new quote.
 * Keep released observations until a compatible source refresh is available;
 * never infer a split factor or fabricate older adjusted prices from ratios.
 * A refresh that only applies splits the released history missed, across
 * restated annual share counts, is compatible. */
export function historyBasisConflict(incoming:PriceHistory,reviewed:PriceHistory,years:readonly ShareYear[]=[]):boolean {
 const prices=new Map(incoming);
 const boundary=reviewed.at(-1)?.[0];
 if(!boundary)return false;
 const common=reviewed.filter(([month])=>month<boundary&&prices.has(month));
 const recent=common.slice(-3);
 return recent.length===3&&recent.every(([m,p])=>Math.abs(prices.get(m)!/p-1)<=.005)
  &&common.slice(0,-3).filter(([m,p])=>Math.abs(prices.get(m)!/p-1)>.02).length>=3
  &&!splitAdjustedRefresh(incoming,reviewed.filter(([month])=>month<boundary),years);
}

export function retainReviewedPriceHistory(incoming:PriceHistory,reviewed:PriceHistory,years:readonly ShareYear[]=[]):PriceHistory {
 if(!historyBasisConflict(incoming,reviewed,years))return incoming;
 const latest=reviewed.at(-1)![0],prices=new Map(incoming);
 // The last observation can be an open month. Refresh a material quote move,
 // while preserving exact reviewed observations against float/decimal noise.
 return [...reviewed.map(([month,price]):[string,number]=>{
  const next=prices.get(month);
  return [month,month===latest&&next!==undefined&&Math.abs(next/price-1)>1e-6?next:price];
 }),...incoming.filter(([month])=>month>latest)];
}
