import { describe, expect, it } from 'vitest';
import { thesisDecision } from '@/lib/value/thesis/decision';
import { THESIS_VERSION } from '@/lib/value/thesis/questions';
import { marketContext } from '@/lib/value/thesis/market';

const trust:any={thesis_liability:{version:THESIS_VERSION,accuracy:1,n:10,positives:5,negatives:5}};
function answer(amount=1560000000,basis='claimed',currency='GBP'):any{return {
 id:'thesis_liability',version:THESIS_VERSION,value:'yes',
 evidence:{quote:'In November 2025 the Group received notice of a collective claim seeking damages of up to £1.56 billion.',url:'https://plc.rightmove.co.uk/report.pdf',filed:'2026-07-31',section:'notes'},
 liability:{amount,currency,basis,topic:'Collective proceedings claim'},
};}
const market={currency:'GBP',marketValue:3500000000,ownerEarnings:200000000,asOf:'2026-09-30',basis:'quote × shares'};
describe('specific liabilities sized against market value',()=>{
 it('keeps a quantified asserted claim distinct from a provision and sizes owner earnings',()=>{
  const result=thesisDecision([answer()],trust,market);
  expect(result.changed).toBe(true);expect(result.reason).toContain('£1.56bn');expect(result.reason).toContain('claimed');
  expect(result.liabilities?.[0]).toMatchObject({marketValueRatio:156/350,ownerEarningsRatio:7.8,basis:'claimed'});
 });
 it('uses a strict greater-than 10% threshold, with no equity or owner-earnings veto',()=>{
  expect(thesisDecision([answer(350000000)],trust,market).changed).toBe(false);
  expect(thesisDecision([answer(350000001)],trust,market).changed).toBe(true);
  expect(thesisDecision([answer(450000000)],trust,{...market,marketValue:60000000000,ownerEarnings:1000000}).changed).toBe(false);
 });
 it('never removes on an unsized, excluded, or currency-mismatched answer',()=>{
  const unsized=answer();delete unsized.liability;
  expect(thesisDecision([unsized],trust,market).changed).toBe(false);
  expect(thesisDecision([answer(1560000000,'excluded')],trust,market).changed).toBe(false);
  expect(thesisDecision([answer(1560000000,'claimed','USD')],trust,market).changed).toBe(false);
  expect(thesisDecision([answer()],trust,{...market,marketValue:null}).changed).toBe(false);
 });
 it('converts pence quotes to pounds and uses owner earnings, never book value',()=>{
  const a:any={company:{currency:'GBX',marketCapUsd:100},valuation:{currency:'GBP',shares:100,normalized:8,method:'book_value',financialReturn:{cashPerShare:2},perShareTrading:{currency:'GBX',fxRate:100}}};
  expect(marketContext(a,[400,'2026-09-30'],{},'GBP')).toMatchObject({marketValue:400,ownerEarnings:200,currency:'GBP'});
 });
 it('converts cached USD capitalization only with a known reporting currency rate',()=>{
  const a:any={company:{currency:'EUR',marketCapUsd:1200},valuation:null};
  expect(marketContext(a,null,{EUR:1.2},'EUR').marketValue).toBe(1000);
  expect(marketContext(a,null,{},'EUR').marketValue).toBeNull();
 });
 it('does not use an FX bridge for a different listing currency',()=>{
  const a:any={company:{currency:'CHF',marketCapUsd:1200},valuation:{currency:'EUR',shares:100,normalized:30,method:'owner_earnings',perShareTrading:{currency:'GBX',fxRate:100}}};
  expect(marketContext(a,[400,'2026-09-30'],{EUR:1.2},'EUR').marketValue).toBe(1000);
 });
 it('sizes the same verified share count used by publication',()=>{
  const a:any={company:{currency:'GBX',marketCapUsd:100},valuation:{currency:'GBP',shares:100,normalized:200,method:'owner_earnings',perShare:{low:1,mid:2,high:3},perShareTrading:{currency:'GBX',fxRate:100,low:100,mid:200,high:300},bridge:[],assumptions:[]}};
  const check:any={status:'verified',shares:90,observations:[{source:'issuer',shares:90},{source:'provider',shares:90}],reason:'Independent sources agree'};
  expect(marketContext(a,[400,'2026-09-30'],{},'GBP',check)).toMatchObject({marketValue:360,ownerEarnings:200});
 });
 it('uses the latest provision for a matter and preserves the separate dividend evidence',()=>{
  const older=answer(600000000,'provided');older.liability.topic='Motor-finance redress';older.evidence.filed='2025-07-31';
  const current=answer(320000000,'provided');current.liability.topic='Motor-finance redress';
  const dividend:any={...current,id:'thesis_distress',evidence:{...current.evidence,quote:'The group will not pay a final dividend on its ordinary shares for the 2026 financial year.'}};
  const result=thesisDecision([older,current,dividend],trust,{...market,marketValue:624000000});
  expect(result.liabilities).toHaveLength(1);expect(result.reason).toContain('£320m provided');expect(result.reason).toContain('final dividend withheld');expect(result.evidence).toHaveLength(2);
  expect(thesisDecision([dividend],trust,market).changed).toBe(false);
 });
 it('converts an explicitly foreign-currency exposure with known FX before comparing',()=>{
  const result=thesisDecision([answer(390000000,'claimed','USD')],trust,{...market,usdRates:{GBP:1.3}});
  expect(result.changed).toBe(false);
  expect(result.liabilities?.[0].marketValueRatio).toBeCloseTo(300000000/3500000000);
 });
});
