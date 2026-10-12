import {describe,expect,it} from 'vitest';
import {historyBasisConflict,retainReviewedPriceHistory,splitAdjustedRefresh} from '@/lib/value/price-history-basis';
import type {PriceHistory} from '@/lib/value/types';

// Copart (CPRT.US): 2:1 splits in April 2017, November 2022 and August 2023. The vendor lists
// only its last split, so the released history applied that one; Yahoo applies all three.
const months=(from:string,n:number)=>Array.from({length:n},(_,i)=>{const d=new Date(Date.UTC(Number(from.slice(0,4)),Number(from.slice(5,7))-1+i,1));return d.toISOString().slice(0,7);});
const all=months('2016-11',118);
const adjusted:PriceHistory=all.map((m,i)=>[m,Number((6.5*1.02**i).toFixed(4))]);
const missed=(m:string)=>(m<'2017-04'?4:m<'2022-11'?2:1);
const released:PriceHistory=adjusted.map(([m,p])=>[m,p*missed(m)]);
const shares=(restated:boolean)=>[2016,2017,2018,2019,2020,2021,2022,2023,2024,2025].map(fy=>({end:`${fy}-07-31`,dilutedShares:(restated?951e6:fy<2017?237.75e6:fy<2023?475.5e6:951e6)+fy*1e5}));

describe('a refresh that applies splits the released history missed (3.8.3)',()=>{
 it('is the same share basis when the annual share counts are already restated (CPRT)',()=>{
  expect(historyBasisConflict(adjusted,released)).toBe(true);
  expect(splitAdjustedRefresh(adjusted,released,shares(true))).toBe(true);
  expect(historyBasisConflict(adjusted,released,shares(true))).toBe(false);
  expect(retainReviewedPriceHistory(adjusted,released,shares(true))).toEqual(adjusted);
 });
 it('stays a conflict when the annual share counts are not restated (the released prices match them)',()=>{
  expect(historyBasisConflict(adjusted,released,shares(false))).toBe(true);
  expect(retainReviewedPriceHistory(adjusted,released,shares(false)).slice(0,3)).toEqual(released.slice(0,3));
 });
 it('never accepts the unadjusted side: raw closes that jump at the split are not a refresh',()=>{
  const raw:PriceHistory=adjusted.map(([m,p])=>[m,p*(m<'2017-04'?8:m<'2022-11'?4:m<'2023-08'?2:1)]);
  expect(splitAdjustedRefresh(raw,adjusted,shares(true))).toBe(false);
 });
 it('stays a conflict for a ratio that drifts or a distribution adjustment that is not a share split (BIP 2020)',()=>{
  const drift:PriceHistory=adjusted.map(([m,p],i)=>[m,p*(m<'2020-04'?1/(0.83+i*.002):1)]);
  expect(historyBasisConflict(drift.map(([m,p])=>[m,p]) as PriceHistory,adjusted,shares(true))).toBe(true);
 });
});
