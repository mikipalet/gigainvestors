export type ShareObservation={source:string;shares:number;date?:string;url?:string;basis?:string};
export type ShareCheck={status:'verified'|'pending';shares:number|null;observations:ShareObservation[];checkedAt?:string;reason:string};
/** Agreement must be independent and on the same listing basis. No cap/price circular proof. */
export function reconcileShares(observations:ShareObservation[]):ShareCheck {
 const valid=observations.filter(o=>Number.isFinite(o.shares)&&o.shares>0);
 const independent=[...new Map(valid.map(o=>[o.source,o])).values()];
 const verified=independent.length>=2&&Math.max(...independent.map(o=>o.shares))/Math.min(...independent.map(o=>o.shares))<=1.02;
 return {status:verified?'verified':'pending',shares:verified?[...independent].sort((a,b)=>(a.date??'').localeCompare(b.date??'')).at(-1)!.shares:null,observations:independent,reason:verified?'Independent share counts agree within 2%':'Share count being checked'};
}

/** Re-denominate the existing enterprise valuation; do not recompute business economics. */
export function applyShareCheck<T extends import('./types').Analysis>(analysis:T,check:ShareCheck|null):T {
 if(!analysis.valuation||!check)return analysis;
 if(check.status!=='verified'||!check.shares||check.checkedAt&&Date.now()-Date.parse(check.checkedAt)>7*86400_000)return {...analysis,valuation:{...analysis.valuation,assumptions:[...analysis.valuation.assumptions,'Unverified share count: independent sources do not yet reconcile']}};
 const v=analysis.valuation,factor=v.shares/check.shares;
 const range=(r:{low:number;mid:number;high:number})=>({...r,low:r.low*factor,mid:r.mid*factor,high:r.high*factor});
 return {...analysis,valuation:{...v,shares:check.shares,perShare:range(v.perShare),...(v.perShareTrading?{perShareTrading:range(v.perShareTrading)}:{}),
  bridge:v.bridge.map(row=>/^÷ shares$/.test(row.label)?{...row,value:check.shares}:/per share/i.test(row.label)?{...row,value:row.value*factor}:row),
  assumptions:[...v.assumptions.filter(note=>!/share count corrected|share sources disagree|share count not corrected/i.test(note)),`Share count verified within 2%: ${check.observations.map(o=>`${o.source} ${o.shares} (${o.date??'current'})`).join('; ')}`]}};
}
