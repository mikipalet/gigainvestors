import { T } from './config';
import { QUALITY_TESTS, type Analysis } from './types';
const historyYears=(a:Analysis)=>a.historyCoverage?.years ?? a.tests.understandable?.metrics.historyYears ?? 0;
// Source-backed predecessor history can decide individual tests while others remain unknown.
export const hasPredecessorHistory=(a:Analysis)=>Boolean(a.predecessorHistory?.length)&&historyYears(a)>=T.minYears;
// Crossing the seven-year floor must not remove a neutral dossier before its
// core decade checks have enough observations (growth checks need 11 endpoints).
export const shortHistory=(a:Analysis)=>historyYears(a)<T.minYears || !hasPredecessorHistory(a) && historyYears(a)<=T.history.years && QUALITY_TESTS.some(k=>{
 const test=a.tests[k as keyof Analysis['tests']];
 return test && ['unclear','na'].includes(test.result)&&['unclear','na'].includes(test.numeric)&&!test.pending;
});
export const missingInvestmentNav=(a:Analysis)=>Boolean(a.company?.investmentHolding && a.valuation?.method!=='nav');
/** A failed test that Buy requires (moat, economics, management, accounting or
 * the profit record) decides "not a Buy" whatever another test still lacks. */
const BUY_REQUIRED=['moat','economics','management','accounting'] as const;
export const failsBuyRequirement=(a:Analysis)=>a.status==='scored'&&(BUY_REQUIRED.some(k=>a.tests[k]?.result==='fail')||a.profitRecord?.pass===false);
export const isDecided=(a:Analysis)=>!missingInvestmentNav(a)&&a.status==='scored'&&(!shortHistory(a)&&QUALITY_TESTS.every(k=>a.tests[k as keyof Analysis['tests']]?.result==='pass'||a.tests[k as keyof Analysis['tests']]?.result==='fail')||historyYears(a)>=T.minYears&&failsBuyRequirement(a));
export function undecidedReasons(a:Analysis):string[]{
 if(missingInvestmentNav(a))return [a.valuationReason??'Ten-year reported NAV history unavailable'];
 return historyYears(a)<T.minYears?[`Only ${historyYears(a)} annual periods; ${T.minYears} required`]:Object.entries(a.tests).filter(([,t])=>t.result!=='pass'&&t.result!=='fail').flatMap(([k,t])=>t.reasons.length?t.reasons.map(r=>`${k}: ${r}`):[`${k}: unresolved core evidence`]);
}

/** A short annual record is a neutral public dossier, not an investment candidate. */
export const isFindable=(a:Analysis)=>isDecided(a)||!missingInvestmentNav(a)&&(historyYears(a)<T.minYears||hasPredecessorHistory(a));
