import {expect,it} from 'vitest';
import {yearsFromEsef} from '@/lib/value/italy/facts';
const fact=(concept:string,value:number,stock=false,axis?:string)=>({value,dimensions:{concept:'ifrs-full:'+concept,entity:'lei:X',unit:'iso4217:EUR',period:stock?'2026-01-01T00:00:00':'2025-01-01T00:00:00/2026-01-01T00:00:00',...(axis?{'ifrs-full:ComponentsOfEquityAxis':'ifrs-full:'+axis}:{})}});
it('reads parent income and equity in the explicit parent component without including minority totals',()=>{
 const raw={documentInfo:{namespaces:{'ifrs-full':'https://xbrl.ifrs.org/taxonomy/2025/ifrs-full'}},facts:{total:fact('ProfitLoss',100),parent:fact('ProfitLoss',80,false,'EquityAttributableToOwnersOfParentMember'),equity:fact('Equity',400,true,'EquityAttributableToOwnersOfParentMember'),minority:fact('Equity',20,true,'NoncontrollingInterestsMember')}};
 const [y]=yearsFromEsef({raw,lei:'X'});
 expect(y).toMatchObject({netIncome:80,totalNetIncome:100,equity:400,minorityInterest:20});
});
it('deducts reported minority continuing profit only when total and continuing profit coincide',()=>{
 const raw={documentInfo:{namespaces:{'ifrs-full':'https://xbrl.ifrs.org/taxonomy/2025/ifrs-full'}},facts:{total:fact('ProfitLoss',100),continuing:fact('ProfitLossFromContinuingOperations',100),minority:fact('ProfitLossFromContinuingOperationsAttributableToNoncontrollingInterests',-5)}};
 expect(yearsFromEsef({raw,lei:'X'})[0].netIncome).toBe(105);
 raw.facts.continuing.value=90;
 expect(yearsFromEsef({raw,lei:'X'})[0].netIncome).toBe(100);
});

import {fillYears,emptyYear} from '@/lib/value/completeness/second-sources';
it('prefers a reported weighted share count to a denominator inferred from a mis-scaled EPS tag',()=>{
 const issuer={...emptyYear('2025-12-31','EUR'),netIncome:135034000,dilutedEps:1986.5,dilutedShares:67975.8369,provenance:{dilutedShares:{source:'filings.xbrl.org/report',field:'dilutedShares',method:'derived' as const,inputs:['netIncome','dilutedEps']}}};
 const other={...emptyYear('2025-12-31','EUR'),dilutedShares:68000000,provenance:{dilutedShares:{source:'reported statements',field:'weightedAverageShsOutDil',method:'reported' as const}}};
 expect(fillYears([issuer],[other])[0].dilutedShares).toBe(68000000);
 expect(fillYears([other],[issuer])[0].dilutedShares).toBe(68000000);
});
