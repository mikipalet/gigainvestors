import { describe, it, expect } from 'vitest';
import { companyName, priceFraming } from '../../../lib/value/presentation';
import { trackRecord } from '../../../lib/value/time-travel';
describe('round eight: plain price and identity',()=>{
 it('normalizes uppercase company words while preserving acronyms',()=>{
  expect(companyName({id:'6378.T',nameEn:'KIMURA CHEMICAL PLANTS CO.'})).toBe('Kimura Chemical Plants');
  expect(companyName({id:'6378.JP',nameEn:'KIMURA CHEMICAL PLANTS CO., LTD.'})).toBe('Kimura Chemical Plants');
  expect(companyName({id:'INFY.US',nameEn:'Infosys Ltd ADR'})).toBe('Infosys');
  expect(companyName({id:'IBM.US',nameEn:'IBM CORPORATION'})).toBe('IBM');
 });
 it('uses value as the common denominator, with fall measured from current price',()=>{
  expect(priceFraming(.73,.25)).toEqual({headline:'27% below its estimated value',fall:'At or below the buy price',drop:0});
  expect(priceFraming(4.24,.25)).toEqual({headline:'Costs 4.2× its estimated value',fall:'Price would need to drop 82% to reach the buy price',drop:82});
  expect(priceFraming(null,.25).headline).toBe('Estimated value unavailable');
 });
 it('uses oldest published cohort medians and counts only comparable years',()=>{
  expect(trackRecord({years:[2016,2017,2018],perYear:{2016:{medianReturnAtBuy:1.86,medianReturnAll:.73},2017:{medianReturnAtBuy:.2,medianReturnAll:.4},2018:{medianReturnAtBuy:null,medianReturnAll:.3}}} as never)).toEqual({since:2016,buy:1.86,all:.73,wins:1,years:2});
 });
});
