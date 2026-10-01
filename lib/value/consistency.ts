import {ruleReading} from './rule-reading';
import {ownerReturn,buyReturnInputs} from './owner-return';
import {valuationReturnModel,modelValue,cashCoversPrice} from './return-model';
import type {Dossier,PriceMap} from './types';
import type { IndexRow, StoreMeta } from './types';
/** Runs while rendering/building the index. A published contradiction must not ship. */
export function assertIndexConsistency({meta,rows}:{meta:StoreMeta|null;rows:IndexRow[]}) {
  if (meta?.western) {
    const {story,funnel}=meta.western;
    if (story.analysed!==funnel.analysed || story.qualityPasses!==funnel.gates.find(g=>g.key==='accounting')?.passing || story.atBuy!==funnel.gates.find(g=>g.key==='price')?.passing) throw new Error('Value consistency: Western story and funnel disagree');
    assertIndexConsistency({meta:{...meta,western:undefined,funnel,story,counts:{...meta.counts,analysed:funnel.analysed}},rows:rows.filter(row=>row.w!=null)});
  }
  if (!meta?.funnel) return;
  const f=meta.funnel, counts=[f.analysed,...f.gates.map(g=>g.passing)];
  if (counts.some((n,i)=>!Number.isInteger(n)||n<0||(i>0&&n>counts[i-1]))) throw new Error('Value consistency: cumulative funnel is invalid');
  if (f.analysed!==(meta.counts.analysed??meta.counts.scored+meta.counts.insufficient)) throw new Error('Value consistency: analysis counts disagree');
  if (f.gates.every(g=>g.fail !== undefined)) {
    f.gates.forEach((gate,i)=>{if (gate.pass !== undefined && gate.pass !== gate.passing) throw new Error('Value consistency: pass counts disagree');if (gate.passing + gate.fail! + (gate.checking??0) + (gate.unclear??0) !== counts[i]) throw new Error('Value consistency: gate partition disagrees');});
    if (rows.filter(r=>/^P*FP*$/.test(r.t)&&r.st==='s').length !== f.gates.filter(g=>g.key!=='price').reduce((n,g)=>n+g.failsOnlyThis,0)) throw new Error('Value consistency: near-miss list and funnel disagree');
  }
  if (rows.some(r=>r.b !== undefined) && f.gates.find(g=>g.key==='price')?.passing !== rows.filter(r=>r.b === true).length) throw new Error('Value consistency: price gate and published buy flags disagree');
  if (rows.some(r=>r.b === true && (r.t !== 'PPPPP' || r.st !== 's' || r.dataQualityFlags?.length))) throw new Error('Value consistency: invalid published buy flag');
  if (f.gates.find(g=>g.key==='accounting')?.passing!==rows.filter(r=>r.t==='PPPPP').length) throw new Error('Value consistency: headline, Accounting gate and default rows disagree');
}

/** Independently derive verdicts and reprice each model at its solved IRR. */
export function assertDossierConsistency(d:Dossier,quote:PriceMap[string]|undefined){
 let rules=0;
 for(const t of Object.values(d.tests))if(t.key!=='price'&&['pass','fail'].includes(t.result)){
  const r=ruleReading(t,d.company.kind);
  if(r.derived!==t.result)throw Error(`${d.id} ${t.key}: ${r.sentence} implies ${r.derived}, published ${t.result}`);
  rules++;
 }
 const v=d.valuation,model=v&&valuationReturnModel(v);
 if(!v||!model||!quote)return {rules,returnChecked:false};
 const close=(a:number,b:number)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
 if(!close(modelValue(model,v.discountRate),v.perShare.mid))throw Error(`${d.id}: value differs from return cash flows at the required rate`);
 const owner=ownerReturn(v,d.company.currency,d.company.marketCapUsd,quote[0]);
 if(!owner){
  const listing=buyReturnInputs(v,d.company.currency)?.model;
  const covered=!!listing&&cashCoversPrice(listing,quote[0]);
  if(covered&&quote[0]>modelValue(listing!,v.discountRate))throw Error(`${d.id}: cash-covered price exceeds value`);
  return {rules,returnChecked:false,cashCovered:covered};
 }
 const price=owner.capital/v.shares;
 if(!close(modelValue(model,owner.expected),price))throw Error(`${d.id}: IRR does not reproduce today's price`);
 if(!close(price,v.perShare.mid)&&(owner.expected>=v.discountRate)!==(price<=v.perShare.mid))throw Error(`${d.id}: return hurdle contradicts price/value`);
 return {rules,returnChecked:true};
}
