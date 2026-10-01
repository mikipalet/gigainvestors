import type {TestOutcome} from '../types';
import type {Adjustment} from './types';
/** A single latest explanation; annual calculations remain in evidence. */
export function compactJudgement(test:TestOutcome,adjustments:Adjustment[]=[],currency='USD'):string {
 const adjustment=adjustments.filter(a=>a.test===test.key).sort((a,b)=>b.fy-a.fy)[0];
 if(adjustment?.field==='maintenanceCapex'){
  const capacity=/\bAI\b|artificial intelligence/i.test(adjustment.evidence.quote)?'AI capacity':'new capacity';
  const basis=/upkeep ≈ depreciation/.test(adjustment.reason)?'depreciation':'disclosed maintenance';
  const amount=(adjustment.after/1e9).toLocaleString('en-US',{maximumFractionDigits:1});
  return `Spending builds ${capacity}; upkeep ≈ ${basis} (${currency} ${amount}bn, ${adjustment.fy}).`;
 }
 const result=test.judgement?.result??test.result;
 return `Judgement: ${result==='pass'?'passes':result==='fail'?'fails':'still open'}`;
}
