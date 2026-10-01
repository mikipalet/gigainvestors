import type { Valuation } from '../types';
import type { PublicThesis, ThesisAnswer, ThesisGrade, ThesisTrust } from './types';

export function questionTrusted(version:string, grade:ThesisGrade|undefined):boolean {
  return !!grade && grade.version===version && grade.n>0 && grade.positives>0 && grade.negatives>0 && grade.accuracy>=.9 && grade.accuracy<=1;
}
const reasons = {
  thesis_structural:'The company disclosed a structural decline in its core business.',
  thesis_liability:'A disclosed liability could exceed 10% of shareholders’ equity.',
  thesis_distress:'The company disclosed financial distress or a dividend suspension.',
};
export function thesisDecision(answers:ThesisAnswer[],trust:ThesisTrust):PublicThesis {
  const flags=answers.filter(a=>a.id!=='thesis_guidance'&&a.value==='yes'&&questionTrusted(a.version,trust[a.id])&&a.evidence?.quote.trim()&&/^https:\/\//.test(a.evidence.url));
  let reason=flags.length?reasons[flags[0].id as keyof typeof reasons]:'';
  const first=flags[0],quote=first?.evidence?.quote??'';
  if(first?.id==='thesis_liability'){
    if(/motor finance|redress/i.test(quote))reason='Disclosed customer redress costs could exceed 10% of shareholders’ equity.';
    else if(/tax|IRS|repatriation/i.test(quote))reason='A disclosed tax dispute could exceed 10% of shareholders’ equity.';
    else if(/class action|damages/i.test(quote))reason='A disclosed legal claim could exceed 10% of shareholders’ equity.';
  }else if(first?.id==='thesis_distress'&&/dividend/i.test(quote))reason='The company has suspended its ordinary dividend.';
  return {changed:flags.length>0,reason,evidence:flags.map(a=>a.evidence!)};
}
export function thesisTriggers(input:{buy:boolean;next:boolean;quality:boolean;drawdown:number|null;financial:boolean;charges:Array<{amount:number;equity:number}>}):string[] {
  return [input.buy?'buy':null,input.next?'next_closest':null,input.quality&&input.drawdown!==null&&input.drawdown>.4?'drawdown':null,
    input.financial&&input.charges.some(c=>Number.isFinite(c.amount)&&Number.isFinite(c.equity)&&c.amount>0&&(c.equity<=0||c.amount/c.equity>.1))?'financial_charges':null].filter((s):s is string=>s!==null);
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
