import { distancePosition,dropToBuy,mainCompanies,mainZones } from '@/lib/value/main-layout';
import type { ResultEntry } from '@/lib/value/result-entry';
import { describe,expect,it } from 'vitest';
const entry=(id:string,ratio:number|null,b=false,expected?:number):ResultEntry=>({expected,row:{id,n:id,c:'US',cur:'USD',t:'PPPPP',st:'s',k:'operating',v:[50,100,150],m:.25,mc:100,h:0,g:[],s:null,b,w:null},quote:ratio===null?null:75*ratio,mos:ratio===null?null:1-ratio*.75});
describe('Shelf+ companies',()=>{
 it('ranks buys by their displayed return and waiting cards by price distance',()=>{
  const zones=mainZones(mainCompanies([entry('buy',.8,true,.13),entry('best',.9,true,.16),entry('far',3,false,.04),entry('near',1.1,false,.08),entry('unknown',1.01),entry('unpriced',null,false,.1)]));
  expect(zones.buy.map(c=>c.id)).toEqual(['best','buy']);
  expect(zones.next.map(c=>c.id)).toEqual(['near','far']);
  expect(zones.rest.map(c=>c.id).sort()).toEqual(['unknown','unpriced']);
  expect(Object.values(zones).flat()).toHaveLength(6);
 });
 it('never borrows today’s price or expected return for history',()=>{
  const old={...entry('old',1.2,true,.5),historical:true,historicalReturn:-.2,historicalPrice:{discount:.5,price:90,buyPrice:50}};
  const c=mainCompanies([old])[0];expect(c.ratio).toBe(1.8);expect(c.returnValue).toBe(-.2);
  expect(mainCompanies([{...old,historicalPrice:undefined}])[0].ratio).toBeNull();
 });
 it('keeps absent and nonfinite returns out of Next closest',()=>{
  const zones=mainZones(mainCompanies([entry('missing',1.1),entry('nan',1.2,false,NaN),entry('zero',1.3,false,0)]));
  expect(zones.next.map(c=>c.id)).toEqual(['zero']);
 });
 it('uses one 0..60% premium scale and a true price-drop chip',()=>{
  expect(distancePosition(1)).toBe(0);expect(distancePosition(1.3)).toBeCloseTo(.5);expect(distancePosition(1.6)).toBe(1);expect(distancePosition(3)).toBe(1);
  expect(dropToBuy(1.1)).toBe('needs −9%');expect(dropToBuy(2)).toBe('needs −50%');expect(dropToBuy(.9)).toBe('At buy price');
 });
});
