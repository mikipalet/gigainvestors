import { createUsdRate } from '../fx';
import { sameCurrency } from '../currency';
import type { Analysis, PriceMap } from '../types';
import type { ThesisMarket } from './types';
import { applyShareCheck, type ShareCheck } from '../share-check';

/** All denominators are absolute reporting-currency units; book equity is never used. */
export function marketContext(input:Analysis,quote:PriceMap[string]|null,rates:Record<string,number>,currency:string,shareCheck:ShareCheck|null=null):ThesisMarket {
 const a=applyShareCheck(input,shareCheck);
 const v=a.valuation,usd=createUsdRate({rates});
 const fx=v&&(sameCurrency(v.currency,a.company.currency)?1:v.perShareTrading&&sameCurrency(v.perShareTrading.currency,a.company.currency)?v.perShareTrading.fxRate:null);
 const capital=v&&sameCurrency(v.currency,currency)&&quote&&quote[0]>0&&v.shares>0&&fx&&fx>0?quote[0]*v.shares/fx:null;
 const rate=usd(currency),capUsd=a.company.marketCapUsd;
 const fallback=capUsd&&capUsd>0&&rate?capUsd/rate:null;
 const earnings=v&&sameCurrency(v.currency,currency)?v.method==='owner_earnings'?v.normalized:v.financialReturn?v.financialReturn.cashPerShare*v.shares:null:null;
 return {currency,marketValue:capital??fallback,ownerEarnings:earnings!=null&&Number.isFinite(earnings)&&earnings>0?earnings:null,asOf:capital?quote![1]:'cached capitalization',basis:capital?'quote × shares':'cached USD capitalization converted with cached FX',usdRates:rates};
}
