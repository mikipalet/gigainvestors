import {balanceSheetsFor,latestBalanceAt} from './latest-balance';
import {ownerCash} from './owner-cash';
import {trailingInputs} from './valuation-inputs';
import {valueCompany,valuationMargin} from './valuation';
import {applyShareCheck} from './share-check';
import {consistentValuation} from './return-model';
import type {Analysis,Fundamentals,Year,PriceHistory} from './types';

/** Refresh stock inputs without re-running quality judgements or changing the
 * reviewed annual history, share denominator, discount rate or FX convention. */
export function refreshBalanceValuation<T extends Analysis>(a:T,read:(file:string)=>unknown,cutoff:string):T {
 const old=a.valuation;
 if(!old||old.method==='nav')return a;
 const fundamentals=read(`fundamentals/${a.id}.json`) as Fundamentals|null;
 const inputs=read(`analysis/inputs/${a.id}.json`) as {memoYears?:Year[]}|null;
 const years=inputs?.memoYears??fundamentals?.years;
 if(!years?.length)return a;
 const annual=years.at(-1)!;
 const raw=read(`raw/eodhd/${a.id}.json`);
 const balance=latestBalanceAt(balanceSheetsFor(a.id,raw),cutoff,old.currency,annual);
 if(!balance&&(a.company.kind!=='operating'||!ownerCash(annual,a.company.industry).reason))return a;
 // TTM is constructed from the original annual row: annual capex judgements
 // must not leak into quarterly flows through the carried annual fields.
 const flowAnnual=fundamentals?.years.find(y=>y.end===annual.end)??annual;
 const result=valueCompany({years,ttm:trailingInputs(raw,flowAnnual,cutoff),balance,
  kind:a.company.kind,industry:a.company.industry,currency:old.currency,bondYield:old.bondYield,
  cyclical:a.volatility==='volatile',qualityPass:old.tier==='compounder',version:old.version,
  priceHistory:read(`prices-history/${a.id}.json`) as PriceHistory|null});
 let valuation=result.valuation;
 if(valuation){
  valuation=applyShareCheck({...a,valuation},{status:'verified',shares:old.shares,observations:[],reason:'Retain reviewed denominator'}).valuation!;
  valuation={...valuation,shareSources:old.shareSources,bondSource:old.bondSource,bondFlags:old.bondFlags,
   capitalReturns:old.capitalReturns,
   assumptions:[...valuation.assumptions.filter(s=>!s.startsWith('Share count verified')), ...old.assumptions.filter(s=>/Local 10-year yield:|Bond yield flags:|upkeep ≈|Share count verified/.test(s))],
   ...(old.perShareTrading?{perShareTrading:{...old.perShareTrading,low:valuation.perShare.low*old.perShareTrading.fxRate,mid:valuation.perShare.mid*old.perShareTrading.fxRate,high:valuation.perShare.high*old.perShareTrading.fxRate}}:{})};
  valuation=consistentValuation(valuation);
 }
 return {...a,valuation,valuationReason:result.reason,requiredMos:valuationMargin(valuation,a.volatility??'stable')};
}
