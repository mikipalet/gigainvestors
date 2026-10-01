import trustFile from '../jev-trust.json';
import { THESIS_VERSION } from './questions';
import { guidedValuation, questionTrusted, thesisDecision } from './decision';
import type { Analysis } from '../types';
import type { ThesisResult, ThesisTrust } from './types';
export const thesisTrust=():ThesisTrust=>(trustFile as unknown as {thesis?:ThesisTrust}).thesis??{};
export function applyThesis(analysis:Analysis,result:ThesisResult|null,trust:ThesisTrust=thesisTrust()):Analysis {
 if(!result||result.id!==analysis.id||result.version!==THESIS_VERSION||result.asOf.slice(0,10)<analysis.asOf.slice(0,10))return analysis;
 const thesis=thesisDecision(result.answers,trust,result.market);
 let valuation=analysis.valuation;
 for(const answer of result.answers){
  const g=answer.guidance;
  if(answer.id!=='thesis_guidance'||answer.value!=='yes'||!questionTrusted(answer.version,trust[answer.id])||!answer.evidence||!g||!valuation||valuation.method!=='owner_earnings')continue;
  if(g.currency!==valuation.currency||!Number.isFinite(g.prior)||!Number.isFinite(g.guided)||g.prior<=0||g.guided/g.prior>=.8)continue;
  const normalized=Math.min(valuation.normalized,Math.max(0,(g.priorOwnerEarnings??valuation.normalized)*g.guided/g.prior));
  if(normalized>=valuation.normalized)continue;
  const reason=`Owner earnings capped to reflect management’s current-year ${g.metric==='revenue'?'revenue':'operating profit'} guidance, ${((1-g.guided/g.prior)*100).toFixed(1)}% below the prior full year.`;
  thesis.guidance={before:valuation.normalized,after:normalized,reason,evidence:answer.evidence};
  valuation=guidedValuation(valuation,normalized,reason);
 }
 return thesis.changed||thesis.guidance?{...analysis,valuation,thesis}:analysis;
}
