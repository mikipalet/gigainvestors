import { describe, expect, it } from 'vitest';
import { impliedGrowth, validMemoSpan, numericMemo } from '../../../lib/value/owner-memo';
import { modelValue, valuationReturnModel } from '../../../lib/value/return-model';
import type { Analysis, Valuation, Year } from '../../../lib/value/types';

const valuation = { method:'owner_earnings', normalized:100, shares:10, netCash:20, growth:.08, terminalGrowth:.03, discountRate:.10, tier:'compounder' } as Valuation;
describe('owner memo evidence', () => {
 it('solves growth using exactly the valuation cash flows, including the fade', () => {
  const price=modelValue(valuationReturnModel(valuation)!,valuation.discountRate);
  expect(impliedGrowth(valuation,price)).toBeCloseTo(.08,8);
 });
 it('does not extrapolate the operating model to a bank or impossible price', () => {
  expect(impliedGrowth({...valuation,method:'book_value'},100)).toBeNull();
  expect(impliedGrowth(valuation,1)).toBeNull();
 });
 it('requires a verbatim span of at most twelve words and a specific fact', () => {
  expect(validMemoSpan('Nike and adidas are competitors','Our competitors include Nike and adidas are competitors.', ['Nike','adidas'])).toBe(true);
  expect(validMemoSpan('Customers love our brand','Customers love our brand', [])).toBe(false);
  expect(validMemoSpan('Retention is 98%','Retention is 90%', [])).toBe(false);
  expect(validMemoSpan('1 2 3 4 5 6 7 8 9 10 11 12 13','1 2 3 4 5 6 7 8 9 10 11 12 13', [])).toBe(false);
 });
 it('never calls a goodwill movement cash spent on acquisitions', () => {
  const year={fy:2025,revenue:100,grossProfit:50,netIncome:20,da:5,sbc:0,capex:8,acquisitions:100,acquisitionsProxy:true,dividendsPaid:2,ppe:40} as Year;
  const a={company:{id:'TEST.US',kind:'operating'},report:{url:'https://issuer.test/annual',filed:'2026-01-01'},series:{},valuation} as unknown as Analysis;
  const memo=numericMemo(a,[year],100);
  expect(memo.find(l=>l.question===4)?.answer).not.toMatch(/reinvest|acquisition/i);
 });
 it('does not label a shorter earnings history ten-year growth', () => {
  const a={company:{id:'TEST.US',kind:'operating'},report:{url:'https://issuer.test/annual',filed:'2026-01-01'},series:{ownerEarningsPerShare:[[2020,1],[2025,2]]},valuation} as unknown as Analysis;
  expect(numericMemo(a,[],100).find(l=>l.question===7)).toBeUndefined();
 });
});

import {memoCandidates,validCandidate} from '../../../lib/value/business/read';
it.each([
 [6,'Form 10-K | 7 B cant competition as competitors imitate the Company’s'],
 [6,'Security offerings compete with products from a range of competitors including identity'],
 [6,'(3) Operational Risks'],
 [1,'(in millions) 2023 Noninterest revenue $ 65,816 Net interest income 90,856 Net'],
 [6,'Nuclear Regulatory Commission pursuant to the Atomic Energy Act of 1954, as'],
 [4,'pay a final dividend on its ordinary shares for the 2025 financial'],
 [6,'to Marex is expected to complete in early 2026, subject to regulatory'],
] as Array<[number,string]>)('rejects a selected but incomplete filing fragment (%s)',(question,span)=>{
 expect(validCandidate({question,span,names:['Security','Marex','Operational Risks','Nuclear Regulatory Commission'],source:{text:span,quote:span,url:'https://issuer.test/annual',filed:'2026-01-01',section:'Annual filing'}})).toBe(false);
});
it('keeps decimals intact and never offers a truncated ownership claim',()=>{
 const source={text:'We repurchased 5.0 million shares for $1.2 billion. Larry Page and Sergey Brin beneficially owned',quote:'',url:'https://issuer.test/annual',filed:'2026-01-01',section:'business'};
 const rows=memoCandidates([source]);
 expect(rows.some(r=>r.span.includes('5.0 million shares for $1.2 billion'))).toBe(true);
 expect(rows.some(r=>r.question===5)).toBe(false);
});
