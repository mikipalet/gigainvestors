import {it,expect} from 'vitest';
import {checklistVerdict} from '@/lib/checklist-verdict';
import {companyPath,dossierId,withQuarter} from '@/lib/company-route';
it('separates quality, price and missing assessments',()=>{
 expect(checklistVerdict({t:'PPPPP',b:true})).toBe('fair');
 expect(checklistVerdict({t:'PPPPP',b:false})).toBe('pass');
 expect(checklistVerdict({t:'PFPPP',b:true})).toBe('fails');
 expect(checklistVerdict({t:'PUUPP'})).toBeUndefined();
});
it('round trips US, foreign and share-class company identities',()=>{
 for(const [id,ticker] of [['AAPL.US','AAPL'],['PLX.PA','PLX.PA'],['7203.JP','7203.JP'],['BRK.B.US','BRK.B'],['DEVL.F','DEVL.F']]){
  expect(companyPath(id)).toBe(`/s/${ticker}`);expect(dossierId(ticker)).toBe(id);
 }
});
it('preserves a selected quarter alongside existing filters',()=>{
 expect(withQuarter('/value?markets=all','2018Q3')).toBe('/value?markets=all&q=2018Q3');
 expect(withQuarter('/s/AAPL?q=2011Q4','2018Q3')).toBe('/s/AAPL?q=2011Q4');
});
