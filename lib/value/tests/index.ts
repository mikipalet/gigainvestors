import { financialTests } from './financial';
import {qualityYears} from '../quality-ltm';
import { withTestHistory } from '../test-history';
import type { NumericInput, NumericOutcome, TestKey, Year } from "../types";
import { run as understandable } from "./understandable";
import { run as moat } from "./moat";
import { run as economics } from "./economics";
import { run as management } from "./management";
import { run as accounting } from "./accounting";

export function runNumericTests(input: NumericInput): Record<Exclude<TestKey, "price">, NumericOutcome> {
  if(input.qualityLtm){
    const annual=runNumericTests({...input,qualityLtm:null});
    const observations=(input.qualityLtmHistory??[input.qualityLtm]).filter(y=>y.end<=input.qualityLtm!.end).sort((a,b)=>a.end.localeCompare(b.end));
    const evaluated=new Map<Year,typeof annual>();
    return Object.fromEntries(Object.entries(annual).map(([key,test])=>{
      let stable=test,pending:{numeric:NumericOutcome['numeric'];end:string}|null=null;
      for(const observation of observations){
        const years=qualityYears(input.years,observation,key as TestKey,input.kind);
        // Missing quarterly fields always restore the audited annual test.
        if(years===input.years){stable=test;pending=null;continue;}
        if(!evaluated.has(observation))evaluated.set(observation,runNumericTests({...input,years,qualityLtm:null}));
        const all=evaluated.get(observation)!,next=all[key as keyof typeof annual];
        const income=years.slice(-10).map(y=>[y.fy,input.kind==='bank'||input.kind==='insurer'?y.commonNetIncome??y.netIncome:y.netIncome]);
        const result={...next,series:{...(key==='accounting'&&(input.kind==='bank'||input.kind==='insurer')?{bookPerShare:all.economics.series.bookPerShare,commonRoe:all.understandable.series.commonRoe}:{}),shares:years.slice(-10).map(y=>[y.fy,y.dilutedShares]),...next.series,netIncome:next.series.netIncome??income},provisional:years.at(-1)!.provisional} as NumericOutcome;
        const consecutive=pending&&Math.abs((Date.parse(observation.end)-Date.parse(pending.end))/86400000-91.3125)<20;
        if(input.confirmQualityLtm===false||next.numeric===stable.numeric||(consecutive&&pending!.numeric===next.numeric)){
          stable=result;pending=null;
        }else pending={numeric:next.numeric,end:observation.end};
      }
      return [key,stable];
    })) as typeof annual;
  }
  const tests = (input.kind === "bank" || input.kind === "insurer") ? financialTests(input) : { understandable: understandable(input), moat: moat(input), economics: economics(input), management: management(input), accounting: accounting(input) };
  const years = new Set(input.years.map(year => year.fy)).size;
  return Object.fromEntries(Object.entries(tests).map(([key, test]) => [key, withTestHistory(test, years)])) as typeof tests;
}
