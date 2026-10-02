import {it,expect} from 'vitest';
import {factsFromVendor,latestMemoPrices} from '../../../lib/value/business/memo-facts';
it('uses percentage points and extracts a complete product phrase from description',()=>{
 const facts=factsFromVendor({General:{Description:'Acme designs, distributes, and retails technical athletic apparel, footwear, and accessories for women.'},SharesStats:{PercentInsiders:4.5}},'LULU.US','2026-10-01');
 expect(facts.insiderPercent).toBe(4.5);
 expect(facts.product).toBe('Technical athletic apparel');
});
it('does not coerce absent insider data into zero or accept an invalid percentage',()=>{
 for(const value of [null,'',undefined,-1,101])expect(factsFromVendor({SharesStats:{PercentInsiders:value}},'TEST.US','2026').insiderPercent).toBeUndefined();
 expect(factsFromVendor({SharesStats:{PercentInsiders:0}},'TEST.US','2026').insiderPercent).toBe(0);
});
it('keeps published quotes absent from a partial refresh and chooses the newest date',()=>{
 expect(latestMemoPrices({'LULU.US':[96.87,'2026-09-29'],'KO.US':[80,'2026-09-30']},{'KO.US':[79,'2026-09-28']})).toEqual({'LULU.US':[96.87,'2026-09-29'],'KO.US':[80,'2026-09-30']});
});
