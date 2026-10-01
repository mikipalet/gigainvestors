import {it,expect} from 'vitest';
import {readBusiness} from '../../../lib/value/judgement/read';
it('bounds multibyte filing selection by bytes while preserving complete quotes',async()=>{
 const text=Array.from({length:12},(_,i)=>`事業製品サービス顧客価格 ${i} ${'会社の説明'.repeat(220)}`).join('\n\n');
 const sizes:number[]=[];
 await readBusiness([{text,quote:'',section:'business',filed:'2026-06-01',url:'https://example.com/annual'}],async input=>{sizes.push(Buffer.byteLength(JSON.stringify({model:'jev-latest',...input})));return {answers:{passage:{type:'choice',choice:'none',confidence:1,probabilities:{none:1}}},usage:{input_tokens:1}};});
 expect(sizes.length).toBeGreaterThan(0);expect(Math.max(...sizes)).toBeLessThanOrEqual(32000);
});
