import {expect,it} from 'vitest';
import {applyShareCheck,reconcileShares,type ShareObservation} from '@/lib/value/share-check';
import type {Analysis} from '@/lib/value/types';
const observations:ShareObservation[]=[
 {source:'eodhd:current',shares:19221125,date:'2026-10-03'},
 {source:'eodhd:balance-annual',shares:22324000,date:'2025-12-31'},
 {source:'eodhd:balance-quarterly',shares:15602606,date:'2026-06-30'},
 {source:'yahoo',shares:22371876,date:'2026-10-05'},
];
it('does not verify a stale match contradicted by newer observations of the same provider',()=>{
 expect(reconcileShares(observations)).toMatchObject({status:'pending',shares:null});
});
it('still accepts a newer independent agreeing pair after a buyback',()=>{
 expect(reconcileShares([...observations,{source:'sec',shares:19300000,date:'2026-10-02'}])).toMatchObject({status:'verified',shares:19221125});
});
it('ignores cap-implied observations when deciding whether a provider superseded itself',()=>{
 expect(reconcileShares([{source:'sec',shares:100,date:'2026-06-30'},{source:'yahoo:old',shares:101,date:'2026-07-01'},{source:'yahoo:cap',shares:150,date:'2026-10-01',corroborationOnly:true}]).status).toBe('verified');
});
it('does not suppress observations on explicitly different listing bases',()=>{
 expect(reconcileShares([{source:'sec',shares:100,date:'2026-06-30',basis:'ordinary'},{source:'yahoo:old',shares:101,date:'2026-07-01',basis:'ordinary'},{source:'yahoo:adr',shares:50,date:'2026-10-01',basis:'ADR'}]).status).toBe('verified');
});
it('revalidates a cached verified check before exposing valuation',()=>{
 const a={valuation:{method:'book_value',shares:19221125,normalized:100,perShare:{low:100,mid:120,high:140},bridge:[],assumptions:[]}} as unknown as Analysis;
 const v=applyShareCheck(a,{status:'verified',shares:22371876,observations,reason:'old cache'}).valuation!;
 expect(v.shares).toBe(19221125);expect(v.assumptions.join(' ')).toMatch(/Unverified share count/);expect(v.shareSources).not.toBe(2);
});
