import { describe, expect, it } from 'vitest';
import { valueCompany, valuationMargin, compounderGrowth } from '@/lib/value/valuation';
import { ownerReturn, buyReturnInputs } from '@/lib/value/owner-return';
import { publishedBuyPrice } from '@/lib/value/buy-price';
import { makeYears } from './synthetic';
const value = (years = makeYears(), extra = {}) => valueCompany({years, kind:'operating', currency:'USD', bondYield:.04, cyclical:false, ...extra}).valuation!;
describe('coherent equity valuation', () => {
 it('does not deduct debt again from identical after-interest owner earnings', () => {
  const a=value(makeYears({overrides:{cash:100,totalDebt:0}}));
  const b=value(makeYears({overrides:{cash:100,totalDebt:500}}));
  // Hand-computed old fade PV(100)=1243.729; excess cash=100-2%*1000=80; 10 shares.
  expect(a.perShare.mid).toBeCloseTo(132.3729,4);
  expect(b.perShare.mid).toBeCloseTo(a.perShare.mid,10);
  expect(b.netDebt).toBe(400);
  expect(b.riskFlags).toContain('Elevated leverage: net debt exceeds 3 years of owner earnings');
  expect(valuationMargin(b,'stable')).toBe(.35);
 });
 it('reserves operating cash and never subtracts a cash deficit', () => {
  expect(value(makeYears({overrides:{cash:10}})).netCash).toBe(0);
  expect(value(makeYears({overrides:{cash:200}})).netCash).toBe(180);
 });
});
describe('financial owner return', () => {
 it.each(['bank','insurer'])('uses payout yield plus retention growth for %s', kind => {
  const v=value(makeYears({overrides:{netIncome:70,dividendsPaid:50}}),{kind});
  // TBV/share=50; ROE=14%; retention=2/7; g=4%; distributable/share=5.
  // Justified P/TBV=(.14-.04)/(.10-.04)=1.6666667.
  expect(v.growth).toBeCloseTo(.04);
  expect(v.perShare.mid).toBeCloseTo(83.33333333);
  const r=ownerReturn(v,'USD',null,50)!;
  expect(r.yield).toBeCloseTo(.10);
  expect(r.expected).toBeCloseTo(.14);
  const inputs=buyReturnInputs(v,'USD');
  expect(publishedBuyPrice({st:'s',t:'PPPPP',v:[v.perShare.low,v.perShare.mid,v.perShare.high],m:.25,buyReturnInputs:inputs},[50,'2026-09-30']).b).toBe(true);
  expect(ownerReturn(v,'USD',null,200)!.expected).toBeCloseTo(.065);
 });
 it('caps sustainable ROE and excludes nonpositive tangible capital', () => {
  expect(value(makeYears({overrides:{netIncome:500}}),{kind:'bank'}).financialReturn!.roe).toBe(.25);
  expect(valueCompany({years:makeYears({overrides:{goodwill:600}}),kind:'bank',bondYield:.04,cyclical:false}).valuation).toBeNull();
 });
 it('does not invent a payout from missing dividend history', () => {
  expect(valueCompany({years:makeYears({overrides:{dividendsPaid:null}}),kind:'bank',bondYield:.04,cyclical:false}).valuation).toBeNull();
 });
});
describe('durable compounders', () => {
 const growing=()=>makeYears({overrides:(_,i)=>({netIncome:100*1.1**i,operatingIncome:125*1.1**i,revenue:1000*1.1**i,da:0,capex:0,equity:200,totalDebt:0,cash:0})});
 it('uses its own ten-year per-share growth only after all five passes', () => {
  const v=value(growing(),{qualityPass:true});
  expect(v.tier).toBe('compounder');
  expect(v.growth).toBeCloseTo(.1);
  expect(valuationMargin(v,'moderate')).toBe(.15);
  expect(value(growing()).tier).toBe('standard');
 });
 it('winsorises annual log-growth outliers and caps growth at 12%', () => {
  const years=growing();
  expect(compounderGrowth(years)).toBeCloseTo(.1);
  years[5].netIncome! *= 100;
  expect(compounderGrowth(years)).toBeCloseTo(.1);
  expect(compounderGrowth(growing().slice(1))).toBeNull();
 });
 it('fades first-year growth linearly to 3% in year ten', () => {
  const v=value(growing(),{qualityPass:true});
  let earnings=v.normalized, pv=0;
  for(let t=1;t<=10;t++){earnings*=1+.1+(.03-.1)*(t-1)/9;pv+=earnings/1.1**t;}
  pv+=earnings*1.03/.07/1.1**10;
  expect(v.perShare.mid).toBeCloseTo(pv/10,8);
 });
});
