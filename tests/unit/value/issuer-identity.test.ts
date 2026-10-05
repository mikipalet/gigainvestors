import {expect,it} from 'vitest';
import {issuerGroups,chooseCanonical,applyIssuerAliases} from '../../../lib/value/issuer-identity';

it('joins identifiers and depositary links transitively, never names or country prefixes',()=>{
 const groups=issuerGroups([
  {id:'A.US',lei:'lei-one',name:'Same'}, {id:'B.LSE',lei:'lei-one'},
  {id:'C.US',primary:'B.LSE'}, {id:'OTHER.US',name:'Same',isin:'US9999991111'},
  {id:'DIFFERENT.US',isin:'US8888882222'},
 ],[],[]);
 expect(groups).toEqual([['A.US','B.LSE','C.US']]);
});
it('rejects stale provider identities even through transitive paths',()=>{
 expect(()=>issuerGroups([{id:'A.US',cik:'123'},{id:'B.US',cik:'123'},{id:'C.US',cik:'123'}],[],[['A.US','C.US']])).toThrow(/conflict/);
});
it('keeps a frozen canonical and fails if two frozen dossiers would be collapsed',()=>{
 const ds:any={'A.US':{id:'A.US',company:{indexes:[],country:'US'},historyCoverage:{years:3}},'B.LSE':{id:'B.LSE',company:{indexes:['FTSE'],country:'GB'},historyCoverage:{years:20}}};
 expect(chooseCanonical(Object.values(ds),new Set(['A.US']))).toBe('A.US');
 expect(chooseCanonical(Object.values(ds),new Set())).toBe('B.LSE');
 expect(()=>chooseCanonical(Object.values(ds),new Set(['A.US','B.LSE']))).toThrow(/frozen/);
});
it('removes aliases, merges holders separately, and preserves serialized canonical dossiers including freezes',()=>{
 const canonical:any={id:'HOME.LSE',company:{id:'HOME.LSE',listings:['HOME.LSE']},holders:[],tests:{},number:42};
 const alias:any={id:'ADR.US',company:{id:'ADR.US',listings:['ADR.US']},holders:[{code:'BRK',name:'Buffett'}],number:7};
 const files:any={'dossiers/001.json':{'HOME.LSE':canonical,'ADR.US':alias},'index/GB.json':[{id:'HOME.LSE',h:0}],'index/US.json':[{id:'ADR.US',h:1}],'index/default.json':[{id:'HOME.LSE',h:0},{id:'ADR.US',h:1}],'top.json':['ADR.US','HOME.LSE'],'aliases.json':{'OLD.US':'ADR.US'}};
 const bytes=JSON.stringify(canonical);
 applyIssuerAliases(files,{'ADR.US':'HOME.LSE'},{},{});
 expect(JSON.stringify(files['dossiers/001.json']['HOME.LSE'])).toBe(bytes);
 expect(files['dossiers/001.json']['ADR.US']).toBeUndefined();
 expect(files['issuer-holders.json']['HOME.LSE']).toEqual([{code:'BRK',name:'Buffett'}]);
 expect(files['aliases.json']).toMatchObject({'ADR.US':'HOME.LSE','OLD.US':'HOME.LSE'});
 expect(files['index/US.json']).toEqual([]);
 expect(files['top.json']).toEqual(['HOME.LSE']);
});
it('refuses to remove a dossier without a present canonical target',()=>{
 expect(()=>applyIssuerAliases({'dossiers/001.json':{'A.US':{id:'A.US'}}},{'A.US':'MISSING.US'},{},{})).toThrow(/missing/i);
});
