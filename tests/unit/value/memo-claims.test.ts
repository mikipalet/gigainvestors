import {expect,it} from 'vitest';
import {validMemoClaim,readMemoClaims} from '../../../lib/value/business/memo-claims';
const claim={question:3 as const,answer:'Price/mix rose 4%; unit volume was flat.',spans:['Price/Mix','4 %','unit case volume was even'],source:{url:'https://issuer.test/annual',filed:'2026-02-01',section:'MD&A',quote:'2025 Price/Mix 4 %. In 2025 unit case volume was even.'}};
it('requires short verbatim spans, a numerical answer and a filing source',()=>{
 expect(validMemoClaim(claim)).toBe(true);
 expect(validMemoClaim({...claim,spans:['price increased 10%']})).toBe(false);
 expect(validMemoClaim({...claim,source:{...claim.source,url:'http://issuer.test'}})).toBe(false);
 expect(validMemoClaim({...claim,answer:'Customers accept price increases.'})).toBe(false);
});
it('requires a typed support judgement and preserves provenance',async()=>{
 const ask=async()=>({answers:{c0:{type:'noul' as const,noul:.99},g0:{type:'noul' as const,noul:.99}},usage:{input_tokens:1}});
 const lines=await readMemoClaims([claim],ask);
 expect(lines[0].answer).toBe(claim.answer);
 expect(lines[0].evidence[0]).toEqual(claim.source);
 expect(await readMemoClaims([claim],async()=>({answers:{c0:{type:'noul',noul:.5}},usage:{input_tokens:1}}))).toEqual([]);
});
