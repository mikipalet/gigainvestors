import {describe,expect,it} from 'vitest';
import {publishedBuyPrice} from '@/lib/value/buy-price';
import {REVIEWED_INPUT_ERROR_IDS,reviewedInputError,reviewedInputFlags} from '@/lib/value/reviewed-input-errors';

const row={st:'s' as const,t:'PPPPP',pr:'P' as const,v:[400,428,460] as [number,number,number],dataQualityFlags:[]};
describe('reviewed input errors',()=>{
 it('every entry names a review date, a reason and a primary-filing source',()=>{
  expect(REVIEWED_INPUT_ERROR_IDS.length).toBeGreaterThan(0);
  for(const id of REVIEWED_INPUT_ERROR_IDS){
   const e=reviewedInputError(id)!;
   expect(e.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
   expect(e.reason.length).toBeGreaterThan(40);
   expect(e.source).toMatch(/^https:\/\//);
  }
 });
 it('withholds the Buy and flags the row, even over a frozen price result',()=>{
  const free=publishedBuyPrice({...row},[300,'2026-10-09']);
  expect(free.b).toBe(true);
  const flagged=publishedBuyPrice({...row,id:'PETR3.SA'},[300,'2026-10-09']);
  expect(flagged.b).toBe(false);
  expect(flagged.result).toBe('unclear');
  expect(flagged.dataQualityFlags).toEqual(reviewedInputFlags('PETR3.SA'));
  const frozen=publishedBuyPrice({...row,id:'PETR3.SA',priceTestFreeze:{asOf:'2026-10-01',test:{key:'price',result:'pass',numeric:'pass',reasons:[],metrics:{mos:.5},series:{},jev:[]}}} as any,[300,'2026-10-09']);
  expect(frozen.b).toBe(false);
 });
 it('leaves other companies untouched',()=>{
  expect(reviewedInputFlags('PRG.US')).toEqual([]);
  expect(reviewedInputFlags(undefined)).toEqual([]);
 });
});
