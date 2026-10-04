import {getInvestor} from '@/lib/data';
import type {Dossier} from '@/lib/value/types';
import {investorUrl} from './urls';
import {number} from './company';
/** Filing observations have their own dates; never label them with a quote date. */
export async function holderObservations(d:Dossier) {
 const observations=await Promise.all(d.holders.map(async h=>{
  const investor=await getInvestor(h.code), quarter=investor?.quarters.at(-1);
  const position=quarter?.positions.find(p=>p.ticker===d.company.code&&p.activity!=='sold');
  return quarter&&position?`- [${h.name}](${investorUrl(h.code)}): ${number(position.shares)} shares; USD ${number(position.value)} reported position value; ${number(position.pct)}% of portfolio; ${position.activity}; quarter ${quarter.q}.`:null;
 }));
 return observations.filter(Boolean).join('\n');
}
