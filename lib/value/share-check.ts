export type ShareObservation={source:string;shares:number;date?:string;url?:string;basis?:string;corroborationOnly?:boolean};
export type ShareCheck={status:'verified'|'pending';shares:number|null;observations:ShareObservation[];checkedAt?:string;reason:string};
/** Agreement must be independent and on the same listing basis. No cap/price circular proof. */
export function reconcileShares(observations:ShareObservation[]):ShareCheck {
 const valid=observations.filter(o=>Number.isFinite(o.shares)&&o.shares>0);
 const bySource=new Map<string,ShareObservation>();
 for(const o of valid){const prior=bySource.get(o.source);if(!prior||(o.date??'')>=(prior.date??''))bySource.set(o.source,o);}
 const independent=[...bySource.values()];
 // A vendor's old annual count cannot corroborate another provider after that
 // same vendor has reported a materially different, newer count. Preserve all
 // observations for review, but remove superseded values from the voting pool.
 const voters=independent.filter(a=>!a.corroborationOnly&&!independent.some(b=>
  !b.corroborationOnly&&a.date&&b.date&&b.date>a.date
  &&a.source.split(':')[0]===b.source.split(':')[0]
  &&(!a.basis||!b.basis||a.basis===b.basis)
  &&Math.max(a.shares,b.shares)/Math.min(a.shares,b.shares)>1.02));
 const pair=voters.flatMap((a,i)=>voters.slice(i+1).filter(b=>a.source.split(':')[0]!==b.source.split(':')[0]&&(!a.basis||!b.basis||a.basis===b.basis)&&Math.max(a.shares,b.shares)/Math.min(a.shares,b.shares)<=1.02).map(b=>[a,b])).sort((a,b)=>(b.map(o=>o.date??'').sort()[0]).localeCompare(a.map(o=>o.date??'').sort()[0]))[0];
 return {status:pair?'verified':'pending',shares:pair?[...pair].sort((a,b)=>(a.date??'').localeCompare(b.date??'')).at(-1)!.shares:null,observations:independent,reason:pair?'Independent share counts agree within 2%':'Share count being checked'};
}

/** Re-denominate the existing enterprise valuation; do not recompute business economics. */
export function applyShareCheck<T extends import('./types').Analysis>(analysis:T,check:ShareCheck|null):T {
 if(!analysis.valuation||!check)return analysis;
 // Recheck stored provider evidence as well: deploying a reconciliation fix
 // must not keep trusting a previously accepted, now-invalid cached vote.
 const observations=analysis.valuation.shareBasis?check.observations.filter(o=>o.basis===analysis.valuation!.shareBasis):check.observations;
 check={...check,...reconcileShares(observations)};
 if(check.status!=='verified'||!check.shares||check.checkedAt&&Date.now()-Date.parse(check.checkedAt)>7*86400_000){
  const {shareSources:_untrusted,...valuation}=analysis.valuation;
  return {...analysis,valuation:{...valuation,assumptions:[...valuation.assumptions.filter(note=>!/^Share count verified within 2%:|^Unverified share count:/.test(note)),'Unverified share count: independent sources do not yet reconcile']}};
 }
 // Reported NAV/share is already a per-share observation. Current share-count
 // corroboration must not re-denominate it as though it were aggregate earnings.
 if(analysis.valuation.method==='nav')return {...analysis,valuation:{...analysis.valuation,shareSources:2,shares:check.shares}};
 const v=withShareDenominator(analysis.valuation,check.shares);
 return {...analysis,valuation:{...v,shareSources:2,
  assumptions:[...v.assumptions.filter(note=>!/share count corrected|share sources disagree|share count not corrected|unverified|share count verified/i.test(note)),`Share count verified within 2%: ${check.observations.map(o=>`${o.source} ${o.shares} (${o.date??'current'})`).join('; ')}`]}};
}

/** Re-denominate a valuation without making any share-confidence claim. */
export function withShareDenominator(v:import('./types').Valuation,shares:number):import('./types').Valuation {
 if(!Number.isFinite(shares)||shares<=0)throw Error('Invalid share denominator');
 if(v.method==='nav')return {...v,shares};
 const factor=v.shares/shares;
 const range=<R extends {low:number;mid:number;high:number}>(r:R):R=>({...r,low:r.low*factor,mid:r.mid*factor,high:r.high*factor});
 return {...v,shares,perShare:range(v.perShare),...(v.perShareTrading?{perShareTrading:range(v.perShareTrading)}:{}),
  ...(v.method==='book_value'?{normalized:v.normalized*factor,...(v.financialReturn?{financialReturn:{...v.financialReturn,cashPerShare:v.financialReturn.cashPerShare*factor}}:{})}:{}),
  bridge:v.bridge.map(row=>/^÷ (?:current )?shares$/.test(row.label)?{...row,label:'÷ current shares',value:shares}:/per share/i.test(row.label)?{...row,value:row.value*factor}:row)};
}

/** Issued and treasury figures must share a fiscal date. Filing-date issued
 * shares may already reflect a cancellation of the year-end treasury stock. */
export function edinetShareObservation(year: import('./types').Year): ShareObservation | null {
 const facts=year.edinetShares;
 if(!facts?.issued || facts.treasury===null || !year.end)return null;
 return {source:'edinet',shares:facts.issued-facts.treasury,date:year.end,basis:'issuer shares in listing units'};
}
