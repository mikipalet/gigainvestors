import {expect,it} from 'vitest';
import {attributeVerdict} from '@/lib/value/verdict-attribution';
import {emptyYear} from '@/lib/value/completeness/second-sources';
import {runNumericTests} from '@/lib/value/tests';
const input=()=>({kind:'operating' as const,industry:null,years:Array.from({length:11},(_,i)=>({...emptyYear(`${2015+i}-12-31`,'USD'),revenue:1000,netIncome:100,operatingIncome:150,equity:500,totalDebt:0,cash:10,goodwill:0,intangibles:0,dilutedShares:100,marketCap:1000+i*200,dividendsPaid:10,buybacks:0,acquisitions:0}))});
it('pins shares with a sufficient forward and necessary reverse counterfactual',()=>{
 const old=input(),fresh=input();old.years.forEach((y,i)=>y.dilutedShares=100*Math.pow(1.1,i));
 expect(runNumericTests(old).management.numeric).toBe('fail');expect(runNumericTests(fresh).management.numeric).toBe('pass');
 const result=attributeVerdict({test:'management',before:old,after:fresh,expectedBefore:'fail',expectedAfter:'pass'});
 expect(result.status).toBe('attributed');expect(result.minimalGroups).toEqual(['shares']);
 expect(result.counterfactuals.find(x=>x.groups.join()==='shares')).toMatchObject({forward:'pass',reverse:'fail'});
 expect(result.deltas.some(x=>x.field==='dilutedShares'&&x.fy===2025)).toBe(true);
});
it('never attributes a reconstructed old input that does not reproduce the released result',()=>{
 const result=attributeVerdict({test:'management',before:input(),after:input(),expectedBefore:'fail',expectedAfter:'pass'});
 expect(result.status).toBe('unreproduced baseline');expect(result.minimalGroups).toEqual([]);
});
it('records missing historical snapshots as a blocker rather than a vendor restatement',()=>{
 const result=attributeVerdict({test:'management',before:null,after:input(),expectedBefore:'fail',expectedAfter:'pass'});
 expect(result.status).toBe('missing baseline inputs');expect(result.minimalGroups).toEqual([]);
});
it('does not manufacture absent fiscal periods while exchanging input fields',()=>{
 const old=input(),fresh=input();fresh.years=fresh.years.slice(-4);
 const result=attributeVerdict({test:'understandable',before:old,after:fresh,expectedBefore:'pass',expectedAfter:'unclear'});
 expect(result.status).toBe('attributed');expect(result.minimalGroups).toEqual(['fiscal-year set']);
});
it('does not misattribute rounded dates as a new fiscal year carrying every new field',()=>{
 const old=input(),fresh=input();old.years.forEach((y,i)=>y.dilutedShares=100*Math.pow(1.1,i));fresh.years.forEach(y=>y.end=y.end.replace('-31','-28'));
 const result=attributeVerdict({test:'management',before:old,after:fresh,expectedBefore:'fail',expectedAfter:'pass'});
 expect(result.minimalGroups).toEqual(['shares']);
});
