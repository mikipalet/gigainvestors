import {describe,it,expect} from 'vitest';
import {computeFlags} from '../../../lib/value/flags/compute';
import {resolveCounterparty,confirmRelationships,relationshipConcentrations} from '../../../lib/value/flags/relationships';
import {trustedExtraction} from '../../../lib/value/flags/trust';
import type {Observation,Relationship} from '../../../lib/value/flags/types';
const evidence={quote:'Capital expenditures 240; depreciation 100.',url:'https://www.sec.gov/Archives/example.htm',filed:'2026-02-01',section:'Cash flows'};
const obs=(metric:string,value:number,fy=2025):Observation=>({metric,value,fy,currency:'USD',evidence});
describe('evidence-backed business flags',()=>{
 it('computes capex intensity and rising trend from consecutive comparable periods',()=>{
  const flags=computeFlags([obs('capex',240),obs('depreciation',100),obs('capex',150,2024),obs('depreciation',100,2024)]);
  expect(flags.find(f=>f.kind==='capital-intensity')).toMatchObject({tone:'neutral',label:'Capex 2.4× depreciation',series:[[2024,1.5],[2025,2.4]]});
 });
 it('refuses zero denominators and evidence-free inputs',()=>{
  expect(computeFlags([obs('capex',240),obs('depreciation',0)])).toEqual([]);
  expect(computeFlags([{...obs('cash',700),evidence:{...evidence,quote:''}},obs('debt',100)])).toEqual([]);
 });
 it('never joins different currencies or non-consecutive years into growth',()=>{
  expect(computeFlags([obs('capex',240),{...obs('depreciation',100),currency:'EUR'}])).toEqual([]);
  expect(computeFlags([obs('receivables',200),obs('revenue',300),obs('receivables',100,2023),obs('revenue',290,2023)])).toEqual([]);
 });
 it('uses explicit debt maturities, never current debt as a two-year proxy',()=>{
  expect(computeFlags([obs('cash',10),obs('current-debt',30)])).toEqual([]);
  expect(computeFlags([obs('cash',10),obs('debt-due-2y',30)]).map(f=>f.kind)).toEqual(['near-debt']);
 });
 it('only flags working capital when it materially outruns sales',()=>{
  const f=computeFlags([obs('revenue',110),obs('revenue',100,2024),obs('inventory',150),obs('inventory',100,2024)]);
  expect(f[0]).toMatchObject({kind:'inventory-growth',tone:'red'});
  expect(f[0].label).toContain('50%');
 });
 it('requires known positives and negatives, matching version and >= .9 calibration and confidence',()=>{
  const grade={version:'v1',accuracy:.9,n:10,positive:5,negative:5};
  expect(trustedExtraction({version:'v1',confidence:.95,evidence},grade)).toBe(true);
  for(const g of [{...grade,negative:0},{...grade,accuracy:.89},{...grade,version:'v0'}])expect(trustedExtraction({version:'v1',confidence:.99,evidence},g)).toBe(false);
 });
});
const companies=[{id:'MSFT.US',name:'Microsoft Corporation',aliases:['Microsoft'],logo:null},{id:'AAPL.US',name:'Apple Inc.',aliases:['Apple'],logo:null}];
const edge=(from:string,to:string,type:Relationship['type'],disclosedBy:string):Relationship=>({id:from+to+disclosedBy,from,to,name:to,type,evidence:[{...evidence,disclosedBy}],status:'one-sided'});
describe('disclosed relationships',()=>{
 it('maps unambiguous aliases but leaves unresolved names external',()=>{
  expect(resolveCounterparty('Microsoft Corp.',companies,'ORCL.US').id).toBe('MSFT.US');
  expect(resolveCounterparty('OpenAI',companies,'ORCL.US').id).toBe('external:openai');
  expect(resolveCounterparty('Customer A',companies,'ORCL.US').id).not.toBe(resolveCounterparty('Customer A',companies,'NVDA.US').id);
 });
 it('confirms only the same directional relationship disclosed by both counterparties',()=>{
  const rows=confirmRelationships([edge('MSFT.US','ORCL.US','customer','MSFT.US'),edge('MSFT.US','ORCL.US','customer','ORCL.US')]);
  expect(rows).toHaveLength(1);expect(rows[0].status).toBe('confirmed');
  expect(confirmRelationships([edge('MSFT.US','ORCL.US','customer','MSFT.US'),edge('ORCL.US','MSFT.US','customer','ORCL.US')]).every(r=>r.status==='one-sided')).toBe(true);
 });
});

it('does not confuse Wikidata with a second filing confirmation',()=>{
 const wiki=edge('MSFT.US','ORCL.US','customer','ORCL.US');wiki.evidence[0].url='https://www.wikidata.org/wiki/Q1';
 expect(confirmRelationships([edge('MSFT.US','ORCL.US','customer','MSFT.US'),wiki])[0].status).toBe('one-sided');
});
it('adds only explicitly separate contingent exposures, preserving their evidence',()=>{
 const flag=computeFlags([obs('financial-guarantees',5.7e9),obs('credit-derivatives',16.9e9)])[0];
 expect(flag.label).toBe('Credit backstops USD 22.6bn max');expect(flag.series).toEqual([[2025,22.6e9]]);
 expect(computeFlags([obs('financial-guarantees',5.7e9)])).toEqual([]);
});
it('will not sum partial commitments or treat a venture commitment as the whole company',()=>{
 expect(computeFlags([obs('purchase-obligations',40),obs('lease-commitments',30),obs('owner-earnings',10)])).toEqual([]);
 expect(computeFlags([obs('venture-uncommenced-leases',12.31e9)])[0].label).toBe('Venture leases USD 12.3bn');
});

it('derives concentration only on the side whose revenue or backlog was disclosed',()=>{
 const r={...edge('SWKS.US','AAPL.US','customer','SWKS.US'),name:'Apple',percent:.67,metric:'revenue' as const,period:'2025-09-30'};
 expect(relationshipConcentrations([r],'SWKS.US')[0].label).toBe('Apple: 67% of revenue');
 expect(relationshipConcentrations([r],'AAPL.US')).toEqual([]);
});
