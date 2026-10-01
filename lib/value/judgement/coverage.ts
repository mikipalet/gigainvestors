import {QUALITY_TESTS,type Analysis,type Dossier} from '../types';
// Explicit controller review examples supplement the normal research shortlist.
const review=new Set(['KO.US','AAPL.US','GOOGL.US','MSFT.US','ORCL.US','META.US','NVDA.US','LULU.US','WKL.AS','ACN.US','JPM.US','CBG.LSE','AXP.US','BRK-B.US','7203.JP','RIGD.LSE','RACE.MI']);
export function researchCoverage(a:Analysis):boolean{
 const results=QUALITY_TESTS.map(k=>a.tests[k as keyof Analysis['tests']]?.result);
 return Boolean((a as Dossier).b)||review.has(a.id)||results.every(r=>r==='pass')||results.filter(r=>r==='fail').length===1&&results.filter(r=>r==='pass').length===4||(a as Dossier).holders?.some(h=>h.code==='BRK')===true;
}
