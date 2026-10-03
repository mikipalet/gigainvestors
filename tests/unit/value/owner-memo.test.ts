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
  expect(numericMemo(a,[],100).find(l=>l.question===7)?.answer??'').not.toMatch(/ten-year earnings\/share growth/);
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

describe('computed memo coverage',()=>{
 const years=[2021,2022,2023,2024,2025].map((fy,i)=>({fy,end:`${fy}-12-31`,revenue:100,grossProfit:30-i,operatingIncome:15,netIncome:12,da:3,sbc:0,capex:5,acquisitions:0,ppe:30,dividendsPaid:2,dilutedShares:10} as Year));
 const analysis={id:'TEST.US',asOf:'2026-10-01',company:{id:'TEST.US',kind:'operating',currency:'USD',industry:'Apparel Retail'},tests:{moat:{metrics:{roicMedian:.17},series:{roic:[[2021,.17],[2022,.2]]}},economics:{metrics:{roiic:.12}}},series:{},valuation:{...valuation,currency:'USD'}} as unknown as Analysis;
 it('computes five numeric answers without any filing reader or earnings growth history',()=>{
  const lines=numericMemo(analysis,years,100,{insiderPercent:4.5,product:'Athletic apparel'});
  expect(lines.map(l=>l.question)).toEqual([1,2,4,5,7]);
  expect(lines.find(l=>l.question===1)?.answer).toMatch(/apparel retail.*100/);
  expect(lines.find(l=>l.question===2)?.answer).toMatch(/26.*28.*2023–25/);
  expect(lines.find(l=>l.question===5)?.answer).toContain('4.5%');
  for(const l of lines){expect(l.answer.split(/\s+/).length).toBeLessThanOrEqual(18);expect(l.answer).toMatch(/\d/);}
 });
 it('retains price-implied growth when an exact decade comparison cannot be computed',()=>{
  expect(numericMemo(analysis,years,100).find(l=>l.question===7)?.answer).toMatch(/The price assumes.*(?:grow|shrink)/);
 });
 it('does not fabricate a valuation or missing ownership',()=>{
  const lines=numericMemo({...analysis,valuation:null},years,100);
  expect(lines.some(l=>l.question===5||l.question===7)).toBe(false);
 });
 it('preserves a reported zero insider percentage',()=>{
  expect(numericMemo(analysis,years,100,{insiderPercent:0}).find(l=>l.question===5)?.answer).toContain('0%');
 });
 it('compares repurchase prices only with supplied per-share paid prices on the same currency basis',()=>{
  const lines=numericMemo({...analysis,valueHistory:[[2025,80,100,120]]},years,100,{repurchases:[{fy:2025,paidPerShare:120,currency:'USD',evidence:{quote:'Paid 120 per share',url:'https://issuer.test/report',filed:'2026',section:'Repurchases'}}]});
  expect(lines.find(l=>l.question===4)?.answer).toContain('20% above');
 });
});
it('uses the financial valuation model for banks without inventing a ten-year DCF',()=>{
 const v={...valuation,method:'book_value',currency:'USD',normalized:10,growth:.02,financialReturn:{cashPerShare:1,roe:.15,retention:.4,payout:.6}} as Valuation;
 const price=modelValue(valuationReturnModel(v)!,v.discountRate);
 const a={company:{kind:'bank',currency:'USD'},valuation:v,series:{},tests:{}} as unknown as Analysis;
 expect(numericMemo(a,[],price).find(l=>l.question===7)?.answer).toBe('The price assumes profits grow 2% a year forever.');
});
it('never presents a bank book-cap price as a unique implied growth rate',()=>{
 const v={...valuation,method:'book_value',currency:'USD',normalized:10,growth:.02,financialReturn:{cashPerShare:1,roe:.15,retention:.4,payout:.6}} as Valuation;
 const a={company:{kind:'bank',currency:'USD'},valuation:v,series:{},tests:{}} as unknown as Analysis;
 expect(numericMemo(a,[],40).find(l=>l.question===7)).toBeUndefined();
});

import {memoAtPrice} from '../../../lib/value/owner-memo';
it('recomputes the published memo price answer and drops it when the published valuation is withheld',()=>{
 const a={company:{kind:'operating',currency:'USD'},valuation:{...valuation,currency:'USD'},series:{},tests:{},ownerMemo:{version:1,asOf:'2026',inputHash:'x',lines:[{question:7,answer:'Stale price 99%.',evidence:[],basis:'computed'}]}} as unknown as Analysis;
 const price=modelValue(valuationReturnModel(a.valuation!)!,.1);
 expect(memoAtPrice(a,[price,'2026-10-02'])?.lines[0].answer).toContain('5.5%');
 expect(memoAtPrice({...a,valuation:null},[price,'2026-10-02'])?.lines).toEqual([]);
});
it('keeps segment and repurchase comparisons on the stated year and currency basis',()=>{
 const a={company:{kind:'operating',currency:'USD',industry:'Software'},tests:{},valuation:null,valueHistory:[[2025,80,100,120]]} as unknown as Analysis;
 const y={fy:2025,revenue:100,grossProfit:40,dividendsPaid:2,capex:0,da:0,netIncome:5,ppe:0} as Year;
 const evidence={url:'https://issuer.test/report',quote:'Segment revenue 70 of total 100.',filed:'2026',section:'Revenue'};
 const facts={segment:{name:'Cloud',fy:2025,share:.7,evidence},repurchases:[{fy:2025,paidPerShare:120,currency:'EUR',evidence}]};
 expect(numericMemo(a,[y],null,facts).find(l=>l.question===1)?.answer).toBe('Gets 70% of sales from Cloud; keeps 40 cents per sales dollar after product costs.');
 expect(numericMemo(a,[y],null,{...facts,segment:{...facts.segment,fy:2024}}).find(l=>l.question===1)?.answer).not.toContain('Cloud');
 expect(numericMemo(a,[y],null,facts).find(l=>l.question===4)?.answer??'').not.toMatch(/above|below/);
});
it('publishes annual capital-allocation observations without inventing repurchase prices',()=>{
 const a={company:{kind:'operating',currency:'USD'},tests:{},valuation:null} as unknown as Analysis;
 const years=[2024,2025].map(fy=>({fy,revenue:100,grossProfit:50,netIncome:10,da:2,capex:3,ppe:20,acquisitions:0,dividendsPaid:2,buybacks:5} as Year));
 const line=numericMemo(a,years,null).find(l=>l.question===4);
 expect(line?.capitalAllocation?.map(y=>[y.fy,y.buybacks,y.dividendsPaid])).toEqual([[2024,5,2],[2025,5,2]]);
 expect(line?.capitalAllocation?.every(y=>y.repurchase===undefined)).toBe(true);
});
it('folds an evidence-backed moat type into the numeric customer line',()=>{
 const a={company:{kind:'operating',currency:'USD'},tests:{moat:{series:{roic:[[2024,.2],[2025,.3]]}}},valuation:null} as unknown as Analysis;
 const evidence={url:'https://issuer.test/annual',quote:'Customers choose our distinctive brand.',filed:'2026',section:'Business'};
 const line=numericMemo(a,[],null,{moat:{type:'brand',evidence}}).find(l=>l.question===2);
 expect(line?.answer).toContain('customers trust its brand');expect(line?.evidence).toContainEqual(evidence);
});
it('labels the ROIC measurement window rather than mistaking a null observation for a shorter window',()=>{
 const roic=Array.from({length:10},(_,i)=>[2016+i,i===4?null:.2]);
 const a={company:{kind:'operating'},tests:{moat:{series:{roic}}},valuation:null} as unknown as Analysis;
 const line=numericMemo(a,[],null).find(l=>l.question===2);expect(line?.answer).toContain('It earns 20% on its capital');expect(line?.evidence[0].quote).toContain('10-year');
});
