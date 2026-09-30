import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildOutput } from '@/lib/value/build-output';
import { bestWesternListing, compareWesternPriority } from '@/lib/value/western';
import { orderFundamentals } from '@/scripts/value/stages/fundamentals';
import { buildSearchShards, searchShard } from '@/lib/value/search';
import type { Analysis, Company, IndexRow, StoreMeta } from '@/lib/value/types';
const base=JSON.parse(readFileSync('tests/fixtures/value/store/dossiers/027.json','utf8'))['KO.US'] as Analysis;
const company=(id:string,listings=[id],cap=100):Company=>({...base.company,id,listings,marketCapUsd:cap});
describe('Western retail access',()=>{
 it('prefers a Western home, then US ADR, then a deterministic other venue',()=>{
  expect(bestWesternListing(company('ASML.AS',['ASML.US','ASML.AS']))).toBe('ASML.AS');
  expect(bestWesternListing(company('INFY.NSE',['INFY.F','INFY.US','INFY.NSE']))).toBe('INFY.US');
  expect(bestWesternListing(company('7203.JP',['7203.JP','TOYOF.US']))).toBe('TOYOF.US');
  expect(bestWesternListing(company('9984.JP',['9984.JP','SFTBY.US']))).toBe('SFTBY.US');
  expect(bestWesternListing(company('X.HK',['X.SW','X.F']))).toBe('X.F');
 });
 it.each(['US','TO','V','NEO','LSE','XETRA','F','PA','AS','BR','MC','MI','LS','VI','IR','CO','ST','HE','OL','WAR','SW','AU','NZ'])('allows %s',venue=>expect(bestWesternListing(company(`X.${venue}`))).toBe(`X.${venue}`));
 it.each(['SHG','SHE','JP','HK','NSE','TWO'])('excludes %s without a Western listing',venue=>expect(bestWesternListing(company(`X.${venue}`))).toBeNull());
 it('uses listings rather than domicile or an unlisted home id',()=>expect(bestWesternListing(company('X.US',['X.JP']))).toBeNull());
 it('prioritizes Western companies then cap even when recently fetched',()=>{
  const input=[company('X.JP',undefined,1e12),company('SMALL.US',undefined,10),company('ADR.JP',['ADR.JP','ADRYY.US'],100)];
  expect([...input].sort(compareWesternPriority).map(c=>c.id)).toEqual(['ADR.JP','SMALL.US','X.JP']);
  expect(orderFundamentals(input,new Map([['ADR.JP','2026-09-30']])).map(c=>c.id)).toEqual(['ADR.JP','SMALL.US','X.JP']);
 });
 it('publishes separate global and Western populations and the same w in dossiers',()=>{
  const analyses=['KO.US','7203.JP','INFY.NSE'].map(id=>({...base,id,company:company(id,id==='INFY.NSE'?[id,'INFY.US']:[id])}));
  const {files}=buildOutput({analyses,holdersByTicker:{},investorNames:{},fx:{}});
  const meta=files['meta.json'] as StoreMeta;
  expect(meta.funnel?.analysed).toBe(3);
  expect(meta.western?.funnel.analysed).toBe(2);
  expect(meta.western?.story.analysed).toBe(2);
  expect((files['index/US.json'] as IndexRow[]).map(r=>r.w)).toEqual([null,'INFY.US','KO.US']);
  const dossiers=Object.entries(files).filter(([f])=>f.startsWith('dossiers/')).flatMap(([,d])=>Object.values(d as Record<string,{id:string;w:string|null}>));
  expect(dossiers.find(d=>d.id==='INFY.NSE')?.w).toBe('INFY.US');
 });
 it('search keeps excluded companies with explicit access metadata',()=>{
  const shards=buildSearchShards([company('7203.JP'),company('INFY.NSE',['INFY.NSE','INFY.US'])],new Set());
  expect(searchShard(shards['72'],'7203')[0][5]).toBeNull();
  expect(searchShard(shards['in'],'INFY')[0][5]).toBe('INFY.US');
 });
});

import { westernHistory } from '@/lib/value/western-history';
import { summarizeSnapshots } from '@/lib/value/snapshots';
import { trackRecord } from '@/lib/value/time-travel';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarketScopeToggle } from '@/components/value/MarketScopeToggle';
import { BuyZone } from '@/components/value/BuyZone';
it('computes Western historical medians from eligible observations, preserving the global baseline',()=>{
 const rows:import('@/lib/value/types').SnapshotRow[]=[['KO.US','PPPPP',.5,true,.2],['X.JP','PPPPP',.5,true,9],['Y.US','FFFFF',2,false,.1]];
 const global={years:[2020],perYear:{2020:summarizeSnapshots(rows)}};
 const result=westernHistory(global,{2020:rows},new Set(['KO.US','Y.US']));
 expect(result.perYear).toEqual(global.perYear);
 expect(result.western?.perYear[2020]).toMatchObject({analysed:2,qualityPasses:1,atBuy:1,medianReturnAtBuy:.2,medianReturnAll:.15,returnCountAll:2});
 expect(trackRecord({...result,perYear:result.western!.perYear})?.buy).toBe(.2);
});
it('renders the independent all-markets toggle with an explicit default scope',()=>{
 const html=renderToStaticMarkup(createElement(MarketScopeToggle,{all:false,onChange:()=>{}}));
 expect(html).toContain('Show all markets');expect(html).toContain('Buyable in the West');
});
it('labels the alternate trading listing and keeps market-access footnotes out of the default view',()=>{
 const row={id:'INFY.NSE',n:'Infosys',w:'INFY.US',c:'IN',t:'PPPPP',st:'s',cur:'INR',v:null,mc:100,s:null,k:'operating',g:[],h:0,b:true} as IndexRow;
 const html=renderToStaticMarkup(createElement(BuyZone,{entries:[{row,quote:100,mos:.4}]}));
 expect(html).toContain('Buy as INFY on NYSE');expect(html).not.toContain('A-shares trade');
});

import { assertIndexConsistency } from '@/lib/value/consistency';
it('rejects Western aggregates that disagree with the eligible default rows',()=>{
 const {files}=buildOutput({analyses:[base],holdersByTicker:{},investorNames:{},fx:{}});
 const meta=files['meta.json'] as StoreMeta;
 const rows=files['index/default.json'] as IndexRow[];
 meta.western!.funnel.analysed++;
 expect(()=>assertIndexConsistency({meta,rows})).toThrow();
});
