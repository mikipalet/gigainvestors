import type { Valuation } from '../types';
import { createUsdRate } from '../fx';
import type { PublicThesis, ThesisAnswer, ThesisGrade, ThesisTrust, ThesisMarket, SizedLiability } from './types';

export function questionTrusted(version:string, grade:ThesisGrade|undefined):boolean {
  return !!grade && grade.enabled!==false && grade.version===version && grade.n>0 && grade.positives>0 && grade.negatives>0 && grade.accuracy>=.9 && grade.accuracy<=1;
}
const reasons = {
  thesis_structural:'The company disclosed a structural decline in its core business.',
  thesis_liability:'A company-specific liability exceeds 10% of market value.',
  thesis_distress:'The company disclosed financial distress or a dividend suspension.',
};
function amountLabel(amount:number,currency:string):string {
 const symbol=({GBP:'£',USD:'$',EUR:'€'} as Record<string,string>)[currency]??`${currency} `;
 const scale=amount>=1e9?1e9:amount>=1e6?1e6:1;
 return `${symbol}${Number((amount/scale).toPrecision(4))}${scale===1e9?'bn':scale===1e6?'m':''}`;
}
export function thesisDecision(answers:ThesisAnswer[],trust:ThesisTrust,market?:ThesisMarket):PublicThesis {
 const supported=answers.filter(a=>a.id!=='thesis_guidance'&&a.value==='yes'&&questionTrusted(a.version,trust[a.id])&&a.evidence?.quote.trim()&&/^https:\/\//.test(a.evidence.url));
 const sized:SizedLiability[]=supported.flatMap(a=>{
  const l=a.liability;
  if(a.id!=='thesis_liability'||!l||!['provided','estimated','claimed'].includes(l.basis)||!Number.isFinite(l.amount)||l.amount<=0||!market?.marketValue||!Number.isFinite(market.marketValue)||market.marketValue<=0)return [];
  const rate=createUsdRate({rates:market.usdRates??{}}),from=rate(l.currency),to=rate(market.currency);
  const amount=l.currency===market.currency?l.amount:from&&to?l.amount*from/to:null;
  if(amount===null)return [];
  return [{...l,marketValueRatio:amount/market.marketValue,ownerEarningsRatio:market.ownerEarnings&&market.ownerEarnings>0?amount/market.ownerEarnings:null,evidence:a.evidence!}];
 });
 // A more recent balance supersedes the older amount for the same matter.
 // Never add overlapping charges, balances and claimed damages together.
 const liabilities=[...new Map(sized.sort((a,b)=>a.evidence.filed.localeCompare(b.evidence.filed)||a.marketValueRatio-b.marketValueRatio).map(l=>[l.topic,l])).values()];
 // Display the largest material exposure; retain all sized readings for audit.
 const material=liabilities.filter(l=>l.marketValueRatio>.1).sort((a,b)=>b.marketValueRatio-a.marketValueRatio).slice(0,1);
 const flags=supported.filter(a=>a.id!=='thesis_liability');
 const dividend=answers.find(a=>a.id==='thesis_distress'&&a.evidence&&/will not pay a final dividend/i.test(a.evidence.quote)&&material.some(l=>l.topic==='Motor-finance redress'&&l.evidence.url===a.evidence!.url&&l.evidence.filed===a.evidence!.filed));
 const liabilityReasons=material.map(l=>{
  const quote=l.evidence.quote;
  const date=l.basis==='claimed'?quote.match(/(?:November|Nov)\s+2025/i)?' (Nov 2025)':'':'';
  return `${l.topic}: ${amountLabel(l.amount,l.currency)} ${l.basis}${date}`;
 });
 const reason=[...liabilityReasons,...(dividend?['final dividend withheld']:[]),...flags.map(a=>a.id==='thesis_distress'&&/dividend/i.test(a.evidence!.quote)?'The company has suspended its ordinary dividend.':reasons[a.id as keyof typeof reasons])].join('; ');
 return {changed:material.length>0||flags.length>0,reason,evidence:[...material.map(l=>l.evidence),...(dividend?[dividend.evidence!]:[]),...flags.map(a=>a.evidence!)],...(liabilities.length?{liabilities}:{})};
}
export function thesisTriggers(input:{buy:boolean;next:boolean;quality:boolean;drawdown:number|null;financial:boolean;charges:Array<{amount:number;marketValue:number}>}):string[] {
  return [input.buy?'buy':null,input.next?'next_closest':null,input.quality&&input.drawdown!==null&&input.drawdown>.4?'drawdown':null,
    input.financial&&input.charges.some(c=>Number.isFinite(c.amount)&&Number.isFinite(c.marketValue)&&c.amount>0&&c.marketValue>0&&c.amount/c.marketValue>.1)?'financial_charges':null].filter((s):s is string=>s!==null);
}
/** DCF is linear in owner earnings. Keep cash fixed, including the trading FX. */
export function guidedValuation(v:Valuation,normalized:number,reason:string):Valuation {
  if(v.method!=='owner_earnings'||!Number.isFinite(normalized)||normalized<0||normalized>=v.normalized||v.normalized<=0||v.shares<=0)return v;
  const factor=normalized/v.normalized,cash=v.netCash/v.shares;
  const scale=(n:number)=>(n-cash)*factor+cash;
  const range={low:scale(v.perShare.low),mid:scale(v.perShare.mid),high:scale(v.perShare.high)};
  const bridge=v.bridge.flatMap(row=>row.label==='= owner earnings'?[{label:'− current-year guidance adjustment',value:normalized-v.normalized},{...row,value:normalized}]:[{...row}]);
  return {...v,normalized,perShare:range,
    ...(v.perShareTrading?{perShareTrading:{...v.perShareTrading,low:range.low*v.perShareTrading.fxRate,mid:range.mid*v.perShareTrading.fxRate,high:range.high*v.perShareTrading.fxRate}}:{}),
    equityBondYield:v.equityBondYield===null?null:v.equityBondYield*factor,bridge,assumptions:[...v.assumptions,reason]};
}
