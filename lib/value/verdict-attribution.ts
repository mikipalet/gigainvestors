import {runNumericTests} from './tests';
import type {NumericInput,Result,TestKey,Year} from './types';

type Quality=Exclude<TestKey,'price'>;
const groups:Record<string,string[]>={
 shares:['dilutedShares','sharesOutstanding','edinetShares','acquisitionSharesIssued','acquisitionIssuanceJudgement'],
 EPS:['basicEps','dilutedEps'],book:['equity','netAssets','preferredEquity','goodwill','intangibles','retainedEarnings','retainedEarningsChange','retainedEarningsOther'],
 profit:['netIncome','commonNetIncome','totalNetIncome','operatingIncome','preTaxIncome','taxExpense','interestExpense','marginOperatingIncomeJudgement'],
 OCF:['ocf','leaseCash','leaseCashIncomplete','sbc','sbcIncomplete'],revenue:['revenue','grossProfit','costOfSales','operatingExpenses'],
 capital:['capex','da','ppe','maintenanceCapexJudgement','disclosedMaintenanceCapex','acquisitions','acquisitionsProxy'],
 balance:['totalAssets','totalLiabilities','cash','cashAndDeposits','cashAndCashEquivalents','shortTermInvestments','totalDebt','shortTermDebt','debtIncludesLeases','leaseLiabilities','leaseDepreciationIncluded','receivables','inventory','payables','currentAssets','currentLiabilities','minorityInterest'],
 distributions:['dividendsPaid','commonDividendsPaid','dividendsPerShare','buybacks','issuance'],
 prices:['marketCap','averageSharePrice'], 'currency/units':['currency'],
};
const groupFor=(field:string)=>Object.keys(groups).find(k=>groups[k].includes(field))??'other statement inputs';
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const ignored=new Set(['fy','end','provenance','sourceWarnings']);
export interface InputDelta{fy:number;end:string;field:string;group:string;before:unknown;after:unknown;beforeSource?:unknown;afterSource?:unknown}
export interface Counterfactual{groups:string[];forward:Result;reverse:Result}

/** Exchange dated observations, including their provenance. Never synthesize a
 * fiscal row from a metric or assume that a vendor omission is a restatement. */
function exchange(base:NumericInput,target:NumericInput,selected:string[]):NumericInput{
 const chosen=new Set(selected),out=structuredClone(base);
 if(chosen.has('company classification')){out.kind=target.kind;out.industry=target.industry;}
 if(chosen.has('price availability'))out.priceHistoryPending=target.priceHistoryPending;
 if(chosen.has('fiscal-year set'))out.years=target.years.map(y=>structuredClone(base.years.find(p=>p.fy===y.fy)??y));
 out.years=out.years.map(y=>{
  const other=target.years.find(p=>p.fy===y.fy);if(!other)return y;
  for(const field of new Set([...Object.keys(y),...Object.keys(other)])){
   if(ignored.has(field)||!chosen.has(groupFor(field))&&!chosen.has(`field:${field}`))continue;
   if(field in other)Object.assign(y,{[field]:other[field as keyof Year]});else delete (y as unknown as Record<string,unknown>)[field];
   y.provenance??={};if(other.provenance?.[field])y.provenance[field]=other.provenance[field];else delete y.provenance[field];
  }
  return y;
 });
 return out;
}

export function attributeVerdict({test,before,after,expectedBefore,expectedAfter,beforeRule=runNumericTests,afterRule=runNumericTests}: {
 test:Quality;before:NumericInput|null;after:NumericInput;expectedBefore:Result;expectedAfter:Result;
 beforeRule?:typeof runNumericTests;afterRule?:typeof runNumericTests;
}){
 const newResult=afterRule(after)[test];
 const oldResult=before?beforeRule(before)[test]:null;
 const deltas:InputDelta[]=[],counterfactuals:Counterfactual[]=[];
 const result={status:'attributed',oldResult,newResult,deltas,counterfactuals,minimalGroups:[] as string[],minimalFields:[] as string[]};
 if(!before)return {...result,status:'missing baseline inputs'};
 const changed=new Set<string>();
 if(!same(before.years.map(y=>y.fy),after.years.map(y=>y.fy)))changed.add('fiscal-year set');
 if(before.kind!==after.kind||before.industry!==after.industry)changed.add('company classification');
 if(before.priceHistoryPending!==after.priceHistoryPending)changed.add('price availability');
 for(const y of before.years){
  const n=after.years.find(p=>p.fy===y.fy);if(!n)continue;
  for(const field of new Set([...Object.keys(y),...Object.keys(n)])){
   if(ignored.has(field)||same(y[field as keyof Year],n[field as keyof Year])&&same(y.provenance?.[field],n.provenance?.[field]))continue;
   const group=groupFor(field);changed.add(group);
   deltas.push({fy:y.fy,end:y.end,field,group,before:y[field as keyof Year]??null,after:n[field as keyof Year]??null,beforeSource:y.provenance?.[field],afterSource:n.provenance?.[field]});
  }
 }
 if(oldResult!.numeric!==expectedBefore)return {...result,status:'unreproduced baseline'};
 if(newResult.numeric!==expectedAfter)return {...result,status:'unreproduced new inputs'};
 if(expectedBefore===expectedAfter)return {...result,status:'no numeric verdict change'};
 if(beforeRule!==afterRule)changed.add('rule version');
 const evaluate=(selected:string[])=>{
  const forward=(selected.includes('rule version')?afterRule:beforeRule)(exchange(before,after,selected))[test].numeric;
  const reverse=(selected.includes('rule version')?beforeRule:afterRule)(exchange(after,before,selected))[test].numeric;
  const row={groups:selected,forward,reverse};counterfactuals.push(row);return row;
 };
 const candidates=[...changed].sort(),sufficient=(r:Counterfactual)=>r.forward===expectedAfter&&r.reverse===expectedBefore;
 const refine=(selected:string[])=>{
  const dimensions=selected.flatMap(group=>{
   const fields=[...new Set(deltas.filter(d=>d.group===group).map(d=>d.field))];
   return fields.length?fields.map(f=>`field:${f}`):[group];
  });
  let minimal=dimensions;
  let reduced:boolean;
  do{
   reduced=false;
   for(const dimension of [...minimal]){const subset=minimal.filter(d=>d!==dimension);if(subset.length&&sufficient(evaluate(subset))){minimal=subset;reduced=true;}}
  }while(reduced);
  return {...result,minimalGroups:selected,minimalFields:minimal.filter(d=>d.startsWith('field:')).map(d=>d.slice(6))};
 };
 // Exhaust single and paired interventions before reduction of interacting
 // groups. The final set is irreducible, not a claim of a unique causal set.
 for(const group of candidates)if(sufficient(evaluate([group])))result.minimalGroups.push(group);
 if(result.minimalGroups.length)return refine([result.minimalGroups[0]]);
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++)if(sufficient(evaluate([candidates[i],candidates[j]])))return refine([candidates[i],candidates[j]]);
 let selected=candidates;
 if(!sufficient(evaluate(selected)))return {...result,status:'no sufficient counterfactual'};
 let reduced:boolean;
 do{
  reduced=false;
  for(const group of [...selected]){const subset=selected.filter(g=>g!==group);if(subset.length&&sufficient(evaluate(subset))){selected=subset;reduced=true;}}
 }while(reduced);
 return refine(selected);
}
