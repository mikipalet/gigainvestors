import { T } from './config';
import { QUALITY_TESTS, type Analysis } from './types';
export const historyYears=(a:Analysis)=>a.historyCoverage?.years ?? a.tests.understandable?.metrics.historyYears ?? 0;
export const shortHistory=(a:Analysis)=>historyYears(a)<T.minYears;
export const isDecided=(a:Analysis)=>!shortHistory(a)&&a.status==='scored'&&QUALITY_TESTS.every(k=>a.tests[k as keyof Analysis['tests']]?.result==='pass'||a.tests[k as keyof Analysis['tests']]?.result==='fail');
export function undecidedReasons(a:Analysis):string[]{
 return shortHistory(a)?[`Only ${historyYears(a)} annual periods; ${T.minYears} required`]:Object.entries(a.tests).filter(([,t])=>t.result!=='pass'&&t.result!=='fail').flatMap(([k,t])=>t.reasons.length?t.reasons.map(r=>`${k}: ${r}`):[`${k}: unresolved core evidence`]);
}
