import {it,expect} from 'vitest';
import {applyShareCheck} from '@/lib/value/share-check';
import {ownerReturn} from '@/lib/value/owner-return';
import type {Analysis} from '@/lib/value/types';
it('changes every book-value per-share input to the verified current share basis',()=>{
 const analysis={valuation:{method:'book_value',currency:'USD',shares:100,normalized:50,growth:.06,discountRate:.1,perShare:{low:140,mid:175,high:200},financialReturn:{roe:.2,retention:.3,payout:.7,cashPerShare:7},bridge:[{label:'tangible book value per share',value:50}],assumptions:[]}} as unknown as Analysis;
 const check={status:'verified' as const,shares:80,observations:[],reason:'Verified current ordinary shares'};
 const v=applyShareCheck(analysis,check).valuation!;
 expect(v.normalized).toBe(62.5);expect(v.financialReturn!.cashPerShare).toBe(8.75);
 expect(v.perShare.mid).toBeCloseTo(v.normalized*(.2-.06)/(.1-.06));
 expect(ownerReturn(v,'USD',null,100)?.expected).toBeCloseTo(.1475);
 // Applying the same verification again must leave every input unchanged.
 expect(applyShareCheck({...analysis,valuation:v},check).valuation).toEqual(v);
});
