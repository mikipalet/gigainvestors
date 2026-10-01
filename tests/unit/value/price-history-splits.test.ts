import {expect,it} from 'vitest';
import {reconcilePriceSplits} from '@/lib/value/price-history';
import type {Fundamentals,PriceHistory} from '@/lib/value/types';

const facts=(factor=10,shares=[940,900])=>({splits:[{date:'2018-08-31',factor}],years:[
 {end:'2017-12-31',dilutedShares:shares[0]}, {end:'2018-12-31',dilutedShares:shares[1]},
]} as Fundamentals);
it('reconciles an original-close split against restated annual shares without mutating the cache',()=>{
 const prices:PriceHistory=[['2017-12',4500],['2018-07',4871],['2018-08',492.05],['2018-12',432.25]];
 expect(reconcilePriceSplits(prices,facts())).toEqual([['2017-12',450],['2018-07',487.1],['2018-08',492.05],['2018-12',432.25]]);
 expect(prices[0][1]).toBe(4500);
});
it('leaves already split-adjusted prices unchanged',()=>{
 const prices:PriceHistory=[['2018-07',487.1],['2018-08',492.05]];
 expect(reconcilePriceSplits(prices,facts())).toEqual(prices);
});
it('does not reconcile a price drop without a declared split or without restated shares',()=>{
 const prices:PriceHistory=[['2018-07',4871],['2018-08',492.05]];
 expect(reconcilePriceSplits(prices,{...facts(),splits:[]})).toEqual(prices);
 expect(reconcilePriceSplits(prices,facts(10,[94,900]))).toEqual(prices);
});
it('reconciles a reverse split only when adjacent closes corroborate its factor',()=>{
 const prices:PriceHistory=[['2018-07',5],['2018-08',49]];
 expect(reconcilePriceSplits(prices,facts(.1))).toEqual([['2018-07',50],['2018-08',49]]);
 expect(reconcilePriceSplits([['2018-07',5],['2018-08',20]],facts(.1))).toEqual([['2018-07',5],['2018-08',20]]);
});
it('does not infer a split across missing monthly or annual observations',()=>{
 expect(reconcilePriceSplits([['2018-06',4871],['2018-08',492.05]],facts())).toEqual([['2018-06',4871],['2018-08',492.05]]);
 const sparse={...facts(),years:[{end:'2016-12-31',dilutedShares:940},{end:'2018-12-31',dilutedShares:900}]} as Fundamentals;
 expect(reconcilePriceSplits([['2018-07',4871],['2018-08',492.05]],sparse)).toEqual([['2018-07',4871],['2018-08',492.05]]);
});
