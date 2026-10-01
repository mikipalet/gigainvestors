import {describe,it,expect} from 'vitest';
import {valueCompany,presentValue} from '@/lib/value/valuation';
import {ownerReturn,buyReturnInputs,cashCoveredReturnCopy} from '@/lib/value/owner-return';
import {publishedBuyPrice} from '@/lib/value/buy-price';
import {makeYears} from './synthetic';
import type {Valuation} from '@/lib/value/types';
const value=(extra={})=>valueCompany({years:makeYears(),kind:'operating',currency:'USD',bondYield:.04,cyclical:false,...extra}).valuation!;
describe('return is the inverse of valuation',()=>{
 it.each(['standard','compounder'] as const)('discounts the same %s cash flows including surplus cash',tier=>{
  const v={...value(),tier,growth:.12};
  v.perShare.mid=(presentValue({oe:v.normalized,g:v.growth,r:v.discountRate,terminal:v.terminalGrowth,decadeFade:tier==='compounder'})+v.netCash)/v.shares;
  for(const factor of [.5,1,3]){
   const price=v.perShare.mid*factor,r=ownerReturn(v,'USD',null,price)!.expected;
   expect((presentValue({oe:v.normalized,g:v.growth,r,terminal:v.terminalGrowth,decadeFade:tier==='compounder'})+v.netCash)/v.shares).toBeCloseTo(price,7);
   expect(r>=v.discountRate-1e-10).toBe(factor<=1);
  }
 });
 it('has the same hurdle for capped financial payouts',()=>{
  const v=value({kind:'bank',years:makeYears({overrides:{netIncome:500,dividendsPaid:0}})});
  expect(v.perShare.mid/v.normalized).toBe(4);
  expect(ownerReturn(v,'USD',null,v.perShare.mid)!.expected).toBeCloseTo(v.discountRate,12);
 });
 it('uses one NAV realization cash flow for value and return',()=>{
  const years=makeYears({overrides:(_,i)=>({navPerShare:100*1.05**i,dividendsPerShare:0})});
  const v=value({years,investmentHolding:true});
  const proceeds=v.normalized*(1+v.growth)**10;
  expect(v.perShare.mid).toBeCloseTo(proceeds/1.1**10,9);
  expect(ownerReturn(v,'USD',null,v.perShare.mid)!.expected).toBeCloseTo(.1,12);
 });
 it('preserves listing FX and share basis in the return and quote refresh',()=>{
  const v=value(),price=v.perShare.mid*.75;
  const fx={...v,perShareTrading:{currency:'EUR',fxRate:.9,low:v.perShare.low*.9,mid:v.perShare.mid*.9,high:v.perShare.high*.9}};
  expect(ownerReturn(fx,'EUR',null,price*.9)!.expected).toBeCloseTo(ownerReturn(v,'USD',null,price)!.expected,12);
  expect(publishedBuyPrice({st:'s',t:'PPPPP',v:[fx.perShareTrading.low,fx.perShareTrading.mid,fx.perShareTrading.high],m:.25,buyReturnInputs:buyReturnInputs(fx,'EUR')},[fx.perShareTrading.mid*.75,'2026-10-01']).b).toBe(true);
 });
 it('does not invent a finite IRR when immediate surplus cash covers the price',()=>{
  const v={...value(),netCash:1000} as Valuation;
  expect(ownerReturn(v,'USD',null,1)).toBeNull();
  expect(cashCoveredReturnCopy(v,'USD',1)).toContain('no finite annual IRR');
  expect(publishedBuyPrice({st:'s',t:'PPPPP',v:[100,100,100],m:.25,shareSources:2,buyReturnInputs:{...buyReturnInputs(v,'USD')!,requiredReturn:NaN}},[1,'2026-10-01']).b).toBe(false);
  expect(publishedBuyPrice({st:'s',t:'PPPPP',v:[100,100,100],m:.25,shareSources:2,buyReturnInputs:buyReturnInputs(v,'USD')},[1,'2026-10-01']).b).toBe(true);
 });
});
