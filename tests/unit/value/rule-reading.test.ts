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
it('the tile sentence states the rules that decide its verdict',()=>{
 const t=runNumericTests({years:makeYears(),kind:'operating'}).moat;
 const test={...t,result:t.numeric,jev:[]} as TestOutcome;
 expect(tileSentence(test,primaryTileMetric(test,'operating'),'operating')).toBe(ruleReading(test,'operating').sentence);
});
const store=process.env.VALUE_TEST_STORE??'.audit/staging/store';
it.skipIf(!existsSync(store+'/dossiers'))('derives every published quality verdict from its displayed rules and measurements',()=>{
 const dossiers=Object.assign({},...readdirSync(store+'/dossiers').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(store+'/dossiers/'+f,'utf8'))));
 let tested=0;
 for(const d of Object.values(dossiers) as any[])for(const t of Object.values(d.tests) as TestOutcome[]){
  if(t.key==='price'||!['pass','fail'].includes(t.result))continue;
  const reading=ruleReading(t,d.company.kind);expect(reading.derived,`${d.id} ${t.key}: ${reading.sentence}`).toBe(t.result);
  const sentence=tileSentence(t,primaryTileMetric(t,d.company.kind),d.company.kind);
  expect(sentence).toBe(reading.sentence);
  const count=sentence.match(/(\d+)\/(\d+) applied checks met/),warnings=sentence.match(/(\d+) warnings \(2 fail/);
  const displayed=count?(Number(count[1])===Number(count[2])?'pass':'fail')
   :warnings?(Number(warnings[1])>=2||sentence.includes('Cash backing no;')?'fail':'pass')
   :sentence.includes('Judgement override: pass')?'pass'
   :sentence.includes('Judgement override: fail')||sentence.startsWith('Filing rule fails:')?'fail':null;
  expect(displayed,`${d.id} ${t.key}: verdict must follow the displayed sentence`).toBe(t.result);tested++;
 }
 expect(tested).toBeGreaterThan(0);
});

it('retains enough precision to explain a near-threshold failure',()=>{
 const t={key:'moat',result:'fail',numeric:'fail',metrics:{roicMedian:.149999,roicSecondLowest:.11,grossMarginDrop:0},series:{},reasons:[],jev:[]} as TestOutcome;
 expect(ruleReading(t,'operating').sentence).toContain('14.9999% < 15%');
});
