import type {Year} from './types';

/** Conservative cash CREDIT, not a claim that the excluded assets are worthless.
 * Consolidated regulated/client/student balances need evidence of distributable
 * surplus. A vendor aggregate and a 2%-of-sales reserve cannot establish it.
 * No ticker, price or verdict enters this policy. See docs/value/jev-3/cash-policy.md.
 */
export function ownerCash(y:Year,industry:string|null|undefined):{cash:number;reason:string|null} {
 const gross=y.cash??0;
 if(y.cashExclusion?.invalid)return {cash:0,reason:y.cashExclusion.reason};
 if(/healthcare plans|managed health care|insurance|capital markets|investment banking|brokerage|education|educational/i.test(industry??'') || (y.clientAssets??0)>0)
  return {cash:0,reason:'Regulated, client or student funds: distributable surplus is not established by consolidated cash; no cash credit or debt offset'};
 let cash=Math.max(0,gross-(y.cashExclusion?.amount??0));
 let reason=y.cashExclusion?.reason??null;
 if(/logistics|distribution|distributors|tobacco/i.test(industry??'')) {
  if(y.currentAssets==null||y.currentLiabilities==null||y.currentAssets<gross)
   return {cash:0,reason:'Distribution float: current operating obligations cannot be reconciled; no cash credit or debt offset'};
  // Trade/tax float is not owner cash. Reserve liabilities not covered by
  // noncash current assets; exclude only explicitly reported current borrowing.
  const obligations=Math.max(0,y.currentLiabilities-Math.max(0,y.shortTermDebt??0));
  const reserve=Math.max(0,obligations-Math.max(0,y.currentAssets-gross));
  // Restriction and float may overlap. Reserve the greater, never sum them.
  cash=Math.max(0,gross-Math.max(reserve,y.cashExclusion?.amount??0));
  reason='Distribution float: cash reserved for current non-borrowing liabilities not covered by noncash current assets';
 }
 return {cash,reason};
}
