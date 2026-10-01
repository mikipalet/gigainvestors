import { monetaryCandidates } from '../thesis/amounts';
import type { Source } from './read';
import type { Evidence } from './types';
export interface ReportedAdjustmentFact { fy:number;field:'disclosedMaintenanceCapex'|'nonRecurring'|'acquisitionSharesIssued';value:number;evidence:Evidence }
/** Literal, single-amount disclosures only. Ambiguous tables, currency, periods or totals stay untouched. */
export function reportedAdjustmentFacts(sources:Source[],currency:string):ReportedAdjustmentFact[]{
 const facts:ReportedAdjustmentFact[]=[];
 for(const source of sources.filter(s=>s.section!=='wiki'))for(const quote of source.text.split(/\n\s*\n/)){
  if(quote.length>1600)continue;
  const fiscal=[...new Set(quote.match(/\b20\d{2}\b/g))];if(fiscal.length!==1)continue;
  const field=/maintenance (?:capital expenditur|capex|capital spend)/i.test(quote)?'disclosedMaintenanceCapex'
   :/(?:non.recurring|one.time|one.off) operating (?:charge|expense)/i.test(quote)?'nonRecurring'
   :/issued[\s\S]{0,100}shares[\s\S]{0,100}(?:to acquire|as (?:acquisition |merger )?consideration)/i.test(quote)?'acquisitionSharesIssued':null;
  if(!field||/expect|plan|forecast|guidance|estimated|approximately|up to/i.test(quote))continue;
  const amounts=monetaryCandidates(quote).filter(c=>!c.percent&&c.value>0);
  if(amounts.length!==1)continue;
  const money=field!=='acquisitionSharesIssued';
  const explicit:string[]=quote.match(/\b(?:USD|EUR|GBP|CAD|AUD|JPY|CHF|CNY)\b/g)??[];
  if(money&&(!explicit.includes(currency)||new Set(explicit).size!==1))continue;
  if(!money&&(!/\b(?:million|thousand)\s+(?:common\s+)?shares\b/i.test(quote)||!/weighted.average/i.test(quote)))continue;
  facts.push({fy:Number(fiscal[0]),field,value:amounts[0].value,evidence:{quote,url:source.url,filed:source.filed,section:source.section}});
 }
 return [...new Map(facts.map(f=>[JSON.stringify(f),f])).values()];
}
