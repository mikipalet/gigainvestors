import {issuerFilingShareObservations} from './publication-continuity';
import {reconcileShares,type ShareCheck} from './share-check';

/** Use already cached primary evidence for every operating quality outcome.
 * A prior missing audit is not evidence of a conflicting share denominator.
 * Same issuer, ordinary listing basis, source ages and the existing independent
 * 2% reconciliation rule all remain mandatory. No provider request is made. */
export function cachedPublicationShares(raw:unknown,facts:unknown,previous:ShareCheck|null,cutoff:string):ShareCheck|null {
 const r=raw as any,f=facts as any,g=r?.General;
 const age=(Date.parse(cutoff)-Date.parse(g?.UpdatedAt?.slice(0,10)))/86400000;
 if(!g?.CIK||Number(g.CIK)!==f?.cik||!Number.isFinite(age)||age<0||age>14)return previous;
 const shares=Number(r?.SharesStats?.SharesOutstanding);
 const filing=issuerFilingShareObservations(raw,facts,cutoff);
 if(!filing.length||!Number.isFinite(shares)||shares<=0)return previous;
 const observations=[...(previous?.observations??[]),
  {source:'eodhd:current',shares,date:g.UpdatedAt.slice(0,10),basis:'all-ordinary-outstanding'},
  ...filing.map(o=>({...o,source:'sec:cover'}))];
 const result=reconcileShares(observations);
 if(result.status!=='verified')return previous;
 return {...result,checkedAt:cutoff+'T00:00:00.000Z'};
}
