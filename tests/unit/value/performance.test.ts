import {gzipSync} from 'node:zlib';
import {canPrefetch} from '@/lib/value/prefetch';
import { cachedValueHits,primeValueSearch } from '@/lib/search/value-source';
import { browserRow,historyView,unpackView,type BrowserPayload } from '@/lib/value/browser-view';
import { publishedBuyPrice } from '@/lib/value/buy-price';
import { publicAnalysis } from '@/lib/value/public-analysis';
import { publishViews } from '@/lib/value/publish-views';
import { edinetShareObservation,reconcileShares } from '@/lib/value/share-check';
import type { Dossier,IndexRow } from '@/lib/value/types';
import { describe,expect,it } from 'vitest';

const row: IndexRow = {id:'KO.US',n:'Coca-Cola',c:'US',s:'Consumer',k:'operating',mc:100,v:[80,100,120],cur:'USD',t:'PPPPP',g:[],h:2,st:'s',w:'KO.US',b:true,lg:'https://eodhd.com/img/logos/US/KO.png'};
describe('browser data contract', () => {
 it('keeps search verdicts and ratios available from the already loaded view',()=>{
  primeValueSearch([browserRow(row,[50,'2026-09-30'])]);
  expect(cachedValueHits('coca')[0]).toMatchObject({tests:'PPPPP',holders:2,ratio:.5});
  expect(cachedValueHits('KO')[0]?.row[0]).toBe('KO.US');
 });
 it('retains missing-data companies for country filters without country-shard requests',()=>{
  const missing={...row,id:'NEW.US',st:'i',t:'UUUUU',b:false,v:null};
  const files:Record<string,unknown>={'meta.json':{},'index/default.json':[row],'index/US.json':[row,missing]};
  const manifest=publishViews(files);
  expect([manifest.current,...manifest.deferred!].flatMap(file=>unpackView(files[file] as BrowserPayload)).map(r=>r.id)).toEqual(['KO.US','NEW.US']);
 });
 it('embeds quotes and omits server-only valuation inputs and private flags', () => {
  const compact=browserRow({...row,dataQualityFlags:['needs verification']},[50,'2026-09-30']);
  expect(compact.quote).toEqual([50,'2026-09-30']);
  expect(compact.v).toBeNull();
  expect(compact.b).toBe(false);
  expect(JSON.stringify(compact)).not.toMatch(/dataQualityFlags|verification|ownerReturnInputs/);
 });
 it('retains historical price and discount for the main distance scale',()=>{
  const price={price:90,buyPrice:50,discount:.5};
  expect(historyView([['KO.US','PPPPP',.9,false,1,price]],[row])[0].historicalPrice).toEqual(price);
 });
 it('delivers complete historical identities and only the cohorts shown by the view', () => {
  const view=historyView([['KO.US','PPPPP',0.5,true,1],['FAIL.US','FFFFF',2,false,0]], [row]);
  expect(view).toHaveLength(1);
  expect(view[0]).toMatchObject({id:'KO.US',n:'Coca-Cola',lg:row.lg,c:'US',pm:0.5,gain:1,b:true});
  expect(view[0].v).toBeNull();
  expect(view[0].quote).toBeNull();
 });
});
describe('private share resolution', () => {
 it('does not subtract year-end treasury from post-cancellation filing-date issued shares',()=>{
  const year={end:'2026-03-31',edinetShares:{issued:21829775,filing:20529775,treasury:3372800,filed:'2026-06-24'}} as import('@/lib/value/types').Year;
  expect(edinetShareObservation(year)).toMatchObject({shares:18456975,date:'2026-03-31'});
 });
 it('does not re-open a resolved share case solely because a company is expensive',()=>{
  const result=publishedBuyPrice({st:'s',t:'PPPPP',v:[1.3,1.75,2],m:.25,shareSources:2},[35.41,'2026-09-29']);
  expect(result.b).toBe(false);
  expect(result.result).toBe('fail');
  expect(result.dataQualityFlags).toEqual([]);
 });
 it('never counts same-provider history or an implied market cap as independent proof',()=>{
  expect(reconcileShares([{source:'eodhd:annual',shares:100},{source:'eodhd:quarterly',shares:100}]).status).toBe('pending');
  expect(reconcileShares([{source:'eodhd',shares:100},{source:'market-cap',shares:100,corroborationOnly:true}]).status).toBe('pending');
 });
 it('keeps incompatible listing bases unresolved',()=>{
  expect(reconcileShares([{source:'sec',shares:100,basis:'ordinary shares'},{source:'yahoo',shares:100,basis:'ADRs'}]).status).toBe('pending');
 });
 it('uses the newest dated agreeing pair across source histories',()=>{
  const check=reconcileShares([{source:'sec:annual',shares:100,date:'2025-12-31'},{source:'yahoo:old',shares:101,date:'2026-01-02'},{source:'sec:quarterly',shares:90,date:'2026-06-30'},{source:'yahoo:new',shares:91,date:'2026-07-02'}]);
  expect(check.shares).toBe(91);
 });
 it('accepts two independent agreeing sources despite an older discrepant provider', () => {
  expect(reconcileShares([{source:'eodhd',shares:10},{source:'sec',shares:100},{source:'yahoo',shares:101}]).status).toBe('verified');
 });
 it('does not treat multiple facts from the same provider as independent', () => {
  expect(reconcileShares([{source:'yahoo',shares:100},{source:'yahoo',shares:101}]).status).toBe('pending');
 });
 it('publishes unresolved companies in the neutral missing-valuation state', () => {
  const d={id:'KO.US',valuation:{assumptions:['Share count being checked']},dataQualityFlags:['needs verification'],b:true,valueHistory:[[2025,1,2,3]],tests:{}} as unknown as Dossier;
  const result=publicAnalysis(d);
  expect(result.valuation).toBeNull();
  expect(result.b).toBe(false);
  expect(result.valueHistory).toEqual([]);
  expect(JSON.stringify(result)).not.toMatch(/dataQualityFlags|verification|being checked/i);
 });
});

describe('bounded browser cohorts',()=>{
 it('keeps the initial current view small and defers other filter cohorts losslessly',()=>{
  const rows=Array.from({length:2000},(_,i)=>({...row,id:`C${i}.US`,n:`Company ${i}`,t:i<5?'PPPPP':'PPFPP',b:i<5}));
  const files:Record<string,unknown>={'meta.json':{},'index/default.json':rows};
  const manifest=publishViews(files);
  const first=unpackView(files[manifest.current] as BrowserPayload);
  expect(first).toHaveLength(5);
  for(const file of [manifest.current,...manifest.deferred!])expect(gzipSync(JSON.stringify(files[file])).length).toBeLessThanOrEqual(80_000);
  const deferred=manifest.deferred!.flatMap(file=>unpackView(files[file] as BrowserPayload));
  expect([...first,...deferred].map(r=>r.id).sort()).toEqual(rows.map(r=>r.id).sort());
 });
});

it('never prefetches on Save-Data or slow connections',()=>{for(const effectiveType of ['slow-2g','2g','3g'])expect(canPrefetch({effectiveType})).toBe(false);expect(canPrefetch({saveData:true,effectiveType:'4g'})).toBe(false);expect(canPrefetch({effectiveType:'4g'})).toBe(true);expect(canPrefetch()).toBe(true);});
