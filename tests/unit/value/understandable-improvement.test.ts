import {expect,it} from 'vitest';
import {run} from '../../../lib/value/tests/understandable';
import {run as baseline} from '../../../research/understandable/baseline';
import {makeYears} from './synthetic';
const rising=()=>makeYears({n:10,overrides:(_,i)=>({operatingIncome:10+30*i})});
it('accepts complete positive monotonically improving margins despite high variation',()=>{
 const ys=rising();expect(baseline({years:ys,kind:'operating'}).numeric).toBe('fail');
 const result=run({years:ys,kind:'operating'});
 expect(result.numeric).toBe('pass');expect(result.metrics.opMarginCv).toBeGreaterThan(.35);
 expect(result.metrics.opMarginImproving).toBe(1);
 expect(result.reasons.join(' ')).toContain('nondecreasing');
});
it.each(['decline','swing','operating loss','net loss','missing margin','missing income','gap','duplicate year'])(
 'does not excuse %s',(failure)=>{
 let ys=rising();
 if(failure==='decline')ys=ys.map((y,i)=>({...y,operatingIncome:280-30*i}));
 if(failure==='swing')ys[6].operatingIncome=5;
 if(failure==='operating loss')ys[0].operatingIncome=-1;
 if(failure==='net loss')ys[2].netIncome=-1;
 if(failure==='missing margin'){ys[2].revenue=null;ys[2].operatingIncome=null;delete ys[2].marginOperatingIncomeJudgement;}
 if(failure==='missing income')ys[2].netIncome=null;
 if(failure==='gap')ys.splice(2,1);
 if(failure==='duplicate year')ys[2].fy=ys[1].fy;
 const result=run({years:ys,kind:'operating'});expect(result.numeric).not.toBe('pass');
 expect(result.metrics.opMarginImproving).not.toBe(1);
});
it('allows plateaus but requires an overall improvement and at least seven years',()=>{
 const ys=rising();ys[4].operatingIncome=ys[3].operatingIncome;
 expect(run({years:ys,kind:'operating'}).numeric).toBe('pass');
 expect(run({years:ys.slice(0,6),kind:'operating'}).numeric).not.toBe('pass');
 expect(run({years:makeYears(),kind:'operating'}).numeric).toBe('pass');
});
it('retains all existing outcomes and raw CV for low-variation histories',()=>{
 for(const ys of [makeYears(),makeYears({overrides:{netIncome:-1}}),makeYears({n:4})]){
  const before=baseline({years:ys,kind:'operating'}),after=run({years:ys,kind:'operating'});
  expect(after.numeric).toEqual(before.numeric);expect(after.metrics.opMarginCv).toEqual(before.metrics.opMarginCv);
 }
});
it('does not waive the unchanged revenue-decline gate',()=>{
 const ys=rising().map((y,i)=>({...y,revenue:1000-i*50,operatingIncome:(.01+i*.03)*(1000-i*50)}));
 expect(run({years:ys,kind:'operating'}).numeric).toBe('fail');
});

it('does not label flat zero margins as improving or change their existing outcome',()=>{
 const ys=makeYears({overrides:{operatingIncome:0}});
 const result=run({years:ys,kind:'operating'});
 expect(result.numeric).toBe(baseline({years:ys,kind:'operating'}).numeric);
 expect(result.metrics.opMarginImproving).toBeUndefined();
});

it('accepts a dominant upward trend with small residual noise and an isolated dip',()=>{
 const margins=[10,35,60,90,85,120,145,170,195,220];
 const ys=makeYears({n:10,overrides:(_,i)=>({operatingIncome:margins[i]})});
 const result=run({years:ys,kind:'operating'});
 expect(result.numeric).toBe('pass');expect(result.metrics.opMarginImproving).toBe(1);
 expect(result.metrics.opMarginTrendR2).toBeGreaterThanOrEqual(.9);
});
it('does not excuse a recent reversal even with a strong full-window upward trend',()=>{
 const ys=rising();ys[9].operatingIncome=ys[8].operatingIncome!-1;
 expect(run({years:ys,kind:'operating'}).numeric).toBe('fail');
});
it.each([[.90001,'pass'],[.89999,'fail']] as const)('applies the frozen R-squared cutoff at %s',(r2,state)=>{
 const residual=[1,-1,-1,1,0,0,1,-1,-1,1];
 const trendVariance=.5**2*8.25,noiseVariance=.8;
 const amplitude=Math.sqrt(trendVariance*(1-r2)/(r2*noiseVariance));
 const ys=makeYears({n:10,overrides:(_,i)=>({operatingIncome:(1+.5*i+amplitude*residual[i])*30})});
 expect(run({years:ys,kind:'operating'}).numeric).toBe(state);
});
it('uses judged operating income consistently with the existing margin series',()=>{
 const ys=rising().map(y=>({...y,marginOperatingIncomeJudgement:y.operatingIncome!,operatingIncome:-1}));
 expect(run({years:ys,kind:'operating'}).numeric).toBe('pass');
});
import {ruleReading} from '../../../lib/value/rule-reading';
import {plainRuleSentence} from '../../../lib/value/plain-rule-sentence';
it('explains an improving-margin pass consistently while retaining the raw CV',()=>{
 const result=run({years:rising(),kind:'operating'});
 const test={...result,result:result.numeric,jev:[]};
 expect(ruleReading(test,'operating').derived).toBe('pass');
 expect(ruleReading(test,'operating').checks.find(c=>c.key==='opMarginCv')?.pass).toBe(true);
 expect(plainRuleSentence(test,'operating')).toContain('improved');
});
