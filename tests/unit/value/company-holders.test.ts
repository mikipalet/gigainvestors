import {expect,it} from 'vitest';
import {mergeListingHoldings} from '../../../lib/value/company-holders';
const stock=(ticker:string,value:number,code='BRK'):any=>({ticker,name:'Company',quarters:[{q:'2026Q2',price:10,holders:[{code,value,pct:2,activity:'hold',change:0}]}]});
it('unions investors and sums dollar exposure without combining incompatible share prices',()=>{
 const merged=mergeListingHoldings('HOME.LSE','Company',[stock('ADR',100),stock('OTC',200),stock('OTC2',50,'GR')]);
 expect(merged?.quarters[0].holders).toEqual([{code:'BRK',value:300,pct:4,activity:'hold',change:null},{code:'GR',value:50,pct:2,activity:'hold',change:null}]);
 expect(merged?.quarters[0].price).toBeNull();
});
it('does not double count a punctuation alias of the same listing',()=>{
 expect(mergeListingHoldings('HOME.US','Company',[stock('HOME.B',100),stock('HOME.B',100)])?.quarters[0].holders[0].value).toBe(100);
});
