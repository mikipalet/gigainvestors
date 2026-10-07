import {expect,it} from 'vitest';
import {cachedPublicationShares} from '@/lib/value/cached-publication-shares';
const raw={General:{Type:'Common Stock',Name:'Example Inc',CIK:'1',UpdatedAt:'2026-10-06'},SharesStats:{SharesOutstanding:100}};
const facts={cik:1,facts:{dei:{EntityCommonStockSharesOutstanding:{units:{shares:[{end:'2026-08-20',filed:'2026-08-22',val:100,form:'10-Q',accn:'0000000001-26-000001'}]}}}}};
it('reconciles cached vendor and same-issuer filing counts for non-quality passers without network',()=>{
 const check=cachedPublicationShares(raw,facts,null,'2026-10-07');
 expect(check?.status).toBe('verified');expect(check?.shares).toBe(100);
 expect(check?.observations.map(o=>o.source)).toEqual(['eodhd:current','sec:cover']);
});
it.each(['differentIssuer','stale','adr','disagreement'])('does not manufacture corroboration for %s',mode=>{
 const r=structuredClone(raw),f=structuredClone(facts);
 if(mode==='differentIssuer')f.cik=2;
 if(mode==='stale')r.General.UpdatedAt='2026-08-01';
 if(mode==='adr')r.General.Name='Example ADR';
 if(mode==='disagreement')r.SharesStats.SharesOutstanding=110;
 expect(cachedPublicationShares(r,f,null,'2026-10-07')?.status).not.toBe('verified');
});
it('does not erase a newer conflicting SEC observation by relabeling its provider',()=>{
 const existing={status:'pending' as const,shares:null,reason:'disagrees',observations:[{source:'sec:newer',shares:150,date:'2026-09-01',basis:'all-ordinary-outstanding'}]};
 expect(cachedPublicationShares(raw,facts,existing,'2026-10-07')?.status).not.toBe('verified');
});
