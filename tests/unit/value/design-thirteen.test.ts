import {expect,it} from 'vitest';
import {availableHistoryYears} from '@/lib/value/time-travel';
import {reconcileShares} from '@/lib/value/share-check';
it('starts history at 300 analysed companies and does not impose a calendar cutoff',()=>{
 expect(availableHistoryYears({1999:299,2000:300,2001:310,2026:14})).toEqual([2000,2001,2026]);
});
it('uses independent agreement, not market cap divided by price, to verify shares',()=>{
 expect(reconcileShares([{source:'eodhd',shares:100},{source:'yahoo',shares:101}])).toMatchObject({status:'verified',shares:101});
 expect(reconcileShares([{source:'eodhd',shares:100},{source:'yahoo',shares:104}])).toMatchObject({status:'pending',shares:null});
 expect(reconcileShares([{source:'eodhd',shares:100},{source:'eodhd',shares:100}]).status).toBe('pending');
});

it('keeps uncorroborated share counts outside the buy zone',async()=>{
 const {applyShareCheck}=await import('@/lib/value/share-check');
 const {valuationFlags}=await import('@/lib/value/data-quality');
 const {publishedBuyPrice}=await import('@/lib/value/buy-price');
 const analysis={valuation:{shares:100,perShare:{low:50,mid:60,high:70},bridge:[],assumptions:[]}} as unknown as import('@/lib/value/types').Analysis;
 const pending=applyShareCheck(analysis,reconcileShares([{source:'eodhd',shares:100},{source:'yahoo',shares:140}]));
 const flags=valuationFlags({price:30,mid:60,assumptions:pending.valuation!.assumptions});
 expect(flags).toHaveLength(1);
 expect(publishedBuyPrice({st:'s',t:'PPPPP',v:[50,60,70],m:.25,dataQualityFlags:flags},[30,'2026-09-30']).b).toBe(false);
 const verified=applyShareCheck(analysis,reconcileShares([{source:'eodhd',shares:200},{source:'yahoo',shares:201}]));
 expect(verified.valuation!.perShare.mid).toBeCloseTo(60*100/201);
 expect(valuationFlags({price:30,mid:60,cap:99999,shares:201,usdRate:1,assumptions:verified.valuation!.assumptions})).toEqual([]);
 expect(analysis.valuation!.shares).toBe(100);
});

it('keeps financial valuation bridge values on the reconciled per-share basis',async()=>{
 const {applyShareCheck}=await import('@/lib/value/share-check');
 const analysis={valuation:{shares:100,perShare:{low:30,mid:40,high:50},bridge:[{label:'tangible book value per share',value:10},{label:'justified price to book',value:4}],assumptions:[]}} as unknown as import('@/lib/value/types').Analysis;
 const result=applyShareCheck(analysis,reconcileShares([{source:'eodhd',shares:200},{source:'yahoo',shares:200}])).valuation!;
 expect(result.bridge[0].value).toBe(5);
 expect(result.bridge[1].value).toBe(4);
 expect(result.bridge[0].value*result.bridge[1].value).toBe(result.perShare.mid);
});
