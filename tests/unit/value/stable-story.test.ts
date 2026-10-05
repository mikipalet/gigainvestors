import {expect,it} from 'vitest';
import {retainStoryTimestamp} from '../../../lib/value/price-story/compose';
it('keeps the original observation timestamp for an unchanged published story',()=>{
 const old:any={version:1,asOf:'2026-10-05T01:39:00Z',line:'Same facts',facts:[],events:[],needs:null,priceDate:'2026-10-02'};
 const current={...old,asOf:'2026-10-05T02:00:00Z'};
 expect(retainStoryTimestamp(current,old)).toEqual(old);
 expect(retainStoryTimestamp({...current,line:'New fact'},old).asOf).toBe(current.asOf);
 expect(retainStoryTimestamp({...current,priceDate:'2026-10-05'},old).asOf).toBe(current.asOf);
});
