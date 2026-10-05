import {expect,it} from 'vitest';
import {retiredIssuerAliases} from '../../../scripts/value/retired-issuer-aliases';
it('only retires a listing once its canonical dossier is present and the old dossier is gone',()=>{
 expect(retiredIssuerAliases({'ADR.US':'HOME.LSE'},new Set(['HOME.LSE']))).toEqual({'ADR.US':'HOME.LSE'});
 expect(retiredIssuerAliases({'ADR.US':'HOME.LSE'},new Set(['ADR.US','HOME.LSE']))).toEqual({});
 expect(()=>retiredIssuerAliases({'ADR.US':'HOME.LSE'},new Set())).toThrow(/missing/i);
 expect(()=>retiredIssuerAliases({'ADR.US':'HOME.LSE','HOME.LSE':'OTHER.US'},new Set(['OTHER.US']))).toThrow(/direct/i);
});
