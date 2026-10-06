import {expect,it} from 'vitest';
import {retainPublishedNumbers} from '@/lib/value/retain-published-numbers';
it('retains missing fiscal cells by period while keeping fresh numbers and results',()=>{
 const old={tests:{moat:{result:'pass',metrics:{roic:2},series:{roic:[[2019,2],[2020,3]]}}},series:{revenue:[[2019,100],[2020,120]]}};
 const next={tests:{moat:{result:'fail',metrics:{roic:null},series:{roic:[[2020,4]]}}},series:{revenue:[[2020,130]]}};
 const result=retainPublishedNumbers(old,next);
 expect(next.tests.moat).toMatchObject({result:'fail',metrics:{roic:2},series:{roic:[[2019,2],[2020,4]]}});
 expect(next.series.revenue).toEqual([[2019,100],[2020,130]]);
 expect(result).toHaveLength(3);
});
it('keeps evidenced numeric nulls and does not reinstate a suppressed whole valuation',()=>{
 const next={series:{book:[[2020,null]]},valuation:null};
 const losses=retainPublishedNumbers({series:{book:[[2020,10]]},valuation:{shares:10}},next,new Set(['series.book[2020]']));
 expect(losses).toEqual([]);expect(next).toEqual({series:{book:[[2020,null]]},valuation:null});
});
it('retains a published fiscal period even when its measurement was already null',()=>{
 const next={series:{roic:[[2025,3]]}};
 retainPublishedNumbers({series:{roic:[[2021,null],[2025,2]]}},next);
 expect(next.series.roic).toEqual([[2021,null],[2025,3]]);
});
