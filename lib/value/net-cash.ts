import type {Year,Series} from './types';
/** Year.cash is the cash + short-term investments aggregate in EODHD/Yahoo.
 * Older SEC/IFRS records may contain only cash equivalents: provenance identifies
 * those components. Never add investments to an already aggregated cash value.
 */
function cashAndInvestments(y:Year):number|null {
 if(y.cashAndCashEquivalents!=null)return y.cashAndCashEquivalents+(y.shortTermInvestments??0);
 if(y.cash==null)return null;
 const field=y.provenance?.cash?.field??'';
 const cashOnly=/^(CashAndCashEquivalentsAtCarryingValue|CashAndCashEquivalents|CashAndCashEquivalentsIFRS)$/.test(field);
 return y.cash+(cashOnly?(y.shortTermInvestments??0):0);
}
export function netCashSeries(years:Year[]):Series {
 const end=Math.max(...years.map(y=>y.fy));
 return years.filter(y=>y.fy>end-10).sort((a,b)=>a.fy-b.fy).map(y=>{
  const cash=cashAndInvestments(y);
  return [y.fy,cash==null||y.totalDebt==null?null:cash-y.totalDebt];
 });
}
