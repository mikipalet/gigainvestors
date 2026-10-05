import {readStore} from '@/lib/value/store';
import {getInvestor} from '@/lib/data';
import type {Dossier} from '@/lib/value/types';
import {investorUrl} from './urls';
import {number} from './company';
/** Filing observations have their own dates; never label them with a quote date. */
export async function holderObservations(d:Dossier) {
 const aliases=await readStore<Record<string,string>>('aliases.json');
 const tickers=new Set([d.id,...Object.entries(aliases??{}).filter(([,id])=>id===d.id).map(([id])=>id)].filter(id=>id.endsWith('.US')).map(id=>id.slice(0,-3).replaceAll('-','.')));
 const observations=await Promise.all(d.holders.map(async h=>{
  const investor=await getInvestor(h.code), quarter=investor?.quarters.at(-1);
  const positions=quarter?.positions.filter(p=>tickers.has(p.ticker)&&p.activity!=='sold')??[];
  return quarter?positions.map(position=>`- [${h.name}](${investorUrl(h.code)}): ${number(position.shares)} ${position.ticker} shares; USD ${number(position.value)} reported position value; ${number(position.pct)}% of portfolio; ${position.activity}; quarter ${quarter.q}.`).join('\n'):null;
 }));
 return observations.filter(Boolean).join('\n');
}
