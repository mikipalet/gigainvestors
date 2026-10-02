import {describe,it,expect} from 'vitest';
import {numericMemo,memoAtPrice} from '../../../lib/value/owner-memo';
import {validMemoAnswer,validMemoLine} from '../../../lib/value/business/memo-validation';
import type {Analysis,Year} from '../../../lib/value/types';
const a={id:'TEST.US',company:{kind:'operating',currency:'USD',industry:'Software'},reportingCurrency:'USD',tests:{moat:{series:{roic:[[2025,5.6]]}},economics:{metrics:{roiic:1}}},series:{revenuePerShare:[[2025,10]],ownerEarningsPerShare:[[2025,-1]]},valuation:null} as unknown as Analysis;
describe('plain owner memo trust boundary',()=>{
 it.each(['0.8% despite price by 60%','0.8% despite price by 60%, and the volume gap is now flat.','Growth capex/earnings 0%; incremental return 100%.','growth capex/earnings 0%','incremental return 100%','Earns 563.9% on its capital.','Insiders own 104% of the company.','Margins held at 130% in 2023.','20 Litigation claims or legal proceedings could expose us to significant liabilities and damage our reputation.','In Latin America, OG was 6.7%, with – 1.4% RIG and 8.0% pricing.','There are legislative proposals and pending litigation in the US, EU.','Organic sales increased 1.7% driven by volume gains of 2.5%, partially offset by lower pricing.','Cost of risk increased to 1.5%, compared with 0.8% a year ago, mainly driven by Uzbekistan operations.'])('rejects junk: %s',s=>expect(validMemoAnswer(s)).toBe(false));
 it('accepts complete plain statements and named risks',()=>{
  expect(validMemoAnswer('Insiders own 4.5% of the company.')).toBe(true);
  expect(validMemoAnswer('Competes with Microsoft and Google for cloud customers.')).toBe(true);
  expect(validMemoAnswer('Earns over 100% on its capital.')).toBe(true);
 });
 it('omits zero growth investment and the capped incremental-return artefact',()=>{
  const y={fy:2025,revenue:100,grossProfit:50,netIncome:10,da:5,capex:0,ppe:50,dividendsPaid:2,buybacks:3} as Year;
  const lines=numericMemo(a,[y],20);
  expect(lines.find(l=>l.question===2)?.answer).toContain('over 100%');
  expect(lines.find(l=>l.question===4)?.answer).not.toMatch(/0%|100%|capex|incremental/i);
  for(const l of lines){expect(validMemoAnswer(l.answer)).toBe(true);expect(l.answer.split(';')).toHaveLength(l.answer.includes(';')?2:1);}
 });
 it('answers price without a valuation using actual sales and quote',()=>{
  expect(numericMemo(a,[],21).find(l=>l.question===7)?.answer).toBe('The price is 2.1 times annual sales; cash earnings are negative.');
 });
 it('does not mix reporting currency and trading currency',()=>{
  expect(numericMemo({...a,reportingCurrency:'EUR'},[],21).find(l=>l.question===7)).toBeUndefined();
 });
 it('recomputes fallback multiples at publication and rejects a stale malformed filing answer',()=>{
  const memo={version:1 as const,asOf:'2026',inputHash:'x',lines:[{question:3,answer:'0.8% despite price by 60%',evidence:[],basis:'filing' as const}]};
  expect(memoAtPrice({...a,ownerMemo:memo},[30,'2026-10-02'])?.lines.map(l=>l.answer)).toEqual(['The price is 3 times annual sales; cash earnings are negative.']);
 });
});
it('omits a margin when its filing check disagrees with the computed value',()=>{
 const y={fy:2025,revenue:100,grossProfit:60} as Year;
 const e={url:'https://issuer.test/annual',filed:'2026',section:'Results',quote:'Gross margin was 50%.'};
 const lines=numericMemo(a,[y],null,{segment:{name:'Cloud',share:.7,fy:2025,evidence:e},verifiedGrossMargin:{fy:2025,ratio:.5,evidence:e}});
 expect(lines.find(l=>l.question===1)?.answer).toBe('Gets 70% of sales from Cloud.');
});

it('keeps a sourced, concrete tax claim',()=>{expect(validMemoLine({question:6,answer:'It faces an IRS claim for $3.3 billion of 2007–09 taxes, plus interest.',basis:'filing',evidence:[{url:'https://issuer.test/annual',filed:'2026',section:'Tax',quote:'IRS claim: $3.3 billion plus interest.'}]})).toBe(true);});
