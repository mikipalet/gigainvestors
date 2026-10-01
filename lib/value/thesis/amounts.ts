import type { JevQuestion, Year } from '../types';
import type { Ask } from './evidence';
import type { ThesisAnswer } from './types';
export function monetaryCandidates(text:string):Array<{raw:string;value:number;percent:boolean}>{
 const explicit=[...text.matchAll(/(?:[$£€]|USD\s*|GBP\s*|EUR\s*|CHF\s*)?-?\d[\d,]*(?:\.\d+)?\s*(?:billion|million|thousand|bn\b|m\b|%)/gi)].map(m=>{
  const value=Number(m[0].replace(/[^\d.-]/g,''));
  const scale=/billion|bn\b/i.test(m[0])?1e9:/million|m\b/i.test(m[0])?1e6:/thousand/i.test(m[0])?1e3:1;
  return {raw:m[0],value:value*scale,percent:m[0].includes('%')};
 }).filter(c=>Number.isFinite(c.value));
 const tableUnit=text.match(/(?:dollars|amounts|figures|£|€|\$)\s*(?:in\s*)?(millions|thousands)|(?:in|£|€|\$)\s*(millions|thousands)/i)?.[0];
 const table=tableUnit?[...text.matchAll(/(?<![\w.])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\w.])/g)].map(m=>({raw:`${m[0]} (${tableUnit})`,value:Number(m[0].replaceAll(',',''))*(/million/i.test(tableUnit)?1e6:1e3),percent:false})):[];
 return [...explicit,...table];
}
export async function extractAmounts(answers:ThesisAnswer[],currency:string,latest:Year|undefined,ask:Ask):Promise<void>{
 for(const answer of answers){
  if(answer.value!=='yes'||!answer.evidence||!['thesis_liability','thesis_guidance'].includes(answer.id))continue;
  const candidates=monetaryCandidates(answer.evidence.quote);
  if(!candidates.length)continue;
  const q:JevQuestion={type:'choice',instructions:answer.id==='thesis_liability'
   ?'Select the current total management provision or best estimate for the specific legal/regulatory/redress matter. For asserted third-party claims without a management estimate select the claimed damages. Prefer the total remaining provision over this period’s charge; never sum overlapping totals. EXCLUDE taxes, banking commitments/guarantees/notionals, insurance reserves and ordinary operating provisions. Select none if no qualifying exposure amount is stated.'
   :'Select the current FULL YEAR guided revenue or operating profit, or the guided percentage decline, supporting a decline greater than 20%. For a range select its lower absolute earnings/revenue endpoint (or larger percentage decline). Do not select a past result, quarter, EPS or cost-cutting target. Select none if there is no explicitly quantified qualifying guidance.',
   criteria:{none:'No supported amount',...Object.fromEntries(candidates.map((c,i)=>[`n${i}`,c.raw]))}};
  const questions:Record<string,JevQuestion>={amount:q};
  if(answer.id==='thesis_liability'){
   questions.basis={type:'choice',instructions:'What does the selected liability amount represent? Exclude routine banking commitments, guarantees, loan commitments, derivatives notionals, tax positions/audits, insurance reserves and ordinary operating provisions.',criteria:{provided:'Management provision/accrual or recorded fine/settlement for this matter',estimated:'Management best estimate of exposure',claimed:'Asserted third-party damages/claim, not management estimate or established loss',excluded:'Excluded routine or unquantified exposure'}};
   questions.currency={type:'choice',instructions:'Select the currency of the selected exposure amount. Use the explicit currency/symbol or filing reporting currency, not the market capitalization currency.',criteria:Object.fromEntries([...new Set([currency,'USD','GBP','EUR','CHF','JPY','CNY','CAD','AUD','unknown'])].map(c=>[c,c]))};
   questions.topic={type:'choice',instructions:'Select the specific matter supported by this quote. Do not infer a matter from outside knowledge.',criteria:{motor:'Motor-finance redress',collective:'Collective proceedings claim',glyphosate:'Glyphosate litigation',pfas:'PFAS litigation/remediation',earplugs:'Combat earplugs litigation',talc:'Talc litigation',interchange:'Interchange litigation',competition:'Competition/antitrust claim',remediation:'Customer remediation',fine:'Regulatory fine',legal:'Litigation/regulatory exposure'}};
  }
  if(answer.id==='thesis_guidance')questions.metric={type:'choice',instructions:'Which financial metric does the selected current full-year guidance describe?',criteria:{revenue:'Revenue',operating_profit:'Operating profit (not EPS, EBITDA or pre-tax profit)',none:'Neither'}};
  const state=`Reporting currency: ${currency}. Prior full-year revenue: ${latest?.revenue??'not supplied'}; prior full-year operating profit: ${latest?.operatingIncome??'not supplied'} (absolute currency units). These are the comparison-year figures for the guided year.\nQuoted filing disclosure:\n${answer.evidence.quote}`;
  const result=await ask({state,questions});
  const selected=result.answers.amount;
  const candidate=selected?.type==='choice'?candidates[Number(selected.choice.replace(/^n/,''))]:undefined;
  if(!candidate)continue;
  answer.amount=candidate.raw;
  if(answer.id==='thesis_liability'){
   const basis=result.answers.basis,c=result.answers.currency,topic=result.answers.topic;
   if(basis?.type==='choice'&&['provided','estimated','claimed'].includes(basis.choice)&&c?.type==='choice'&&c.choice!=='unknown'&&topic?.type==='choice'&&!candidate.percent){
    const topics=questions.topic as Extract<JevQuestion,{type:'choice'}>;
    answer.liability={amount:candidate.value,currency:c.choice,basis:basis.choice as 'provided'|'estimated'|'claimed',topic:topics.criteria[topic.choice]};
   }
  }
  const metric=result.answers.metric;
  if(answer.id==='thesis_guidance'&&latest&&metric?.type==='choice'&&['revenue','operating_profit'].includes(metric.choice)){
   const prior=metric.choice==='revenue'?latest.revenue:latest.operatingIncome;
   if(prior==null||!Number.isFinite(prior)||prior<=0)continue;
   const guided=candidate.percent?prior*(1-Math.abs(candidate.value)/100):candidate.value;
   if(guided/prior<.8)answer.guidance={metric:metric.choice as 'revenue'|'operating_profit',currency,prior,guided};
  }
 }
}
