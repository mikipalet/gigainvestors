import {expect,it,vi} from 'vitest';
import {mergeCompany} from '@/lib/value/companies';
import {resolveCik} from '@/lib/value/reports/edgar';
import {analysisSections,loadSections} from '@/scripts/value/stages/analyze';
import {correctCachedAnnualSources,issuerAnnualSources} from '@/lib/value/annual-source-corrections';
import type {Company} from '@/lib/value/types';
const company={id:'001800.KO',name:'ORION Holdings Corp',description:'Korean holding company',cik:null,listings:['001800.KO','ORN.US','271560.KO'],country:'KR',currency:'KRW',kind:'operating'} as Company;
const wrong='https://www.sec.gov/Archives/edgar/data/1402829/000140282926000011/orn-20251231x10k.htm';
it('removes explicitly distinct issuers from cached listing metadata',()=>{
 expect(mergeCompany(company,{}).listings).toEqual(['001800.KO']);
});
it('does not look up the US construction company for the Korean holding company',async()=>{
 const request=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Unexpected request'));
 try{expect(await resolveCik(company)).toBeNull();expect(request).not.toHaveBeenCalled();}finally{request.mockRestore();}
});
it('blocks cached wrong-issuer text before it can affect quality tests',()=>{
 expect(()=>loadSections({company,report:{id:company.id,kind:'10-K',url:wrong,period:'2025-12-31',filed:'2026-03-04',sections:['business']}})).toThrow(/issuer/i);
});
it('falls back to issuer description instead of failing analysis on rejected filing text',()=>{
 const result=analysisSections({company,report:{id:company.id,kind:'10-K',url:wrong,period:'2025-12-31',filed:'2026-03-04',sections:['business']}});
 expect(result.sections).toEqual({description:'Korean holding company'});
 expect(result.report).toMatchObject({id:company.id,kind:'description',url:null,sections:[]});
 expect(result.rejectedReport?.url).toBe(wrong);
});
it('excludes wrong-issuer numeric sources before normalization instead of failing the company',()=>{
 const read=<T,>(path:string):T|null=>path===`raw/sec-annual/${company.id}.json`?{source:wrong,facts:{facts:{}}} as T:path===`raw/sec-companyfacts/${company.id}.json`?{cik:1402829,facts:{}} as T:null;
 expect(correctCachedAnnualSources(company,[],null,read)).toEqual([]);
 const sources=issuerAnnualSources(company,read);
 expect(sources).toMatchObject({evidence:null,facts:null});
 expect(sources.rejected).toEqual([wrong,'https://data.sec.gov/api/xbrl/companyfacts/CIK0001402829.json']);
});
it('accepts each issuer\'s own SEC filing when the vendor reused one CIK across a split-off',()=>{
 const liberty='https://www.sec.gov/Archives/edgar/data/1560385/000110465926020653/lmca-20251231x10k.htm';
 const regal='https://www.sec.gov/Archives/edgar/data/82811/000008281126000054/rbc-20251231.htm';
 const check=(id:string,url:string)=>analysisSections({company:{...company,id,listings:[id]},report:{id,kind:'10-K',url,period:'2025-12-31',filed:'2026-02-26',sections:[]}}).rejectedReport?.url??null;
 expect(check('FWONA.US',liberty)).toBeNull();
 expect(check('RRX.US',regal)).toBeNull();
 expect(check('BATRA.US',liberty)).toBe(liberty);
 expect(check('LLYVA.US',liberty)).toBe(liberty);
 expect(check('RBC.US',regal)).toBe(regal);
});
it('replaces stale vendor CIKs with the SEC ticker-map CIK for reviewed distinct issuers',()=>{
 const merged=(id:string,cik:string)=>mergeCompany({...company,id,cik,listings:[id]},{}).cik;
 expect(merged('RBC.US','0000082811')).toBe('0001324948');
 expect(merged('BATRA.US','0001560385')).toBe('0001958140');
 expect(merged('LLYVA.US','0001560385')).toBe('0002078416');
 expect(merged('MRK.XETRA','0000310158')).toBeNull();
 expect(merged('KO.US','0000021344')).toBe('0000021344');
});
