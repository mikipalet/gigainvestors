import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {extractAmounts,monetaryCandidates} from '@/lib/value/thesis/amounts';
import {applyThesis} from '@/lib/value/thesis/apply';
import records from '../../fixtures/value/thesis/recorded-amounts.json';
import type {RawAnswer,Year} from '@/lib/value/types';
import type {ThesisAnswer,ThesisResult} from '@/lib/value/thesis/types';
const grade={version:'5',accuracy:1,n:9,positives:1,negatives:8};
describe('quantified guidance and liability extraction',()=>{
 for(const r of records)it(`replays actual typed amount responses for ${r.id}`,async()=>{
  const answers=structuredClone(r.before) as ThesisAnswer[];
  await extractAmounts(answers,r.currency,r.latest as Year|undefined,async({state,questions})=>{
   const call=r.calls.find(c=>c.stateHash===createHash('sha256').update(state).digest('hex'));
   expect(call).toBeDefined();expect(call!.questions).toEqual(questions);
   return {answers:call!.answers as Record<string,RawAnswer>};
  });
  expect(answers).toEqual(r.after);
 });
 it('reads table amounts in the table’s stated units',()=>{
  expect(monetaryCandidates('(Dollars in Millions) Merchant processing 456 51 156,990')).toContainEqual({raw:'156,990 (Dollars in Millions)',value:156990000000,percent:false});
 });
 it('applies recorded guidance to earnings, FX and expected return without a second haircut',()=>{
  const record=records.find(r=>r.id==='BRBY-2024')!;
  const result={id:'BRBY.LSE',version:'5',asOf:'2024-01-12',answers:record.after} as ThesisResult;
  const v:any={method:'owner_earnings',currency:'GBP',normalized:100,netCash:200,shares:10,perShare:{low:80,mid:100,high:120},perShareTrading:{currency:'GBX',fxRate:100,low:8000,mid:10000,high:12000},equityBondYield:.1,bridge:[{label:'= owner earnings',value:100}],assumptions:[]};
  const a:any={id:result.id,asOf:result.asOf,valuation:v};
  const revised=applyThesis(a,result,{thesis_guidance:grade});
  expect(revised.valuation!.normalized).toBeCloseTo(100*410/634);
  expect(revised.valuation!.perShare.mid).toBeCloseTo(20+80*410/634);
  expect(revised.thesis?.guidance?.evidence.url).toContain('burberry');
  const fixed=structuredClone(result);fixed.answers.find(a=>a.guidance)!.guidance!.priorOwnerEarnings=100;
  expect(applyThesis({...a,valuation:{...v,normalized:60}},fixed,{thesis_guidance:grade}).valuation!.normalized).toBe(60);
  expect(applyThesis(a,{...result,asOf:'2023-01-01'},{thesis_guidance:grade})).toBe(a);
  expect(applyThesis(a,result,{})).toBe(a);
 });
});
