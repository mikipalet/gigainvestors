import { describe, expect, it } from 'vitest';
import { annualPrefix, quarterPrice, holdingEvents, proposeValuation, scorePurchase } from '../../../lib/value/buffett-calibration';
import type { Year, Valuation } from '../../../lib/value/types';

const year = (fy: number): Year => ({ fy, end:`${fy}-12-31`, revenue:100*1.1**(fy-2000), netIncome:20*1.1**(fy-2000), da:2, capex:2, sbc:0, dilutedShares:10, ppe:10, cash:5, totalDebt:0, equity:40, goodwill:0, operatingIncome:25, preTaxIncome:25, taxExpense:5, minorityInterest:0 } as Year);
const valuation = { method:'owner_earnings', currency:'USD', normalized:40, growth:.04, discountRate:.1, terminalGrowth:.03, shares:10, netCash:5, perShare:{low:40,mid:50,high:60}, assumptions:[], bridge:[], bondYield:.03,equityBondYield:null } satisfies Valuation;
describe('Buffett calibration evidence boundaries', () => {
 it('excludes reports published during the purchase quarter and missing filing dates', () => {
  const rows=[year(2013),year(2014),year(2015)];
  expect(annualPrefix(rows, {'2013-12-31':'2014-02-10','2014-12-31':'2015-02-10','2015-12-31':'2016-02-10'}, '2016-03-31').map(y=>y.fy)).toEqual([2013,2014]);
  expect(annualPrefix(rows, {},'2016-03-31')).toEqual([]);
 });
 it('requires three positive monthly closes and calls the estimate a proxy', () => {
  expect(quarterPrice([['2016-01',10],['2016-02',20],['2016-03',30],['2016-04',900]],'2016-03-31')).toEqual({price:20,low:10,high:30,method:'mean-monthly-close (not VWAP)'});
  expect(quarterPrice([['2016-01',10],['2016-03',30]],'2016-03-31')).toBeNull();
 });
 it('never calls the baseline a new purchase and does not infer through quarter gaps', () => {
  expect(holdingEvents([{date:'2004-12-31',holdings:{A:10}},{date:'2005-03-31',holdings:{A:12,B:5}},{date:'2005-09-30',holdings:{C:5}}])).toEqual([
   {date:'2005-03-31',cusip:'A',type:'add',shares:2,held:12}, {date:'2005-03-31',cusip:'B',type:'first-observed',shares:5,held:5}]);
 });
 it('keeps missing prices and financial expected returns out of purchase success', () => {
  expect(scorePurchase(valuation,.25,null,'PPPPP').buy).toBe(false);
  expect(scorePurchase({...valuation,method:'book_value'},.25,10,'PPPPP').buy).toBe(false);
  expect(scorePurchase(valuation,.25,40,'PPPPP').within20).toBe(true);
  expect(scorePurchase(valuation,.25,20,'PPFPP').buy).toBe(false);
 });
 it('uses decade and five-year per-share growth with a haircut, preserving the hurdle', () => {
  const years=Array.from({length:11},(_,i)=>year(2000+i));
  const result=proposeValuation({valuation,years,t5:'PPPPP',cv:.1,mos:.25});
  expect(result.eligible).toBe(true);expect(result.valuation.growth).toBeCloseTo(.075);
  expect(result.valuation.discountRate).toBe(.1);expect(result.mos).toBe(.15);
  expect(valuation.growth).toBe(.04);expect(valuation.perShare.mid).toBe(50);
 });
 it('does not upgrade junk, volatile firms, banks or incomplete decades', () => {
  const years=Array.from({length:11},(_,i)=>year(2000+i));
  for(const input of [{t5:'PPFPP',cv:.1,years},{t5:'PPPPP',cv:.4,years},{t5:'PPPPP',cv:.1,years:years.slice(1)}]) {
   expect(proposeValuation({valuation,mos:.25,...input}).eligible).toBe(false);
  }
  expect(proposeValuation({valuation:{...valuation,method:'book_value'},years,t5:'PPPPP',cv:.1,mos:.25}).eligible).toBe(false);
 });
 it('is invariant when price and all per-share values use the same split basis', () => {
  const before=scorePurchase(valuation,.25,30,'PPPPP');
  const after=scorePurchase({...valuation,shares:40,perShare:{low:10,mid:12.5,high:15}},.25,7.5,'PPPPP');
  expect(after.ratio).toBe(before.ratio);expect(after.expectedReturn).toBe(before.expectedReturn);expect(after.buy).toBe(before.buy);
 });
});

describe('recalibration guardrails', () => {
 it('does not grant moderate-margin firms a stable-business safety margin', () => {
  const years=Array.from({length:11},(_,i)=>({...year(2000+i),operatingIncome:year(2000+i).revenue!*(.15+i*.01)}));
  const p=proposeValuation({valuation,years,t5:'PPPPP',cv:.25,mos:.35});
  expect(p.eligible).toBe(true);expect(p.mos).toBe(.25);
  const falling=years.map((y,i)=>({...y,operatingIncome:y.revenue!*(.3-i*.01)}));
  expect(proposeValuation({valuation,years:falling,t5:'PPPPP',cv:.25,mos:.35}).eligible).toBe(false);
 });
 it('preserves a binding complete TTM deterioration', () => {
  const years=Array.from({length:11},(_,i)=>year(2000+i));
  const v={...valuation,normalized:1,assumptions:['bridge components use TTM owner earnings; full TTM capex deducted; latest annual lease liabilities used']};
  expect(proposeValuation({valuation:v,years,t5:'PPPPP',cv:.1,mos:.25}).valuation.normalized).toBe(1);
 });
 it('does not fabricate a CAGR through a missing year', () => {
  const years=Array.from({length:12},(_,i)=>year(2000+i)).filter(y=>y.fy!==2006);
  expect(proposeValuation({valuation,years,t5:'PPPPP',cv:.1,mos:.25}).eligible).toBe(false);
 });
});
