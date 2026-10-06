import {expect,it} from 'vitest';
import {issuerShareContradictions} from '@/lib/value/publication-continuity';
import type {Valuation} from '@/lib/value/types';
const v={method:'owner_earnings',shares:100} as Valuation;
const o={source:'issuer:sec',shares:90,date:'2026-06-30',url:'https://www.sec.gov/Archives/edgar/data/1/filing.htm',basis:'all-ordinary-outstanding'};
it('requires primary comparable evidence, beyond two percent, after split adjustment',()=>{
 expect(issuerShareContradictions(v,[o],'2026-10-06')).toEqual([o]);
 expect(issuerShareContradictions(v,[{...o,source:'eodhd'}],'2026-10-06')).toEqual([]);
 expect(issuerShareContradictions({...v,shares:91.8},[o],'2026-10-06')).toEqual([]);
 expect(issuerShareContradictions({...v,shares:180},[o],'2026-10-06',[{date:'2026-07-01',factor:2}])).toEqual([]);
 expect(issuerShareContradictions({...v,shareBasis:'listing-ADS'},[o],'2026-10-06')).toEqual([]);
 expect(issuerShareContradictions(v,[{...o,date:'2025-01-01'}],'2026-10-06')).toEqual([]);
});
it('binds the issuer cover count to a dated filing and rejects ADR ambiguity',async()=>{
 const {issuerFilingShareObservations}=await import('@/lib/value/publication-continuity');
 const facts={cik:1,facts:{dei:{EntityCommonStockSharesOutstanding:{units:{shares:[{end:'2026-07-31',filed:'2026-08-01',val:90,form:'10-Q',accn:'0000000001-26-000001'}]}}}}};
 const raw={General:{Type:'Common Stock',Name:'Example'}};
 expect(issuerFilingShareObservations(raw,facts,'2026-10-06')[0]).toMatchObject({shares:90,date:'2026-07-31',source:'issuer:sec-cover'});
 expect(issuerFilingShareObservations(raw,facts,'2026-07-31')).toEqual([]);
 expect(issuerFilingShareObservations({General:{...raw.General,Name:'Example ADR'}},facts,'2026-10-06')).toEqual([]);
});
