import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import stage from '@/scripts/value/stages/index-membership';
import { appendJsonl, readCorpusJson, writeCorpusJson } from '@/lib/value/corpus';
vi.mock('@/lib/value/major-indexes.json',()=>({default:[['S&P 500','unused','US',1,'GSPC']]}));
const request=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/value/eodhd',()=>({eodhd:request}));
let dir:string;
const today=new Date().toISOString().slice(0,10);
beforeEach(()=>{
 dir=mkdtempSync(path.join(os.tmpdir(),'index-membership-test-'));
 vi.stubEnv('VALUE_CORPUS_DIR',dir);vi.stubEnv('EODHD_API_KEY','unit-test');request.mockClear();
 appendJsonl('universe.jsonl',{id:'KO.US',code:'KO',exchange:'US',name:'Coca-Cola',isin:'US1912161007',listings:['KO.US']});
 writeCorpusJson(`usage/eodhd-${today}.json`,{date:today,used:99997,history:0});
});
afterEach(()=>{vi.unstubAllEnvs();rmSync(dir,{recursive:true,force:true});});
function source(code:string,name:string){writeCorpusJson('index-membership/raw/S&P 500.json',{url:'https://en.wikipedia.org/test',retrievedAt:today,tables:[[['Symbol','Company'],[code,name]]]});}
it('uses the parsed dated fallback without spending beyond the remaining budget',async()=>{
 source('KO','Coca-Cola');await stage();
 expect(request).not.toHaveBeenCalled();
 expect(readCorpusJson('index-membership/latest.json')).toMatchObject({complete:true,memberships:{'KO.US':['S&P 500']},indexes:[{retrievedAt:today,total:1,unmatched:[]}]});
});
it('keeps unmatched evidence and fails the coverage gate',async()=>{
 source('UNKNOWN','Unknown');await expect(stage()).rejects.toThrow('coverage incomplete');
 expect(readCorpusJson('index-membership/latest.json')).toMatchObject({complete:false,indexes:[{unmatched:[{code:'UNKNOWN',name:'Unknown'}]}]});
});
it('retains a verified missing listing identity without rewriting the upstream universe',async()=>{
 source('DHI','D. R. Horton');
 writeCorpusJson('raw/eodhd/universe/symbols-US.json',{date:today,data:[{Code:'DHI',Name:'DR Horton Inc',Currency:'USD',Exchange:'NYSE',Isin:'US23331A1097',Type:'Common Stock'}]});
 const original=readFileSync(path.join(dir,'universe.jsonl'),'utf8');
 await stage();
 expect(readFileSync(path.join(dir,'universe.jsonl'),'utf8')).toBe(original);
 expect(readCorpusJson('index-membership/latest.json')).toMatchObject({complete:true,memberships:{'DHI.US':['S&P 500']},supplementalCompanies:[{id:'DHI.US',source:'eodhd',marketCapUsd:null}]});
});
it('uses all cached exchanges to identify constituents absent from the home exchange cache',async()=>{
 source('MFT','Mainfreight Limited');
 writeCorpusJson('raw/eodhd/universe/symbols-F.json',{data:[{Code:'NK7',Name:'Mainfreight Ltd',Currency:'EUR',Exchange:'F',Isin:'NZMFTE0001S9',Type:'Common Stock'}]});
 await stage({offline:true});
 expect(readCorpusJson('index-membership/latest.json')).toMatchObject({complete:true,memberships:{'NK7.F':['S&P 500']}});
});
it('audits excluded fund rows as resolved while omitting their site memberships',async()=>{
 source('BNKR','Bankers Investment Trust');
 writeCorpusJson('raw/eodhd/universe/symbols-US.json',{data:[{Code:'BNKR',Name:'Bankers Investment Trust',Currency:'USD',Exchange:'NYSE',Type:'Common Stock'}]});
 await stage({offline:true});
 expect(readCorpusJson('index-membership/latest.json')).toMatchObject({complete:true,memberships:{},indexes:[{unmatched:[],excluded:[{name:'Bankers Investment Trust'}]}]});
});
it('does not classify an operating issuer using a colliding vendor ETF ticker',async()=>{
 source('KOETF','Coca-Cola');
 writeCorpusJson('raw/eodhd/universe/symbols-US.json',{data:[{Code:'KOETF',Name:'Leveraged Coca-Cola ETF',Type:'ETF',Isin:'DIFFERENT'}]});
 await stage({offline:true});
 expect(readCorpusJson('index-membership/latest.json')).toMatchObject({complete:true,memberships:{'KO.US':['S&P 500']},indexes:[{excluded:[]}]});
});
it('keeps a missing issuer unmatched when its vendor mnemonic collides with an unrelated ETF',async()=>{
 source('NEW','New Operating Business');
 writeCorpusJson('raw/eodhd/universe/symbols-US.json',{data:[{Code:'NEW',Name:'New Energy ETF',Type:'ETF',Isin:'OTHER'}]});
 await expect(stage({offline:true})).rejects.toThrow('coverage incomplete');
 expect(readCorpusJson('index-membership/latest.json')).toMatchObject({indexes:[{unmatched:[{name:'New Operating Business'}],excluded:[]}]});
});
