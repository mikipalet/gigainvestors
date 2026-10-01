import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildForwardSnapshot, computeForwardRecord, forwardHeadline, type ForwardSnapshot } from '@/lib/value/forward';
import { writeOutput } from '@/scripts/value/stages/publish';
import { METHOD_VERSION, METHOD_CHANGES } from '@/lib/value/method-version';
import type { Company, IndexRow } from '@/lib/value/types';

const company = (id: string, western = true) => ({id,name:id,currency:'USD',listings:[id],exchange:western?'US':'SHG',country:western?'US':'CN'} as Company);
const row = (id: string) => ({id,n:id,b:true,cur:'USD',v:[80,100,120],m:.25,buyReturnInputs:{cashPerShare:10,growth:.03,requiredReturn:.1}} as IndexRow);
function snapshot(date: string, prices: Record<string,number>, picks: string[], western = ['A.US']): ForwardSnapshot {
 return buildForwardSnapshot({date, universe:Object.keys(prices).map(id=>company(id,western.includes(id))), rows:picks.map(row), prices:Object.fromEntries(Object.entries(prices).map(([id,p])=>[id,[p,date]]))});
}
const dirs:string[]=[];
afterEach(()=>dirs.splice(0).forEach(dir=>rmSync(dir,{recursive:true,force:true})));

describe('forward snapshot',()=>{
 it('starts at the live method and records picks, quotes and the complete benchmark',()=>{
  expect(METHOD_VERSION).toBe('3.1.0');
  expect(METHOD_CHANGES[0]).toMatchObject({version:'3.1.0',date:'2026-10-01'});
  expect(METHOD_CHANGES.at(-1)).toMatchObject({version:'3.0.0',date:'2026-10-01'});
  const s=snapshot('2026-10-01',{'A.US':50,'B.SHG':100},['A.US']);
  expect(s).toMatchObject({date:'2026-10-01',methodVersion:'3.1.0',picks:{all:['A.US'],western:['A.US']},universe:{all:['A.US','B.SHG'],western:['A.US']}});
  expect(s.observations['A.US']).toMatchObject({price:50,priceDate:'2026-10-01',buyPrice:75,expectedReturn:.23,methodVersion:'3.1.0'});
 });
 it('writes once, accepts identical reordered content, and keeps the first record of a day when later content differs',()=>{
  const repo=mkdtempSync(path.join(tmpdir(),'value-forward-'));dirs.push(repo);
  const s=snapshot('2026-10-01',{'A.US':50},['A.US']);const file='forward/2026-10-01.json';
  writeOutput({repo,files:{[file]:s,'meta.json':{old:true}}});
  const bytes=readFileSync(path.join(repo,file),'utf8');
  utimesSync(path.join(repo,file),new Date('2000-01-01'),new Date('2000-01-01'));
  const mtime=statSync(path.join(repo,file)).mtimeMs;
  writeOutput({repo,files:{[file]:Object.fromEntries(Object.entries(s).reverse())}});
  expect(readFileSync(path.join(repo,file),'utf8')).toBe(bytes);
  expect(statSync(path.join(repo,file)).mtimeMs).toBe(mtime);
  writeOutput({repo,files:{'meta.json':{old:false},[file]:{...s,picks:{all:[],western:[]}}}});
  expect(readFileSync(path.join(repo,file),'utf8')).toBe(bytes);
  expect(JSON.parse(readFileSync(path.join(repo,'meta.json'),'utf8'))).toEqual({old:false});
  writeOutput({repo,files:{'forward/2026-10-02.json':snapshot('2026-10-02',{'A.US':51},[])}});
  expect(readFileSync(path.join(repo,file),'utf8')).toBe(bytes);
  expect(statSync(path.join(repo,file)).mtimeMs).toBe(mtime);
 });
});
describe('forward performance',()=>{
 it('retains all picks, enters new picks only after their first snapshot and compounds equal weights',()=>{
  const a=snapshot('2026-10-01',{'A.US':100,'B.SHG':100},['A.US']);
  const b=snapshot('2026-10-11',{'A.US':110,'B.SHG':200},['B.SHG']);
  const c=snapshot('2026-10-31',{'A.US':121,'B.SHG':100},[]);
  const record=computeForwardRecord([c,a,b]);
  expect(record.days).toBe(30);
  expect(record.all.priceReturn).toBeCloseTo(1.1*.8-1);
  expect(record.all.benchmarkPriceReturn).toBeCloseTo(1.55*.8-1);
  expect(record.western.priceReturn).toBeCloseTo(.21);
  expect(record.picks.find(p=>p.id==='B.SHG')).toMatchObject({firstDate:'2026-10-11',priceReturn:-.5});
  expect(record.picks.find(p=>p.id==='A.US')?.priceReturn).toBeCloseTo(.21);
 });
 it('does not drop missing holdings, seed quotes, currency changes or unknown dividend coverage',()=>{
  const a=snapshot('2026-10-01',{'A.US':100,'B.SHG':100},['A.US','B.SHG']);
  const b=snapshot('2026-10-31',{'A.US':110},[]);
  expect(computeForwardRecord([a,b]).all.priceReturn).toBeNull();
  expect(computeForwardRecord([a,b]).all.missingIds).toContain('B.SHG');
  expect(computeForwardRecord([a,b]).western.dividendReturn).toBeNull();
  b.observations['A.US'].currency='EUR';
  expect(computeForwardRecord([a,b]).western.priceReturn).toBeNull();
  b.observations['A.US'].currency='USD';a.observations['A.US'].seed=true;
  expect(computeForwardRecord([a,b]).western.priceReturn).toBeNull();
 });
 it('uses comparable dividend-inclusive levels only, and adjusts price returns for splits',()=>{
  const a=snapshot('2026-10-01',{'A.US':100},['A.US']);
  const b=snapshot('2026-10-31',{'A.US':55},[]);
  a.observations['A.US'].totalReturn={value:100,basis:'provider-2026'};
  b.observations['A.US'].totalReturn={value:112,basis:'provider-2026'};
  b.observations['A.US'].splitFactor=2;
  const r=computeForwardRecord([a,b]);
  expect(r.all.priceReturn).toBeCloseTo(.1);
  expect(r.all.dividendReturn).toBeCloseTo(.12);
  expect(r.picks[0].dividendReturn).toBeCloseTo(.12);
  b.observations['A.US'].totalReturn!.basis='restated';
  expect(computeForwardRecord([a,b]).all.dividendReturn).toBeNull();
 });
 it('hides the home line until 30 recorded days, not wall-clock days',()=>{
  const a=snapshot('2026-10-01',{'A.US':100},['A.US']);
  expect(forwardHeadline(computeForwardRecord([]),'western')).toBeNull();
  expect(forwardHeadline(computeForwardRecord([a]),'western')).toBeNull();
  expect(forwardHeadline(computeForwardRecord([a,snapshot('2026-10-30',{'A.US':105},[])]),'western')).toBeNull();
  expect(forwardHeadline(computeForwardRecord([a,snapshot('2026-10-31',{'A.US':110},[])]),'western')).toMatch(/Forward record.*30 days.*10/);
 });
 it('rejects duplicate dates and never fabricates missing portfolio returns',()=>{
  const a=snapshot('2026-10-01',{'A.US':100},[]);
  expect(()=>computeForwardRecord([a,a])).toThrow(/duplicate/i);
  expect(computeForwardRecord([a,snapshot('2026-10-31',{'A.US':110},[]) ]).all.priceReturn).toBe(0);
 });
});

it('leaves dividend-inclusive performance unavailable on the first day without dividend coverage',()=>{
 const record=computeForwardRecord([snapshot('2026-10-01',{'A.US':100},['A.US'])]);
 expect(record.all.dividendReturn).toBeNull();
 expect(record.all.benchmarkDividendReturn).toBeNull();
});

it('keeps exited members in the observation set and rejects future or invalid quotes',()=>{
 const prior=snapshot('2026-10-01',{'A.US':100,'B.SHG':100},['A.US']);
 const next=buildForwardSnapshot({date:'2026-10-02',universe:[company('B.SHG',false)],rows:[],previous:[prior],prices:{'A.US':[102,'2026-10-02'],'B.SHG':[999,'2026-10-03']}});
 expect(next.universe.all).toEqual(['B.SHG']);
 expect(next.observations['A.US']).toMatchObject({price:102,priceDate:'2026-10-02',name:'A.US'});
 expect(next.observations['B.SHG'].price).toBeNull();
 expect(computeForwardRecord([prior,next]).western.priceReturn).toBeCloseTo(.02);
 expect(computeForwardRecord([prior,next]).all.benchmarkPriceReturn).toBeNull();
});
