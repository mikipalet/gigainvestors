import type {TestOutcome} from '../types';
import type {Adjustment} from './types';
/** A single latest explanation; annual calculations remain in evidence. */
export function compactJudgement(test:TestOutcome,adjustments:Adjustment[]=[],currency='USD'):string {
 if(!test.judgement?.override)return '';
 const result=test.judgement.result;
 const prefix=`Judgement: ${result==='pass'?'passes':result==='fail'?'fails':'still open'} — `;
 const adjustment=adjustments.filter(a=>a.test===test.key).sort((a,b)=>b.fy-a.fy)[0];
 if(adjustment?.field==='maintenanceCapex'){
  const capacity=/\bAI\b|artificial intelligence/i.test(adjustment.evidence.quote)?'AI capacity':'new capacity';
  const basis=/upkeep ≈ depreciation/.test(adjustment.reason)?'depreciation':'disclosed maintenance';
  return `${prefix}spending builds ${capacity}, upkeep ≈ ${basis}.`;
 }
 const reason=test.judgement.reason.split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, '');
 return `${prefix}${reason}.`;
}
