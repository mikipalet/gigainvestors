import {it,expect} from 'vitest';
import {businessQueue} from '../../../lib/value/business/queue';
const prior={status:'research-pending',inputHash:'same',attemptedAt:'2026-10-01',retryAfter:'2026-10-02'};
it('does not let repeatedly unresolved keys starve the remaining universe',()=>{
 const states=new Map([['KEY.US',prior]]);
 expect(businessQueue(['KEY.US','REST.US'],states,()=> 'same','2026-10-03')).toEqual(['REST.US','KEY.US']);
});
it('retains key priority for the first pass and skips unchanged completed work',()=>{
 expect(businessQueue(['KEY.US','REST.US'],new Map(),()=> 'same','2026-10-01')).toEqual(['KEY.US','REST.US']);
 expect(businessQueue(['KEY.US'],new Map([['KEY.US',{...prior,status:'complete'}]]),()=> 'same','2026-10-03')).toEqual([]);
});
it('retries changed inputs immediately but honours a failure cooldown',()=>{
 expect(businessQueue(['KEY.US'],new Map([['KEY.US',prior]]),()=> 'changed','2026-10-01')).toEqual(['KEY.US']);
 expect(businessQueue(['KEY.US'],new Map([['KEY.US',prior]]),()=> 'same','2026-10-01')).toEqual([]);
});
