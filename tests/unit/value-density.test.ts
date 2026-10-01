import {describe,it,expect} from 'vitest';
import {seriesSummary} from '@/lib/value/density';
describe('seriesSummary',()=>{
 it('uses the latest ten fiscal years, excludes missing numbers and keeps actual coverage',()=>{
  expect(seriesSummary([[2010,100],[2016,3],[2017,null],[2020,1],[2025,5]],'higher')).toEqual({first:2016,last:2025,years:3,median:3,worst:1,latest:5});
 });
 it('uses the highest observation as worst when lower is better',()=>{
  expect(seriesSummary([[2020,-2],[2022,4]],'lower')?.worst).toBe(4);
  expect(seriesSummary([[2020,null]],'higher')).toBeNull();
 });
});
