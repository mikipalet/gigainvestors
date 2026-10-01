import {it,expect} from 'vitest';
import {compactJudgement} from '../../../lib/value/judgement/presentation';
import type {TestOutcome} from '../../../lib/value/types';
it('shows the latest upkeep explanation once instead of yearly adjustments',()=>{
 const test={key:'economics',result:'pass',judgement:{reason:'Long explanation',result:'pass',override:true}} as TestOutcome;
 const evidence={quote:'Most spending expands AI infrastructure.',url:'https://example.com',filed:'2026',section:'mdna'};
 const adjustments=[2023,2025,2024].map(fy=>({test:'economics' as const,field:'maintenanceCapex',fy,before:90e9,after:21e9,reason:`FY${fy} upkeep ≈ depreciation USD 21bn.`,evidence}));
 expect(compactJudgement(test,adjustments,'USD')).toBe('Judgement: passes — spending builds AI capacity, upkeep ≈ depreciation.');
});
import {validShortText,selectShortText} from '../../../lib/value/judgement/short-text';
it('rejects long prose, multiple sentences and numbers absent from the passage',()=>{
 expect(validShortText('It sells ads to advertisers.','Advertising products for advertisers')).toBe(true);
 expect(validShortText('Revenue grew 20%.','Revenue grew 10%.')).toBe(false);
 expect(validShortText('Owns two factories.','Owns one factory.')).toBe(false);
 expect(validShortText('It sells ads. It also sells hardware.','ads hardware')).toBe(false);
 expect(validShortText('It sells ads to advertisers across a very large range of different services around the world.','ads')).toBe(false);
});
it('suppresses a selected sentence when the independent support check rejects it',async()=>{
 const evidence={quote:'May lose customers.',url:'https://example.com',filed:'2026',section:'risk'};
 const ask:import('../../../lib/value/thesis/evidence').Ask=async({questions})=>{const answers:Record<string,import('../../../lib/value/types').RawAnswer>=questions.sentence?{sentence:{type:'choice',choice:'s0',confidence:1,probabilities:{s0:1,none:0}}}:{supported:{type:'noul',noul:.1}};return {answers};};
 expect(await selectShortText(evidence,['Customers are leaving.'],ask)).toBeNull();
});

import {businessLines} from '../../../lib/value/flags/presentation';
import {sourceSentences} from '../../../lib/value/judgement/source-sentences';
import type {Analysis} from '../../../lib/value/types';
it('never falls back to a raw company description or filing passage',()=>{
 expect(businessLines({company:{description:'Long raw filing passage.'}} as Analysis)).toEqual([]);
});
it('offers a concise sourced predicate when a long legal name prevents a fifteen-word sentence',()=>{
 const quote='Kimberly-Clark de México, together with its subsidiaries, manufactures, distributes, and sells disposable products in Mexico.';
 expect(sourceSentences(quote)).toContain('The company manufactures, distributes, and sells disposable products in Mexico.');
 expect(sourceSentences(quote.replace('Kimberly-Clark de México','Kimberly-Clark de México, S. A. B. de C. V.')).some(s=>/^V\.,/.test(s))).toBe(false);
});
import calibration from '../../fixtures/value/judgement/short-text-calibration.json';
it('replays recorded sentence selection and support validation, including adversarial claims',async()=>{
 for(const row of calibration){
  let i=0;
  const answer=await selectShortText({quote:row.quote,url:'https://example.com/calibration',section:'test',filed:'2026-10-01'},[row.sentence],async input=>{
   const recording=row.recordings[i++];expect(input).toEqual({state:recording.state,questions:recording.questions});
   return {answers:recording.answers as unknown as Record<string,import('../../../lib/value/types').RawAnswer>};
  });
  expect(Boolean(answer)).toBe(row.accepted);
  if(!row.expected)expect(answer).toBeNull();
 }
});
