import { T } from './config';
import { QUALITY_TESTS, type Analysis } from './types';
export const historyYears=(a:Analysis)=>a.historyCoverage?.years ?? a.tests.understandable?.metrics.historyYears ?? 0;
export const shortHistory=(a:Analysis)=>historyYears(a)<T.minYears;
export const missingInvestmentNav=(a:Analysis)=>Boolean(a.company.investmentHolding && a.valuation?.method!=='nav');
export const isDecided=(a:Analysis)=>!missingInvestmentNav(a)&&!shortHistory(a)&&a.status==='scored'&&QUALITY_TESTS.every(k=>a.tests[k as keyof Analysis['tests']]?.result==='pass'||a.tests[k as keyof Analysis['tests']]?.result==='fail');
export function undecidedReasons(a:Analysis):string[]{
 if(missingInvestmentNav(a))return [a.valuationReason??'Ten-year reported NAV history unavailable'];
 return shortHistory(a)?[`Only ${historyYears(a)} annual periods; ${T.minYears} required`]:Object.entries(a.tests).filter(([,t])=>t.result!=='pass'&&t.result!=='fail').flatMap(([k,t])=>t.reasons.length?t.reasons.map(r=>`${k}: ${r}`):[`${k}: unresolved core evidence`]);
}
