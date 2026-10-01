import {ownerEarningsBridge} from '../owner-earnings';
import { QUALITY_TESTS, type Analysis, type Year, type TestOutcome } from '../types';
import type { Adjustment, JudgementRecord, Reading, Trust } from './types';
import { BUSINESS_TOPICS, questionVersion } from './questions';
export function trustedReading(r:Reading,trust:Trust):boolean {
 const g=trust[r.id];
 return !!g&&g.version===r.version&&r.version===questionVersion(r.id)&&g.accuracy>=.9&&g.n>=10&&g.positive>=3&&g.negative>=3
  &&r.confidence>=.7&&r.value!=='unclear'&&!!r.evidence?.quote.trim()&&/^https:\/\//.test(r.evidence.url);
}
export function applyAdjustments(years:Year[],record:JudgementRecord|null|undefined,trust:Trust,currency:string){
 const readings=(record?.readings??[]).filter(r=>trustedReading(r,trust));
 const adjustments:Adjustment[]=[];
 const originalMaintenance=new Map(ownerEarningsBridge(years).map(row=>[row.year.fy,row.maintenanceCapex]));
 const adjusted=years.map(original=>{
  const y={...original,provenance:{...original.provenance}};
  for(const field of ['disclosedMaintenanceCapex','nonRecurring','acquisitionSharesIssued'] as const){
   const facts=(record?.numericFacts??[]).filter(f=>f.fy===y.fy&&f.field===field&&Number.isFinite(f.value)&&f.value>=0&&!!f.evidence?.quote.trim()&&/^https:\/\//.test(f.evidence.url));
   // Conflicting issuer figures require review rather than an arbitrary winner.
   if(facts.length&&new Set(facts.map(f=>f.value)).size===1){
    y[field]=facts[0].value;
    y.provenance[field]={source:facts[0].evidence.url,field:facts[0].evidence.quote,method:'reported',...(field==='acquisitionSharesIssued'?{inputs:['weighted-average contribution']}: {})};
   }
  }
  for(const r of readings){
   // The current report covers up to three fiscal observations, never the whole history.
   const periodYear=(r.period?years.find(y=>y.end===r.period)?.fy:undefined)??(r.period?Number(r.period.slice(0,4)):years.at(-1)?.fy??NaN);
   if(y.fy>periodYear||y.fy<periodYear-2)continue;
   const add=(test:Adjustment['test'],field:string,before:number,after:number,reason:string)=>{
    if(before!==after)adjustments.push({test,fy:y.fy,field,before,after,reason,evidence:r.evidence!,...(field==='maintenanceCapex'&&y.disclosedMaintenanceCapex!=null&&y.disclosedMaintenanceCapex>y.da!?{amountEvidence:record?.numericFacts?.find(f=>f.fy===y.fy&&f.field==='disclosedMaintenanceCapex')?.evidence}:{})});
   };
   if(r.id==='capex'&&r.value==='growth'&&r.confidence>=.85&&y.capex!==null&&y.da!==null&&y.da>=0&&y.capex>y.da){
    const upkeep=Math.max(y.da,y.disclosedMaintenanceCapex??0);
    if(upkeep>y.capex)continue;
    y.maintenanceCapexJudgement=upkeep;
    const money=`${currency} ${(upkeep/1e9).toLocaleString('en-US',{maximumFractionDigits:1})}bn`;
    add('economics','maintenanceCapex',originalMaintenance.get(y.fy)??y.capex,upkeep,`Most spending builds new capacity${/\bAI\b|artificial intelligence/i.test(r.evidence!.quote)?' (AI infrastructure)':''}; FY${y.fy} upkeep ≈ ${upkeep===y.da?'depreciation':'disclosed maintenance'} ${money}.`);
   }
   // Amount must already be a reported, year-specific fact; prose alone cannot invent it.
   if(r.id==='oneoff'&&r.value==='nonrecurring'&&y.nonRecurring!==null&&y.nonRecurring>0&&y.operatingIncome!==null&&y.provenance?.nonRecurring?.method==='reported'
     &&r.evidence!.quote.includes(String(y.fy))&&y.provenance.nonRecurring.field===r.evidence!.quote){
    y.marginOperatingIncomeJudgement=y.operatingIncome+y.nonRecurring;
    add('understandable','marginOperatingIncome',y.operatingIncome,y.marginOperatingIncomeJudgement,`FY${y.fy}: the filing labels this operating charge non-recurring; exclude it only from margin stability. Reported losses still count.`);
   }
   if(r.id==='issuance'&&r.value==='acquisition'&&y.acquisitionSharesIssued!=null&&y.acquisitionSharesIssued>0&&y.provenance?.acquisitionSharesIssued?.method==='reported'&&y.provenance.acquisitionSharesIssued.inputs?.includes('weighted-average contribution')&&r.evidence!.quote.includes(String(y.fy))){
    y.acquisitionIssuanceJudgement=y.acquisitionSharesIssued;
    add('management','acquisitionSharesIssued',0,y.acquisitionSharesIssued,`FY${y.fy}: shares bought a business; distinguish them from routine dilution. Per-share value and acquisition returns still have to pass.`);
   }
  }
  return y;
 });
 return {years:adjusted,adjustments,readings};
}
const fallback:Record<string,[string,string]>={
 understandable:['The business has earned money through different conditions.','Earnings have been too uneven to call this dependable.'],
 moat:['The business earns attractive returns on the capital it needs.','The returns do not yet demonstrate a durable advantage.'],
 economics:['A useful share of reported profit reaches the owners.','Too much of the reported profit is absorbed by the business.'],
 management:['Per-share results support the way management has used capital.','Capital allocation has not delivered enough for each share.'],
 accounting:['Cash and reported earnings broadly tell the same story.','The accounts contain warning signs that deserve attention.'],
};
export function numericJudgementReason(test:Pick<TestOutcome,'key'|'result'>):string {
 if(test.result==='unclear'||test.result==='na')return 'The record does not yet support a firm judgement.';
 return fallback[test.key]?.[test.result==='pass'?0:1]??'The price needs its own assessment.';
}
export function attachJudgements(analysis:Analysis,record:JudgementRecord|null|undefined,trust:Trust,adjustments:Adjustment[],raw?:Analysis['tests']):Analysis {
 const readings=(record?.readings??[]).filter(r=>trustedReading(r,trust));
 const tests={...analysis.tests};
 for(const key of Object.keys(tests) as Array<keyof typeof tests>){
  const test:TestOutcome={...tests[key]};
  test.result=test.numeric;
  const related=adjustments.filter(a=>a.test===key);
  let evidence=related.at(-1)?.evidence;
  const moatReading=readings.find(r=>r.id==='moat');
  const allocationReading=readings.find(r=>r.id==='allocation');
  const before=raw?.[key];
  if(before){test.rawNumeric=before.numeric;test.rawMetrics=before.metrics;}
  const changed=test.result!==(before?.numeric??test.numeric);
  let reason=numericJudgementReason(test);
  if(key==='moat'&&moatReading){
   const advantages:Record<string,string>={brand:'Brand loyalty',network:'A useful network',switching:'The cost of changing providers',cost:'Lower operating costs',regulation:'Limited permission to compete',scale:'Distribution and purchasing scale'};
   reason=`${advantages[moatReading.value]??'The described advantage'} ${test.result==='pass'?'helps explain the strong returns.':'matters, but the returns still fall short.'}`;evidence=moatReading.evidence!;
  }
  if(key==='management'&&allocationReading){
   const uses:Record<string,string>={buybacks:'Management is buying back shares',dividends:'Management returns cash through dividends',acquisitions:'Management is buying businesses',reinvestment:'Management is reinvesting in the business',mixed:'Management uses a mix of reinvestment and capital returns'};
   reason=`${uses[allocationReading.value]??'Management is allocating capital'}; ${test.result==='pass'?'per-share results support those choices.':'the per-share record still falls short.'}`;evidence=allocationReading.evidence!;
  }
  if(test.result==='unclear'||test.result==='na')reason='The record does not yet support a firm judgement.';
  if(related.length)reason=related.at(-1)!.reason;
  if(key==='management'&&readings.some(r=>r.id==='issuance'&&r.value==='acquisition')&&!related.length)reason+=' Some shares financed acquisitions; the actual share count still governs per-share results.';
  test.judgement={result:test.result,reason,evidence,override:changed};
  tests[key]=test;
 }
 return {...analysis,tests,judgement:{business:readings.filter(r=>BUSINESS_TOPICS.includes(r.id)),facts:record?.facts??[],adjustments}};
}
export function returnRange(value:number):string {
 const low=Math.floor(value*100/5)*5;
 return `about ${low}–${low+5}% a year`;
}
export function humanVerdict(analysis:Analysis,buy:boolean,priceKnown=true):string {
 if(analysis.thesis?.changed)return 'Good numbers, but the business is changing';
 const tests=QUALITY_TESTS.map(key=>analysis.tests[key as keyof Analysis['tests']]);
 if(tests.some(t=>t.result==='fail'))return 'The business still has something to prove';
 if(!tests.every(t=>t.result==='pass'))return 'Still getting to know this business';
 if(!priceKnown)return 'A strong business; the price needs a closer look';
 return buy?'A wonderful business at a fair price':'Great business, but the price already assumes a lot';
}
