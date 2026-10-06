import {T} from './config';
import type {Year} from './types';
/** XBRL decimals describes precision, never a multiplier. SEC normally expands
 * scale into val, but some issuer comparisons omit it. Repair those only when
 * independent observations identify one scale; otherwise keep the old input. */
export function shareUnitScale(unit:string):number|null {
 if(unit==='shares')return 1;
 if(/^shares(?: in)? thousands$/i.test(unit))return 1_000;
 if(/^shares(?: in)? millions$/i.test(unit))return 1_000_000;
 return null;
}
export function resolveShareScale(value:number,baseline:number|null,corroboration:number[],neighbours:number[]=[]):number|null {
 if(!Number.isFinite(value)||value<=0)return null;
 const valid=(n:number|null):n is number=>n!==null&&Number.isFinite(n)&&n>0;
 const close=(a:number,b:number)=>a/b>=.5&&a/b<=2;
 const peers=corroboration.filter(valid);
 if(!valid(baseline)) {
  // A missing baseline is not permission to introduce a different share basis.
  return peers.length&&!peers.some(n=>close(value,n))?null:1;
 }
 if(close(value,baseline))return 1;
 // An isolated corrupt cached denominator is not a scale anchor. Require
 // cross-year agreement with the incoming fact and no support for the old basis.
 const adjacent=neighbours.filter(valid);
 if(adjacent.some(n=>close(value,n))&&adjacent.every(n=>!close(baseline,n)))return 1;
 const scales=[.000001,.001,1_000,1_000_000].filter(scale=>close(value*scale,baseline)&&peers.some(n=>close(value*scale,n)));
 return scales.length===1?scales[0]:null;
}

/** A correction must not create a discontinuity in a previously coherent
 * listing-basis history. Retain the affected old counts and their provenance;
 * neither a filing date nor a completion-cache priority proves a share action. */
export function retainShareContinuity(before:Year[],after:Year[]):Year[]{
 const prior=new Map(before.map(y=>[y.end,y]));
 const rows=[...after].sort((a,b)=>a.end.localeCompare(b.end));
 const coherent=(a:number|null,b:number|null)=>a!=null&&b!=null&&a>0&&b>0&&b/a>T.integrity.minShareRatio&&b/a<T.integrity.maxShareRatio;
 for(let pass=0;pass<rows.length;pass++){
  const restore=new Set<number>();
  for(let i=1;i<rows.length;i++){
   const a=rows[i-1],b=rows[i],oldA=prior.get(a.end),oldB=prior.get(b.end);
   if(!oldA||!oldB||!coherent(oldA.dilutedShares,oldB.dilutedShares)||coherent(a.dilutedShares,b.dilutedShares))continue;
   if(a.dilutedShares!==oldA.dilutedShares)restore.add(i-1);
   if(b.dilutedShares!==oldB.dilutedShares)restore.add(i);
  }
  if(!restore.size)break;
  for(const i of restore){
   const old=prior.get(rows[i].end)!;
   const provenance={...rows[i].provenance};
   if(old.provenance?.dilutedShares)provenance.dilutedShares=old.provenance.dilutedShares;else delete provenance.dilutedShares;
   rows[i]={...rows[i],dilutedShares:old.dilutedShares,dilutedShareBasis:old.dilutedShareBasis,provenance};
  }
 }
 return rows;
}
