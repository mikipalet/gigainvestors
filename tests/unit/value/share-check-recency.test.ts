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
it('does not let an empty cached verification bypass reconciliation',()=>{
 const a={valuation:{method:'book_value',shares:100,normalized:100,perShare:{low:100,mid:120,high:140},bridge:[],assumptions:['Share count verified within 2%: obsolete'],shareSources:2}} as unknown as Analysis;
 const v=applyShareCheck(a,{status:'verified',shares:90,observations:[],reason:'old cache'}).valuation!;
 expect(v.shares).toBe(100);expect(v.shareSources).not.toBe(2);
 expect(v.assumptions.some(s=>s.startsWith('Share count verified'))).toBe(false);
});
it('removes inherited corroboration when cached observations fail revalidation',()=>{
 const a={valuation:{method:'book_value',shares:19221125,normalized:100,perShare:{low:100,mid:120,high:140},bridge:[],assumptions:[],shareSources:2}} as unknown as Analysis;
 expect(applyShareCheck(a,{status:'verified',shares:22371876,observations,reason:'old cache'}).valuation?.shareSources).not.toBe(2);
});
it('retains the newest observation for a provider field regardless of cache ordering',()=>{
 expect(reconcileShares([{source:'vendor:current',shares:150,date:'2026-10-05'},{source:'vendor:current',shares:100,date:'2025-12-31'},{source:'other',shares:101,date:'2026-10-05'}]).status).toBe('pending');
});
it('cannot overwrite an evidenced ADS valuation with provider counts of unspecified units',()=>{
 const a={valuation:{method:'owner_earnings',shareBasis:'listing-ADS',shares:400,perShare:{low:10,mid:12,high:14},bridge:[],assumptions:[]}} as unknown as Analysis;
 const check={status:'verified' as const,shares:100,observations:[{source:'provider',shares:100,basis:'issuer shares in listing units'},{source:'other',shares:100,basis:'issuer shares in listing units'}],reason:'old cache'};
 expect(applyShareCheck(a,check).valuation?.shares).toBe(400);
 expect(applyShareCheck(a,check).valuation?.shareSources).toBeUndefined();
 expect(applyShareCheck(a,{...check,shares:402,observations:[{source:'issuer',shares:400,basis:'listing-ADS'},{source:'other',shares:402,basis:'listing-ADS'}]}).valuation?.shareSources).toBe(2);
});
