import {describe,it,expect} from 'vitest';
import {holderRecord} from '@/components/value/holder-record';
import type {InvestorData,Position} from '@/lib/types';
const position=(activity:Position['activity']='hold'):Position=>({ticker:'ADBE',name:'Adobe',shares:100,pct:5,value:23000,activity,change:activity==='add'?20:null});
describe('drawer holding observations',()=>{
 it('finds the first observation and last actual change in unsorted quarters',()=>{
  const data:InvestorData={code:'X',person:'Holder',firm:'Firm',quarters:[{q:'2026 Q2',total:1,positions:[position()]},{q:'2025 Q4',total:1,positions:[position('new')]},{q:'2026 Q1',total:1,positions:[position('add')]}]};
  expect(holderRecord(data,'adbe')).toMatchObject({first:'2025 Q4',q:'2026 Q2',lastChange:{q:'2026 Q1',activity:'add',change:20}});
  expect(data.quarters[0].q).toBe('2026 Q2');
 });
 it('does not present an exited holding as a current holding',()=>{
  expect(holderRecord({code:'X',person:'Holder',firm:'Firm',quarters:[{q:'2026 Q1',total:1,positions:[position()]},{q:'2026 Q2',total:1,positions:[]}]},'ADBE')).toBeUndefined();
 });
 it('keeps absent quarters at zero in the weight history',()=>{
  expect(holderRecord({code:'X',person:'Holder',firm:'Firm',quarters:[{q:'2026 Q1',total:1,positions:[]},{q:'2026 Q2',total:1,positions:[position('new')]}]},'ADBE')?.history[0]).toEqual({q:'2026 Q1',pct:0,shares:0});
 });
});
