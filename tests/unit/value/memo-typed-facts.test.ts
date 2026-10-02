import {it,expect} from 'vitest';
import {readPricingFacts} from '../../../lib/value/business/pricing-facts';
const source={url:'https://issuer.test/annual',filed:'2026-01-01',section:'MD&A',quote:'',text:'2025年度、販売価格は4%上昇し、販売数量は横ばいでした。'};
it('reads native-language evidence with typed choices and verifies the rendered English statement',async()=>{
 const calls:any[]=[];
 const ask=async(input:any)=>{calls.push(input);return {answers:Object.fromEntries(Object.entries(input.questions).map(([key,q]:any)=>[key,q.type==='noul'?{type:'noul',noul:.99}:{type:'choice',choice:key==='metric'?'price':key==='direction'?'up':key==='volume'?'flat':Object.keys(q.criteria).find(k=>q.criteria[k]==='4%')??'none',probabilities:Object.fromEntries(Object.keys(q.criteria).map(k=>[k,1])),confidence:1}]))};};
 const result=await readPricingFacts([source],ask);
 expect(result[0]?.answer).toBe('Prices rose 4%; sales volumes were flat.');
 expect(calls.length).toBe(2);expect(calls[1].state).toContain(source.text);
});
it('cannot publish a selected number without independent support for the whole statement',async()=>{
 const ask=async(input:any)=>({answers:Object.fromEntries(Object.entries(input.questions).map(([key,q]:any)=>[key,q.type==='noul'?{type:'noul',noul:0}:{type:'choice',choice:key==='metric'?'price':key==='direction'?'up':key==='volume'?'flat':Object.keys(q.criteria).find(k=>q.criteria[k]==='4%')??'none',probabilities:Object.fromEntries(Object.keys(q.criteria).map(k=>[k,1])),confidence:1}]))});
 expect(await readPricingFacts([source],ask)).toEqual([]);
});
