import {checkIntegrity} from '../integrity';
import type {Fundamentals,Year} from '../types';

/** Secondary observations must not silently destroy an already usable history.
 * Roll back only replaced share-basis facts, preserving their original provenance.
 * A genuine capital event must be reconciled before its replacement is admitted. */
export function retainCompletionHistory(prior:Year[],incoming:Year[],context:Fundamentals):Year[]{
 const changed=incoming.some(y=>{const old=prior.find(p=>p.end===y.end);return old?.dilutedShares!=null&&old.dilutedShares!==y.dilutedShares;});
 if(!changed)return incoming;
 const inspect=(years:Year[])=>{const f={...context,years:structuredClone(years)};const integrity=checkIntegrity(f);return {f,integrity};};
 const before=inspect(prior),after=inspect(incoming);
 if(!before.integrity.ok)return incoming;
 const losesHistory=({f,integrity}:ReturnType<typeof inspect>)=>!integrity.ok||before.f.years.some(y=>!f.years.some(n=>n.end===y.end));
 if(!losesHistory(after))return incoming;
 const fields=['dilutedShares','dilutedEps','basicEps','sharesOutstanding','edinetShares'] as const;
 const retained=incoming.map(y=>{
  const old=prior.find(p=>p.end===y.end);
  if(old?.dilutedShares==null||old.dilutedShares===y.dilutedShares||old.currency&&y.currency&&old.currency!==y.currency)return y;
  const copy={...y,provenance:{...y.provenance},sourceWarnings:[...(y.sourceWarnings??[]),`Retained prior shares ${old.dilutedShares}; rejected secondary shares ${y.dilutedShares} from ${y.provenance?.dilutedShares?.source?.split('?')[0]??'unknown source'}: replacement discarded usable history`]};
  for(const field of fields){Object.assign(copy,{[field]:old[field]});if(old.provenance?.[field])copy.provenance[field]=old.provenance[field];else delete copy.provenance[field];}
  return copy;
 });
 return losesHistory(inspect(retained))?incoming:retained;
}
