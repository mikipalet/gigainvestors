import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bondYield } from '@/lib/value/bond-yields';
import { readCorpusJson, writeCorpusJson } from '@/lib/value/corpus';
import { valueCompany } from '@/lib/value/valuation';
import { makeYears } from './synthetic';
let root:string;
beforeEach(()=>{root=mkdtempSync(join(tmpdir(),'yields-'));vi.stubEnv('VALUE_CORPUS_DIR',root);vi.stubEnv('EODHD_API_KEY','test');});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals();rmSync(root,{recursive:true,force:true});});
const rows=(close:number)=>Array.from({length:20},(_,i)=>({date:new Date(Date.now()-i*86400000).toISOString().slice(0,10),close}));
it.each(['operating','bank','insurer'] as const)('floors the local bond + 4pp at 10% for %s',kind=>{
 const v=valueCompany({years:makeYears(),kind,bondYield:.012,cyclical:false}).valuation!;
 expect(v.discountRate).toBeCloseTo(.10);
 expect(v.perShare.high).toBeGreaterThanOrEqual(v.perShare.mid);
});
it('maps Swiss ISO CH to SW, rejecting an implausible close in favour of the median',async()=>{
 vi.stubGlobal('fetch',async(url:string)=>{expect(new URL(url).pathname).toContain('SW10Y.GBOND');return Response.json([{date:new Date().toISOString().slice(0,10),close:6.06},...rows(1).slice(1)]);});
 expect(await bondYield('CH')).toBe(.01);
 expect(readCorpusJson<any>('bonds/CH.json')).toMatchObject({source:'EODHD 30-day median',flags:expect.arrayContaining(['outside-plausible-band'])});
});
it('uses a documented Swiss default when the entire series is broken',async()=>{
 vi.stubGlobal('fetch',async()=>Response.json(rows(6.06)));
 expect(await bondYield('CH')).toBe(.01);
 expect(readCorpusJson<any>('bonds/CH.json')).toMatchObject({source:'country default (2026-09-30)',flags:expect.arrayContaining(['country-default'])});
});
it('rejects an in-band spike against the 30-day median',async()=>{
 vi.stubGlobal('fetch',async()=>Response.json([{date:new Date().toISOString().slice(0,10),close:7},...rows(3).slice(1)]));
 expect(await bondYield('DE')).toBe(.03);
});
it('cross-checks US with Yahoo TNX in percent, caches daily, and refreshes next day',async()=>{
 let calls=0;
 vi.stubGlobal('fetch',async(url:string)=>{calls++;return Response.json(url.includes('yahoo')?{chart:{result:[{meta:{regularMarketPrice:4.2,regularMarketTime:Date.now()/1000}}],error:null}}:rows(5.3));});
 expect(await bondYield('US')).toBe(.042);
 expect(await bondYield('US')).toBe(.042);
 expect(calls).toBe(2);
 expect(readCorpusJson<any>('bonds/US.json')).toMatchObject({source:'Yahoo ^TNX',flags:expect.arrayContaining(['second-source-disagreement'])});
 writeCorpusJson('bonds/US.json',{...readCorpusJson<any>('bonds/US.json'),date:'2000-01-01'});
 await bondYield('US');expect(calls).toBe(4);
});
it('does not accept stale quotes or invent a local yield for an unsupported country',async()=>{
 vi.stubGlobal('fetch',async()=>Response.json([{date:'2025-09-30',close:4}]));
 expect(await bondYield('ZZ')).toBeNull();
});
it('keeps low-rate DCF scenarios finite and ordered even at a zero bond yield',()=>{
 const v=valueCompany({years:makeYears(),kind:'operating',bondYield:0,cyclical:false}).valuation!;
 expect(v.discountRate).toBe(.10);
 expect(Number.isFinite(v.perShare.high)).toBe(true);
 expect(v.perShare.high).toBeGreaterThan(v.perShare.mid);
});
it.each([null, NaN, Infinity])('does not invent a discount rate for invalid yield %s',bondYield=>{
 expect(valueCompany({years:makeYears(),kind:'operating',bondYield,cyclical:false}).valuation).toBeNull();
});
it.each(['operating','bank','insurer'] as const)('uses the live bond + 4pp above the floor for %s',kind=>{
 const v=valueCompany({years:makeYears(),kind,bondYield:.08,cyclical:false}).valuation!;
 expect(v.discountRate).toBeCloseTo(.12);
});
it.each([-.015,0,.06])('keeps the 10% floor at low yields and the boundary: %s',bondYield=>{
 const v=valueCompany({years:makeYears(),kind:'operating',bondYield,cyclical:false}).valuation!;
 expect(v.discountRate).toBeCloseTo(.10);
 expect(Number.isFinite(v.perShare.high)).toBe(true);
});
it('propagates exhausted EODHD budget so the daily runner cannot publish missing yields',async()=>{
 const date=new Date().toISOString().slice(0,10);
 writeCorpusJson(`usage/eodhd-${date}.json`,{date,used:100000,history:0});
 await expect(bondYield('US')).rejects.toThrow('daily EODHD budget reached');
 expect(readCorpusJson('bonds/US.json')).toBeNull();
});
it('maps Chile to CH rather than requesting a nonexistent CL series',async()=>{
 vi.stubGlobal('fetch',async(url:string)=>new URL(url).pathname.includes('/CH10Y.')?Response.json(rows(6.14)):new Response('',{status:404}));
 expect(await bondYield('CL')).toBeCloseTo(.0614);
});
it.each(['UG','ZM'])('accepts a plausible high-yield local market %s confirmed by its median',async country=>{
 vi.stubGlobal('fetch',async()=>Response.json(rows(15.78)));
 expect(await bondYield(country)).toBeCloseTo(.1578);
});
it('keeps a valid cached bond observation across midnight when paid requests are disabled',async()=>{
 vi.stubEnv('VALUE_NO_EODHD','1');
 writeCorpusJson('bonds/JP.json',{version:2,date:'2026-09-29',yield:.012,source:'EODHD latest',symbol:'JP10Y.GBOND',observedAt:'2026-09-29',rawYield:.012,median:.012,secondSource:null,flags:[]});
 const network=vi.fn(()=>{throw new Error('No network expected');});vi.stubGlobal('fetch',network);
 expect(await bondYield('JP')).toBe(.012);expect(network).not.toHaveBeenCalled();
});
