import { describe, it, expect } from 'vitest';
import { applyAdjustments, trustedReading, returnRange } from '../../../lib/value/judgement/apply';
import { ownerEarningsBridge } from '../../../lib/value/owner-earnings';
import type { Year } from '../../../lib/value/types';
const evidence={quote:'We invest primarily to expand capacity.',url:'https://example.com/annual',section:'mdna',filed:'2026-02-05'};
const reading={id:'capex',version:'1',value:'growth',confidence:.99,evidence};
const trust={capex:{version:'1',accuracy:1,n:10,positive:5,negative:5}};
const year={fy:2025,end:'2025-12-31',da:20,capex:90,netIncome:100,sbc:10,revenue:300,ppe:200,totalNetIncome:100} as Year;
describe('evidence-backed judgement',()=>{
 it('lets trusted growth capex affect owner earnings and explains the adjustment',()=>{
  const r=applyAdjustments([year],{id:'X.US',version:'1',readings:[reading]},trust,'USD');
  expect(ownerEarningsBridge(r.years)[0].maintenanceCapex).toBe(20);
  expect(ownerEarningsBridge(r.years)[0].value).toBe(100);
  expect(r.adjustments[0].reason).toContain('upkeep');
 });
 it('does not trust uncalibrated, stale-version or unevidenced readings',()=>{
  expect(trustedReading(reading,{})).toBe(false);
  expect(trustedReading({...reading,version:'2'},trust)).toBe(false);
  expect(trustedReading({...reading,evidence:null},trust)).toBe(false);
  expect(trustedReading(reading,{capex:{...trust.capex,negative:0}})).toBe(false);
 });
 it('never changes financial inputs without trusted evidence or outside the filing period',()=>{
  expect(applyAdjustments([year],{id:'X',version:'1',readings:[reading]}, {},'USD').years[0].maintenanceCapexJudgement).toBeUndefined();
  expect(applyAdjustments([{...year,fy:2020,end:'2020-12-31'}],{id:'X',version:'1',readings:[{...reading,period:'2025-12-31'}]},trust,'USD').adjustments).toEqual([]);
 });
 it('uses the higher disclosed maintenance figure',()=>{
  const r=applyAdjustments([{...year,disclosedMaintenanceCapex:30}],{id:'X',version:'1',readings:[reading]},trust,'USD');
  expect(ownerEarningsBridge(r.years)[0].maintenanceCapex).toBe(30);
 });
 it('gives a plain rounded range',()=>expect(returnRange(.173)).toBe('about 15–20% a year'));
});

import { attachJudgements } from '../../../lib/value/judgement/apply';
import { readBusiness, classify } from '../../../lib/value/judgement/read';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BusinessSection, JudgementLine } from '../../../components/value/BusinessSection';
import type { Analysis, TestOutcome } from '../../../lib/value/types';
const calibration=JSON.parse(readFileSync('tests/fixtures/value/judgement/recorded-jev.json','utf8'));
it('replays actual Jev responses and recomputes calibration agreement',async()=>{
 const scores:Record<string,{n:number;correct:number}>={};
 for(const c of calibration.results){
  const result=await classify(c.topic,c.evidence,async input=>{
   expect(input).toEqual({state:c.recording.state,questions:c.recording.questions});
   return {answers:c.recording.answers};
  });
  expect(result.reading).toEqual(c.reading);
  const score=scores[c.topic]??={n:0,correct:0};score.n++;score.correct+=Number(result.reading.value===c.expected);
 }
 for(const [id,s]of Object.entries(scores))expect(s.correct/s.n).toBe(calibration.trust[id].accuracy);
});
it('keeps a sizeable shortfall, missing cash flow and other failed checks from being waived',()=>{
 const record={id:'X',version:'1',readings:[reading]};
 const adjustments=applyAdjustments([year],record,trust,'USD').adjustments;
 for(const metrics of [{oeToNi:.69},{oeToNi:null}]){
  const t={key:'economics',numeric:'fail',result:'fail',metrics,reasons:['owner earnings cash conversion below threshold'],series:{},jev:[]} as TestOutcome;
  expect(attachJudgements({tests:{economics:t}} as Analysis,record,trust,adjustments).tests.economics.result).toBe('fail');
 }
 const t={key:'economics',numeric:'fail',result:'fail',metrics:{oeToNi:.75},reasons:['working capital as a share of revenue rose more than 10pp and ends positive'],series:{},jev:[]} as TestOutcome;
 expect(attachJudgements({tests:{economics:t}} as Analysis,record,trust,adjustments).tests.economics.result).toBe('fail');
});
it('never waives even a small shortfall after evidenced input adjustments',()=>{
 const record={id:'X',version:'1',readings:[reading]};
 const t={key:'economics',numeric:'fail',result:'fail',metrics:{oeToNi:.75},reasons:['owner earnings cash conversion below threshold'],series:{},jev:[]} as TestOutcome;
 const out=attachJudgements({tests:{economics:t}} as Analysis,record,trust,applyAdjustments([year],record,trust,'USD').adjustments);
 expect(out.tests.economics.numeric).toBe('fail');expect(out.tests.economics.result).toBe('fail');
 const html=renderToStaticMarkup(createElement(JudgementLine,{test:out.tests.economics}));
 expect(html).not.toContain('Judgement: passes');
});
it('does not publish untrusted business answers',()=>{
 const out=attachJudgements({tests:{},company:{}} as Analysis,{id:'X',version:'1',readings:[{...reading,id:'pricing',value:'demonstrated'}]},trust,[]);
 const html=renderToStaticMarkup(createElement(BusinessSection,{analysis:out}));
 expect(html).toBe('');expect(html).not.toContain('Pricing power');
});
it('never invents a quote when the selector chooses none',async()=>{
 const out=await readBusiness([{...evidence,quote:'',text:evidence.quote,section:'mdna'}],async()=>({answers:{passage:{type:'choice',choice:'none',confidence:1,probabilities:{none:1}}}}));
 expect(out.readings).toEqual([]);
});

import { reportedAdjustmentFacts } from '../../../lib/value/judgement/amounts';
it('reads only unambiguous year-specific reported amounts',()=>{
 const text='In 2025, maintenance capital expenditure was USD 30 million.';
 const source={...evidence,text,quote:''};
 expect(reportedAdjustmentFacts([source],'USD')).toMatchObject([{fy:2025,field:'disclosedMaintenanceCapex',value:30e6}]);
 expect(reportedAdjustmentFacts([{...source,text:text+' In 2024 it was USD 25 million.'}],'USD')).toEqual([]);
 expect(reportedAdjustmentFacts([source],'EUR')).toEqual([]);
 expect(reportedAdjustmentFacts([{...source,text:'In 2026, we expect maintenance capex of USD 30 million.'}],'USD')).toEqual([]);
});
it('excludes a labelled charge only from margin stability and leaves actual income alone',()=>{
 const r={id:'oneoff',version:'1',value:'nonrecurring',confidence:.99,evidence:{...evidence,quote:'In 2025 the non-recurring operating charge was USD 10 million.'}};
 const record={id:'X',version:'1',readings:[r]};
 const y={...year,operatingIncome:40e6,nonRecurring:10e6,provenance:{nonRecurring:{source:evidence.url,field:r.evidence.quote,method:'reported' as const}}};
 const out=applyAdjustments([y],record,{oneoff:{...trust.capex}},'USD');
 expect(out.years[0].marginOperatingIncomeJudgement).toBe(50e6);
 expect(out.years[0].netIncome).toBe(year.netIncome);
 expect(out.adjustments[0].reason).toContain('Reported losses still count');
 expect(applyAdjustments([{...y,provenance:undefined}],record,{oneoff:{...trust.capex}},'USD').adjustments).toEqual([]);
 expect(applyAdjustments([{...y,provenance:{nonRecurring:{...y.provenance.nonRecurring,field:'unrelated tax charge'}}}],record,{oneoff:{...trust.capex}},'USD').adjustments).toEqual([]);
});
it('requires a reported share quantity before separating acquisition issuance',()=>{
 const r={id:'issuance',version:'1',value:'acquisition',confidence:.99,evidence:{...evidence,quote:'In 2025 we issued 5 million shares to acquire the business.'}};
 const record={id:'X',version:'1',readings:[r]};
 expect(applyAdjustments([year],record,{issuance:{...trust.capex}},'USD').adjustments).toEqual([]);
 const out=applyAdjustments([{...year,acquisitionSharesIssued:5e6,provenance:{acquisitionSharesIssued:{source:evidence.url,field:r.evidence.quote,method:'reported',inputs:['weighted-average contribution']}}}],record,{issuance:{...trust.capex}},'USD');
 expect(out.years[0].acquisitionIssuanceJudgement).toBe(5e6);
 expect(out.years[0].dilutedShares).toBe(year.dilutedShares);
});

import { humanVerdict } from '../../../lib/value/judgement/apply';
it('keeps price separate from the five quality tests in the human verdict',()=>{
 const tests=Object.fromEntries(['understandable','moat','economics','management','accounting'].map(k=>[k,{result:'pass'}]));
 expect(humanVerdict({tests:{...tests,price:{result:'fail'}}} as unknown as Analysis,false,true,1.1)).toBe('A wonderful business at too high a price');
});

import { analyzeCompany } from '../../../lib/value/analyze-company';
import googl from '../../fixtures/value/judgement/googl.json';
it('replays Alphabet fundamentals and Jev reading through the complete numeric and valuation flow',async()=>{
 const input={company:googl.company,fundamentals:googl.fundamentals,report:googl.report,sections:{},bondYield:.04,priceHistoryPending:false,ask:async()=>googl.answers} as unknown as Parameters<typeof analyzeCompany>[0];
 const before=await analyzeCompany(input);
 const after=await analyzeCompany({...input,judgement:googl.judgement});
 expect(before.tests.economics.result).toBe('pass');
 expect(after.tests.economics.result).toBe('pass');
 expect(after.tests.economics.numeric).toBe('pass');
 expect(after.tests.economics.metrics.oeToNi).toBeGreaterThan(before.tests.economics.metrics.oeToNi!);
 expect(after.tests.economics.rawMetrics!.oeToNi).toBe(before.tests.economics.metrics.oeToNi);
 expect(after.judgement!.adjustments.at(-1)).toMatchObject({fy:2025,after:21136000000});
 // Evidenced maintenance corrections flow through median margins and value.
 expect(after.valuation!.normalized).toBeGreaterThan(before.valuation!.normalized);
 expect(after.valuation!.perShare.mid).toBeGreaterThan(before.valuation!.perShare.mid);
 const renamed=await analyzeCompany({...input,company:{...input.company,id:'SAME-DATA.US'},judgement:{...googl.judgement,id:'SAME-DATA.US'}});
 expect(renamed.tests.economics.result).toBe(after.tests.economics.result);
});

const production=JSON.parse(readFileSync('tests/fixtures/value/judgement/production-jev.json','utf8'));
it('replays the final five dossier readings from recorded Jev responses',async()=>{
 for(const company of production)for(const r of company.readings){
  const call=company.calls.find((c:any)=>c.questions[r.id]&&c.state.endsWith(r.evidence.quote));
  expect(call,`${company.id}/${r.id} has a recorded evidence-only classification`).toBeTruthy();
  const result=await classify(r.id,r.evidence,async input=>{
   expect(input).toEqual({state:call.state,questions:call.questions});return {answers:call.answers};
  });
  expect(result.reading.value).toBe(r.value);expect(result.reading.confidence).toBe(r.confidence);
 }
});
it('uses fiscal labels rather than calendar years for non-December reporters',()=>{
 const years=[2023,2024,2025].map(fy=>({...year,fy,end:`${fy+1}-01-31`}));
 const out=applyAdjustments(years,{id:'X',version:'1',readings:[{...reading,period:'2026-01-31'}]},trust,'USD');
 expect(out.adjustments.map(a=>a.fy)).toEqual([2023,2024,2025]);
});
