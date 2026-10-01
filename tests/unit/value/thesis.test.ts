import { describe, expect, it } from 'vitest';
import { thesisDecision, guidedValuation, questionTrusted, thesisTriggers } from '@/lib/value/thesis/decision';
import type { ThesisAnswer } from '@/lib/value/thesis/types';

const answer = (id: ThesisAnswer['id'], value: ThesisAnswer['value'] = 'yes'): ThesisAnswer => ({
  id, version:'2', value, evidence:{quote:'We have suspended our dividend.',url:'https://example.com/filing',filed:'2026-09-01',section:'interim'},
});
const trust = {version:'2',accuracy:0.9,n:10,positives:3,negatives:7};

describe('filing-grounded thesis decisions',()=>{
 it('requires current calibration, positive cases and at least 90% accuracy',()=>{
  expect(questionTrusted('2',trust)).toBe(true);
  expect(questionTrusted('3',trust)).toBe(false);
  expect(questionTrusted('2',{...trust,accuracy:0.89})).toBe(false);
  expect(questionTrusted('2',{...trust,positives:0})).toBe(false);
 });
 it('excludes only a trusted affirmative with filing evidence',()=>{
  expect(thesisDecision([answer('thesis_distress')],{thesis_distress:trust}).changed).toBe(true);
  expect(thesisDecision([answer('thesis_distress')],{}).changed).toBe(false);
  expect(thesisDecision([{...answer('thesis_distress'),evidence:null}],{thesis_distress:trust}).changed).toBe(false);
  expect(thesisDecision([answer('thesis_structural','unclear')],{thesis_structural:trust}).changed).toBe(false);
  expect(thesisDecision([answer('thesis_guidance')],{thesis_guidance:trust}).changed).toBe(false);
 });
 it('selects strict drawdown/provision thresholds independently of a buy decision',()=>{
  expect(thesisTriggers({buy:false,next:false,quality:true,drawdown:0.41,financial:false,charges:[]})).toEqual(['drawdown']);
  expect(thesisTriggers({buy:false,next:false,quality:true,drawdown:0.4,financial:false,charges:[]})).toEqual([]);
  expect(thesisTriggers({buy:false,next:false,quality:false,drawdown:null,financial:true,charges:[{amount:11,marketValue:100}]})).toEqual(['financial_charges']);
  expect(thesisTriggers({buy:false,next:false,quality:false,drawdown:null,financial:true,charges:[{amount:10,marketValue:100}]})).toEqual([]);
 });
 it('lowers owner earnings and all scenarios without scaling away excess cash',()=>{
  const v:any={method:'owner_earnings',normalized:100,netCash:200,shares:10,perShare:{low:80,mid:100,high:120},perShareTrading:{currency:'GBX',fxRate:100,low:8000,mid:10000,high:12000},equityBondYield:.1,bridge:[{label:'= owner earnings',value:100}],assumptions:[]};
  const revised=guidedValuation(v,70,'Guided operating profit decline: 30%.');
  expect(revised.normalized).toBe(70);
  expect(revised.perShare.mid).toBe(76);
  expect(revised.perShareTrading?.mid).toBe(7600);
  expect(revised.bridge.find(x=>x.label==='= owner earnings')?.value).toBe(70);
  expect(v.normalized).toBe(100);
  expect(guidedValuation(v,120,'growth')).toBe(v);
 });
});
