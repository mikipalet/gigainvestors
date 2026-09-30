import { distanceLabel,distancePosition,mainCompanies,mainZones,nextLayout } from '@/lib/value/main-layout';
import { companyName } from '@/lib/value/presentation';
import type { ResultEntry } from '@/lib/value/result-entry';
import { describe,expect,it } from 'vitest';
const entry=(id:string,ratio:number|null,b=false,expected?:number):ResultEntry=>({expected,row:{id,n:id,c:'US',cur:'USD',t:'PPPPP',st:'s',k:'operating',v:[50,100,150],m:.25,mc:100,h:0,g:[],s:null,b,w:null},quote:ratio===null?null:75*ratio,mos:ratio===null?null:1-ratio*.75});
describe('main zones',()=>{
 it('sorts buy rows by the same expected return displayed, including Humedix',()=>{
  const companies=mainCompanies([entry('LOW',.9,true,.11),entry('Humedix',.8,true,.175),entry('MISSING',.7,true)]);
  expect(mainZones(companies).buy.map(c=>c.id)).toEqual(['Humedix','LOW','MISSING']);
 });
 it('partitions every company once, including below-price non-buys and missing prices',()=>{
  const entries=[entry('buy',.8,true),entry('under',.9,false,.09),entry('edge',1.5),entry('mid',3),entry('far',3.01),entry('missing',null)];
  const zones=mainZones(mainCompanies(entries));
  expect(zones.next.map(c=>c.id)).toEqual(['under','edge']);
  expect(zones.middle.map(c=>c.id)).toEqual(['mid']);expect(zones.far.map(c=>c.id)).toEqual(['far']);expect(zones.missing).toHaveLength(1);
  expect(Object.values(zones).flat()).toHaveLength(entries.length);
 });
 it('uses the historical discount and gains, never current expected returns or buy discounts',()=>{
  const old={...entry('old',1.2,true,.5),historical:true,historicalReturn:-.2,historicalPrice:{discount:.5,price:90,buyPrice:50}};
  const c=mainCompanies([old])[0];expect(c.ratio).toBe(1.8);expect(c.returnValue).toBe(-.2);expect(c.expected).toBeNull();
  expect(mainCompanies([{...old,historicalPrice:undefined}])[0].ratio).toBeCloseTo(.9);
  expect(mainCompanies([{...old,historicalPrice:undefined}])[0].basis).toBe('value');
 });
 it('keeps unresolved valuations out of priced zones while retaining hurdle-only waits',()=>{
  const held=entry('held',.8,false,.15);held.row.dataQualityFlags=['share count unresolved'];
  const zones=mainZones(mainCompanies([held,entry('hurdle',.9,false,.09)]));
  expect(zones.next.map(c=>c.id)).toEqual(['hurdle']);
  expect(zones.missing.map(c=>c.id)).toEqual(['held']);
  expect(zones.missing[0].buyPrice).toBeNull();
 });
 it('uses published browser returns for every priced company',()=>{
  const compact={...entry('compact',1.1),expected:.084};
  expect(mainCompanies([compact])[0].returnValue).toBe(.084);
 });
 it('uses three columns when a narrow buy column frees space',()=>{
  expect(nextLayout(1100,400,100,false,true).columns).toBe(3);
  expect(nextLayout(1100,800,21,false,true)).toEqual({columns:2,rows:10,capacity:20});
  expect(nextLayout(1100,800,4,false,true)).toEqual({columns:1,rows:4,capacity:4});
 });
 it('sorts logo bands by company size',()=>{
  const small=entry('small',2),big=entry('big',2);big.row.mc=1000;
  expect(mainZones(mainCompanies([small,big])).middle.map(c=>c.id)).toEqual(['big','small']);
 });
});
describe('layout and copy',()=>{
 it('shares one linear distance scale and handles below-price values honestly',()=>{
  expect(distancePosition(1)).toBe(0);expect(distancePosition(1.2)).toBeCloseTo(.4);expect(distancePosition(1.5)).toBe(1);expect(distancePosition(.9)).toBe(0);
  expect(distanceLabel(1.08)).toBe('8% above');expect(distanceLabel(.92)).toBe('8% below');expect(distanceLabel(1)).toBe('At buy price');
 });
 it('fits whole rows in desktop columns and shows exactly five on phone',()=>{
  expect(nextLayout(1000,600,100)).toEqual({columns:2,rows:10,capacity:20});
  expect(nextLayout(600,600,100)).toEqual({columns:1,rows:10,capacity:10});
  expect(nextLayout(366,200,100,true).capacity).toBe(5);
  expect(nextLayout(1000,600,0).capacity).toBe(0);
  for(const height of [300,550,646,672,882])expect(nextLayout(1000,height,100).rows*48+88).toBeLessThanOrEqual(height);
 });
 it('decodes company entities, including numeric and nested entities',()=>{
  expect(companyName({id:'x',n:'P&amp;G Inc.'})).toBe('P&G');
  expect(companyName({id:'x',n:'Marks &#38; Spencer'})).toBe('Marks & Spencer');
  expect(companyName({id:'x',n:'A&amp;amp;B'})).toBe('A&B');
 });
});
