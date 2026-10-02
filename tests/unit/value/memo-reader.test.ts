import {it,expect} from 'vitest';
import {pricingRiskCandidates,readPricingRisk} from '../../../lib/value/business/pricing-risk';
const source={url:'https://issuer.test/annual',filed:'2026-01-01',section:'MD&A',quote:'',text:'We raised prices by 4% while unit volume remained flat. We depend on Microsoft for cloud infrastructure. 0.8% despite price by 60%, and the volume gap is now flat.'};
it('offers complete pricing and named-risk statements, never the broken window',()=>{
 const rows=pricingRiskCandidates([source]);
 expect(rows.some(r=>r.question===3&&r.answer==='We raised prices by 4% while unit volume remained flat.')).toBe(true);
 expect(rows.some(r=>r.question===6&&r.answer==='We depend on Microsoft for cloud infrastructure.')).toBe(true);
 expect(rows.some(r=>r.answer.includes('despite price by'))).toBe(false);
});
it('requires a semantic check after typed selection',async()=>{
 const ask=async({questions}:any)=>({answers:Object.fromEntries(Object.entries(questions).map(([id,q]:any)=>[id,q.type==='choice'?{type:'choice',choice:Object.keys(q.criteria)[1],probabilities:Object.fromEntries(Object.keys(q.criteria).map(k=>[k,k==='none'?0:1])),confidence:1}:{type:'noul',noul:0}]))});
 expect(await readPricingRisk([source],ask)).toEqual([]);
});

it('does not sever a sentence at a comma and coordinating conjunction',()=>{
 const text='Certain cloud services, primarily Office 365, depend on a significant level of integration, interdependency, and support that customers may withdraw.';
 expect(pricingRiskCandidates([{...source,text}])).toEqual([]);
});
it('runs a typed check even when no short English template matches a filing',async()=>{
 let called=false;
 const result=await readPricingRisk([{...source,text:'売上高は100億円でした。'}],async input=>{called=true;expect(input.state).toContain('売上高');return {answers:{pricing_evidence:{type:'noul',noul:.1},risk_evidence:{type:'noul',noul:.1}}};});
 expect(called).toBe(true);expect(result).toEqual([]);
});
