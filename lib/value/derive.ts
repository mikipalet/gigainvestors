import type { Year } from './types';

export type ValueProvenance = { source: string; field: string; method: 'reported' | 'derived' | 'absent-in-complete-statement' | 'estimate' | 'cached'; inputs?: string[] };
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
/** Complete statements are explicit source metadata, never inferred from a lone total. */
export function deriveYears(years: Year[]): Year[] {
  const completed:Year[]=[];
  return [...years].sort((a,b)=>a.end.localeCompare(b.end)).map(original => {
    const y: Year = { ...original, provenance: { ...original.provenance } };
    const put = (key: keyof Year, value: number | null | undefined, inputs: string[], method: ValueProvenance['method'] = 'derived') => {
      const existing=y.provenance?.[key];
      const shareCountProxy=key==='dilutedShares'&&existing
        &&existing.source!=='statements'&&!existing.inputs?.includes('basicEps')&&!existing.inputs?.includes('dilutedEps');
      // Recompute our own formulas when their inputs change. An external
      // derived observation can instead be a reviewed unit/FX conversion;
      // rebuilding it from vendor inputs would discard the issuer correction.
      const recompute=!shareCountProxy&&existing&&(key==='retainedEarningsChange'||!/^https:\/\//.test(existing.source))&&method!=='absent-in-complete-statement'&&(existing.method==='derived'||existing.method==='estimate');
      if (y[key] != null && !recompute || !finite(value)) return;
      Object.assign(y, { [key]: value });
      y.provenance![key] = { source: 'statements', field: String(key), method, inputs };
    };
    if (finite(y.revenue) && finite(y.costOfSales)) put('grossProfit', y.revenue-y.costOfSales, ['revenue','costOfSales']);
    if (finite(y.grossProfit) && finite(y.operatingExpenses)) put('operatingIncome', y.grossProfit-y.operatingExpenses, ['grossProfit','operatingExpenses']);
    // EBIT is an explicit fallback, not an assumption that ancillary income is zero.
    if (y.operatingIncome == null && finite(y.preTaxIncome) && finite(y.interestExpense))
      put('operatingIncome', y.preTaxIncome+y.interestExpense, ['preTaxIncome','interestExpense','EBIT proxy']);
    if (finite(y.dilutedEps) && y.dilutedEps !== 0 && finite(y.netIncome) && y.netIncome/y.dilutedEps > 0)
      put('dilutedShares',y.netIncome/y.dilutedEps,['netIncome','dilutedEps']);
    if ((y.dilutedShares==null || y.provenance?.dilutedShares?.inputs?.includes('basicEps')) && finite(y.basicEps) && y.basicEps !== 0 && finite(y.netIncome) && y.netIncome/y.basicEps > 0)
      put('dilutedShares',y.netIncome/y.basicEps,['netIncome','basicEps'],'estimate');
    if (y.statementCoverage?.income) put('nonRecurring',0,['complete income statement'],'absent-in-complete-statement');
    if (y.statementCoverage?.cashFlow) {
      for (const key of ['sbc','dividendsPaid','buybacks','issuance','capex'] as const) put(key,0,['complete cash-flow statement'],'absent-in-complete-statement');
    }
    if (y.statementCoverage?.balance) {
      for (const key of ['goodwill','intangibles','inventory','shortTermDebt','totalDebt'] as const) put(key,0,['complete balance sheet'],'absent-in-complete-statement');
    }
    if (finite(y.netIncome) && finite(y.dividendsPaid)) put('retainedEarningsChange',y.netIncome-y.dividendsPaid+(y.retainedEarningsOther ?? 0),['netIncome','dividendsPaid',...(y.retainedEarningsOther != null?['retainedEarningsOther']:[])]);
    const prev=completed.at(-1);
    const acquisitionSource=y.provenance?.acquisitions;
    const refreshProxy=y.acquisitionsProxy&&(acquisitionSource?.method==='derived'||acquisitionSource?.source.startsWith('raw/eodhd/'));
    if(prev && prev.fy+1===y.fy && (y.acquisitions===null||refreshProxy) && [prev.goodwill,prev.intangibles,y.goodwill,y.intangibles].every(finite)){
      y.acquisitions=null;
      put('acquisitions',Math.max(0,y.goodwill!+y.intangibles!-prev.goodwill!-prev.intangibles!),['goodwill','intangibles','previous.goodwill','previous.intangibles']);
      y.acquisitionsProxy=true;
    }
    if (prev && prev.fy+1===y.fy && finite(y.retainedEarnings) && finite(prev.retainedEarnings)) {
      y.retainedEarningsChange=y.retainedEarnings-prev.retainedEarnings;
      y.provenance!.retainedEarningsChange={source:'statements',field:'retainedEarningsChange',method:'derived',inputs:['retainedEarnings','previous.retainedEarnings']};
    }
    if (prev && prev.fy+1===y.fy && finite(prev.dilutedShares) && finite(y.dilutedShares) && finite(y.averageSharePrice) && y.averageSharePrice>0 && y.dilutedShares>prev.dilutedShares*0.5)
      put('buybacks',Math.max(0,prev.dilutedShares-y.dilutedShares)*y.averageSharePrice,['previous.dilutedShares','dilutedShares','averageSharePrice'],'estimate');
    completed.push(y);
    return y;
  });
}

/** Preserve the origin of legacy normalized values even when their original tag predates this pipeline. */
export function cachedProvenance(years:Year[], source:string):Year[] {
 return years.map(y=>{
  const provenance={...y.provenance};
  for(const [field,value]of Object.entries(y))if(typeof value==='number'&&Number.isFinite(value)&&field!=='fy'&&!provenance[field])
    provenance[field]={source,field,method:'cached'};
  return {...y,provenance};
 });
}
