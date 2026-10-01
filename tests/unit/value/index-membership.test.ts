import { describe, expect, it } from 'vitest';
import { createConstituentMatcher, applyMembership } from '@/lib/value/index-membership';
import type { Company } from '@/lib/value/types';
const company=(id:string,name:string,isin:string|null=null,listings=[id])=>({id,code:id.split('.')[0],exchange:id.split('.').at(-1),name,isin,listings} as Company);
describe('index membership',()=>{
 const companies=[company('2330.TW','Taiwan Semiconductor Manufacturing','TW0002330008',['2330.TW','TSM.US']),company('ASML.AS','ASML Holding NV','NL0010273215',['ASML.AS','ASML.US']),company('INFY.US','Infosys Limited','US4567881085')];
 it('maps receipt tickers to existing home identities',()=>expect(createConstituentMatcher(companies)({name:'TSMC',code:'TSM',exchange:'US'})?.id).toBe('2330.TW'));
 it('maps receipt ISINs using existing underlying aliases',()=>expect(createConstituentMatcher(companies)({name:'TSMC',isin:'US8740391003'})?.id).toBe('2330.TW'));
 it('matches normalized issuer names when home ticker is absent',()=>expect(createConstituentMatcher(companies)({name:'Infosys',code:'INFY',exchange:'NSE'})?.id).toBe('INFY.US'));
 it('does not confuse identical tickers on different exchanges',()=>expect(createConstituentMatcher(companies)({name:'Unrelated',code:'ASML',exchange:'TO'})).toBeNull());
 it('rejects ambiguous names',()=>expect(createConstituentMatcher([company('ONE.US','Acme'),company('TWO.TO','Acme')])({name:'Acme'})).toBeNull());
 it('replaces stale membership and excludes nonmembers only when selecting publication',()=>{
  const rows=applyMembership(companies,{'ASML.AS':['AEX','Euro Stoxx 50']});
  expect(rows).toHaveLength(3); expect(rows[0].indexes).toEqual([]); expect(rows[1].indexes).toEqual(['AEX','Euro Stoxx 50']);
 });
});

import { parseConstituentTables } from '@/lib/value/index-constituents';
it('prefers an exact primary over a conflicting secondary alias',()=>{
 const matcher=createConstituentMatcher([company('MRK.XETRA','Merck KGaA',null,['MRK.XETRA','MRK.US']),company('MRK.US','Merck & Co')]);
 expect(matcher({name:'Merck',code:'MRK',exchange:'US'})?.id).toBe('MRK.US');
});
it('parses both Taiwan members on each physical table row',()=>{
 const rows=parseConstituentTables({url:'https://zh.wikipedia.org',retrievedAt:'2026-09-30',tables:[[['股票代號','名稱','比重(%)','股票代號','名稱','比重(%)'],['臺證所：2330','台積電','60','臺證所：2303','聯電','1']]]},'TW');
 expect(rows).toEqual([{name:'台積電',code:'2330',exchange:'TW'},{name:'聯電',code:'2303',exchange:'TW'}]);
});
it('reads every Nikkei sector table without treating historical changes as members',()=>{
 const rows=parseConstituentTables({url:'https://indexes.nikkei.co.jp',retrievedAt:'2026-09-30',tables:[[['Year','Closing level'],['2025','40000']],[['Code','Company Name'],['7203','Toyota']],[['Code','Company Name'],['6758','Sony']]]},'JP');
 expect(rows.map(r=>r.code)).toEqual(['7203','6758']);
});
it('normalizes Mexican share class separators',()=>{
 expect(createConstituentMatcher([company('CEMEXCPO.MX','Cemex')])({name:'Cemex',code:'CEMEX CPO',exchange:'MX'})?.id).toBe('CEMEXCPO.MX');
});
it('prefers the home issuer when a separately retained ADR also claims the exact ticker',()=>{
 const matcher=createConstituentMatcher([company('2330.TW','Taiwan Semiconductor Manufacturing','TW0002330008',['2330.TW','TSM.US']),company('TSM.US','Taiwan Semiconductor Manufacturing','US8740391003')]);
 expect(matcher({name:'TSMC',code:'TSM',exchange:'US'})?.id).toBe('2330.TW');
});
