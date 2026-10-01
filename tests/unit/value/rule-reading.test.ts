import {it,expect} from 'vitest';
import {ruleReading} from '@/lib/value/rule-reading';
import {runNumericTests} from '@/lib/value/tests';
import {makeYears} from './synthetic';
import type {TestOutcome} from '@/lib/value/types';
it('explains the actual moat rule, independently of the including-acquisitions chart',()=>{
 const t=runNumericTests({years:makeYears(),kind:'operating'}).moat;
 const test={...t,result:t.numeric,jev:[],metrics:{...t.metrics,totalRoicMedian:.168}} as TestOutcome;
 const reading=ruleReading(test,'operating');
 expect(reading.derived).toBe(test.result);
 expect(reading.sentence).toContain('ex acquisitions');
 expect(reading.sentence).toContain('one bad year allowed');
 test.result=test.result==='pass'?'fail':'pass';
 expect(ruleReading(test,'operating').derived).not.toBe(test.result);
});
import {tileSentence,primaryTileMetric} from '@/lib/value/tile-metric';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
it('the tile explains the numbers in plain language',()=>{
 const t=runNumericTests({years:makeYears(),kind:'operating'}).moat;
 const test={...t,result:t.numeric,jev:[]} as TestOutcome;
 expect(tileSentence(test,primaryTileMetric(test,'operating'),'operating')).not.toMatch(/[≤≥;]|applied checks|Judgement override/);
 expect(primaryTileMetric(test,'operating').series).toEqual(test.series.roic);
});
const store=process.env.VALUE_TEST_STORE??'.audit/staging/store';
it.skipIf(!existsSync(store+'/dossiers'))('derives every published quality verdict from its displayed rules and measurements',()=>{
 const dossiers=Object.assign({},...readdirSync(store+'/dossiers').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(store+'/dossiers/'+f,'utf8'))));
 let tested=0;
 for(const d of Object.values(dossiers) as any[])for(const t of Object.values(d.tests) as TestOutcome[]){
  if(t.key==='price'||!['pass','fail'].includes(t.result))continue;
  const reading=ruleReading(t,d.company.kind);expect(reading.derived,`${d.id} ${t.key}: ${reading.sentence}`).toBe(t.result);
  expect(reading.checks.some(c=>c.pass!==null)).toBe(true);
  tested++;
 }
 expect(tested).toBeGreaterThan(0);
});

it('retains enough precision to explain a near-threshold failure',()=>{
 const t={key:'moat',result:'fail',numeric:'fail',metrics:{roicMedian:.149999,roicSecondLowest:.11,grossMarginDrop:0},series:{},reasons:[],jev:[]} as TestOutcome;
 expect(ruleReading(t,'operating').sentence).toContain('14.9999% < 15%');
});

import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JudgementLine} from '@/components/value/BusinessSection';
it('hides a judgement that did not override the numbers',()=>{
 const test={key:'moat',judgement:{result:'pass',override:false,reason:'The numbers pass.'}} as TestOutcome;
 expect(renderToStaticMarkup(React.createElement(JudgementLine,{test,onExplain:()=>{}}))).toBe('');
});
it('shows the rule basis even when acquired capital earns a different return',()=>{
 const test={key:'moat',metrics:{roicMedian:.424,totalRoicMedian:.228},series:{roic:[[2024,.334],[2025,.514]],totalRoic:[[2024,.156],[2025,.30]]}} as unknown as TestOutcome;
 const metric=primaryTileMetric(test,'operating');
 expect(metric.value).toBe(.424);expect(metric.series).toEqual([[2024,.334],[2025,.514]]);
 expect(metric.chart).toContain('excluding acquisitions');
});

it('preserves a cash-conversion shortfall that would round to the minimum',()=>{
 const test={key:'economics',result:'fail',numeric:'fail',metrics:{oeToNi:.79999},series:{},reasons:[],jev:[]} as TestOutcome;
 expect(tileSentence(test,primaryTileMetric(test,'operating'),'operating')).toContain('$0.79999');
});
it('does not substitute parent cash history for a consolidated rule',()=>{
 const test={key:'economics',metrics:{oeToNi:.9,consolidatedCashConversion:1},series:{ownerEarnings:[[2025,50]]}} as unknown as TestOutcome;
 const metric=primaryTileMetric(test,'operating',[[2025,100]]);
 expect(metric.series).toEqual([]);expect(metric.value).toBe(.9);expect(metric.label).toContain('consolidated');
});
it('shows only the five years used for operating cash conversion',()=>{
 const test={key:'economics',metrics:{oeToNi:.9},series:{ownerEarnings:[[2020,1],[2021,2],[2022,3],[2023,4],[2024,5],[2025,6]]}} as unknown as TestOutcome;
 const metric=primaryTileMetric(test,'operating',[[2020,2],[2021,2],[2022,2],[2023,2],[2024,2],[2025,2]]);
 expect(metric.series).toEqual([[2021,1],[2022,1.5],[2023,2],[2024,2.5],[2025,3]]);
});
