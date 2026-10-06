import {balanceSheetsFor,latestBalanceAt,correctFinancialBalances} from './latest-balance';
import {correctCachedTrailingSources} from './annual-source-corrections';
import {ownerCash} from './owner-cash';
import {trailingInputs} from './valuation-inputs';
import {valueCompany,valuationMargin} from './valuation';
import {applyShareCheck,withShareDenominator,type ShareCheck} from './share-check';
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
 const currentCommonBalance=(read(`raw/reviewed-common-balance/${a.id}.json`) as Fundamentals['currentCommonBalance'])??fundamentals?.currentCommonBalance;
 const balance=latestBalanceAt(a.company.kind==='operating'?balanceSheetsFor(a.id,raw):correctFinancialBalances(balanceSheetsFor(a.id,raw),read(`raw/sec-companyfacts/${a.id}.json`),cutoff),cutoff,old.currency,annual,a.company.kind);
 if(!balance&&!currentCommonBalance&&(!old.balanceSheet?.end||old.balanceSheet.end===annual.end)&&(a.company.kind!=='operating'||!ownerCash(annual,a.company.industry).reason))return a;
 // TTM is constructed from the original annual row: annual capex judgements
 // must not leak into quarterly flows through the carried annual fields.
 const flowAnnual=fundamentals?.years.find(y=>y.end===annual.end)??annual;
 const result=valueCompany({years,ttm:correctCachedTrailingSources(a.id,trailingInputs(raw,flowAnnual,cutoff),read as any),balance,currentCommonBalance,cutoff,
  kind:a.company.kind,industry:a.company.industry,currency:old.currency,bondYield:old.bondYield,
  cyclical:a.volatility==='volatile',qualityPass:old.tier==='compounder',version:old.version,
  priceHistory:read(`prices-history/${a.id}.json`) as PriceHistory|null});
 let valuation=result.valuation;
 if(valuation){
  if(valuation.shareBasis==='effective-common')valuation=applyShareCheck({...a,valuation},read(`enrichment-v7/share-checks/${a.id}.json`) as ShareCheck|null).valuation!;
  else valuation=withShareDenominator(valuation,old.shares);
  valuation={...valuation,shareBasis:valuation.shareBasis??(old.shareBasis==='listing-ADS'?'listing-ADS':undefined),shareSources:valuation.shareBasis==='effective-common'?valuation.shareSources:old.shareSources,bondSource:old.bondSource,bondFlags:old.bondFlags,
   capitalReturns:old.capitalReturns,publishedShareReview:old.publishedShareReview,shareReviewReasons:old.shareReviewReasons,
   assumptions:[...valuation.assumptions.filter(s=>!s.startsWith('Share count verified')), ...old.assumptions.filter(s=>/Local 10-year yield:|Bond yield flags:|upkeep ≈|Previously published share basis retained/.test(s)||valuation?.shareBasis!=='effective-common'&&/Share count verified/.test(s))],
   ...(old.perShareTrading?{perShareTrading:{...old.perShareTrading,low:valuation.perShare.low*old.perShareTrading.fxRate,mid:valuation.perShare.mid*old.perShareTrading.fxRate,high:valuation.perShare.high*old.perShareTrading.fxRate}}:{})};
  valuation=consistentValuation(valuation);
 }
 return {...a,valuation,valuationReason:result.reason,requiredMos:valuationMargin(valuation,a.volatility??'stable')};
}
