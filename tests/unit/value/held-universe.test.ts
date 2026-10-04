import {describe,expect,it} from 'vitest';
import {heldStocks,mapHeldSecurity,securityExclusion} from '@/lib/value/held-universe';

describe('held universe',()=>{
 it('uses eight global quarters and only positive tracked positions',()=>{
  const quarters=Array.from({length:10},(_,i)=>`202${Math.floor(i/4)+4} Q${i%4+1}`);
  const stock=(ticker:string,q:string,code='A',activity='hold',value=10)=>({ticker,name:ticker,quarters:[{q,holders:[{code,activity,value}]}]});
  const result=heldStocks([stock('YES',quarters[2]),stock('OLD',quarters[1]),stock('SOLD',quarters[9],'A','sold'),stock('ZERO',quarters[9],'A','hold',0),stock('OTHER',quarters[9],'B')],quarters,['A']);
  expect(result.map(s=>s.ticker)).toEqual(['YES']);
 });
 it('prefers the US receipt and preserves share classes',()=>{
  const symbols=[{Code:'BABA',Name:'Alibaba Group',Type:'Common Stock',Isin:'US01609W1027'},{Code:'BRK-B',Name:'Berkshire Hathaway',Type:'Common Stock',Isin:'US0846707026'}];
  expect(mapHeldSecurity({ticker:'BABA',name:'Alibaba'},symbols).id).toBe('BABA.US');
  expect(mapHeldSecurity({ticker:'BRK.B',name:'Berkshire Hathaway'},symbols).id).toBe('BRK-B.US');
 });
 it('matches a supplied CUSIP but never guesses a reused retired ticker',()=>{
  const symbols=[{Code:'NEW',Name:'Company',Type:'Common Stock',Isin:'US1234567890'},{Code:'OLD',Name:'Different company',Type:'Common Stock',Isin:'US9999999999'}];
  expect(mapHeldSecurity({ticker:'MISSING',name:'Company',cusip:'123456789'},symbols).id).toBe('NEW.US');
  expect(mapHeldSecurity({ticker:'OLD-OLD',name:'Original company'},symbols).status).toBe('unresolved');
 });
 it('does not claim unavailable identity evidence is a delisting',()=>{
  expect(mapHeldSecurity({ticker:'MISSING',name:'Company'},[])).toMatchObject({status:'unresolved',id:null});
 });
 it('excludes instruments but retains operating financial and property companies',()=>{
  for(const Type of ['ETF','FUND','SPAC','Warrant','Right','Preferred Stock','Unit','Note']) expect(securityExclusion({ticker:'X',name:'Example'},{Type})).not.toBeNull();
  expect(securityExclusion({ticker:'X.WS',name:'Company warrants'},{})).not.toBeNull();
  expect(securityExclusion({ticker:'X',name:'Example REIT'},{Type:'Common Stock'})).toBeNull();
  expect(securityExclusion({ticker:'X',name:'Example Bank'},{Type:'Common Stock'})).toBeNull();
  expect(securityExclusion({ticker:'X',name:'Example Fund Management'},{Type:'Common Stock'})).toBeNull();
 });
});

it('accepts a reviewed rename with public evidence and never guesses a reused symbol',()=>{
 const evidence={ticker:'OLD-OLD',name:'Original company',id:'NEW.US',status:'mapped' as const,reason:'same issuer renamed',evidence:['https://www.sec.gov/Archives/rename.htm']};
 expect(mapHeldSecurity({ticker:'OLD-OLD',name:'Original company'},[],evidence)).toMatchObject({id:'NEW.US',status:'mapped'});
 expect(()=>mapHeldSecurity({ticker:'OLD-OLD',name:'Original company'},[],{...evidence,evidence:[]})).toThrow(/evidence/);
 expect(()=>mapHeldSecurity({ticker:'OLD-OLD',name:'Different issuer'},[],evidence)).toThrow(/identity/);
});
