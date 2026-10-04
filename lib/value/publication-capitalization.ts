import {currencyCode, marketCapCurrency} from './currency';
import type {Analysis, PriceMap} from './types';
import type {ShareObservation} from './share-check';

type RecordValue = Record<string, any>;
const record = (v: unknown): RecordValue => v && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : {};
const positive = (v: unknown): number | null => v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(Number(v)) && Number(v)>0 ? Number(v) : null;
const agrees = (a:number,b:number) => Math.abs(a/b-1)<=.02;

/** Market capitalization counts current outstanding shares, not the weighted
 * diluted denominator of an earnings model. A dated balance observation checks
 * the listing basis; it is not claimed as an independent vendor verification.
 * Ambiguous ADRs, classes and large unexplained differences stay guarded. */
export function publicationCapitalization(analysis:Analysis, raw:unknown, quote:PriceMap[string]|undefined, usdRate:number|null, splits:Array<{date:string;factor:number}>=[], issuerObservations:ShareObservation[]=[]) {
 const unchanged=(reason:string)=>({analysis,capShares:undefined as number|undefined,evidence:{id:analysis.id,reason}});
 const data=record(raw),g=record(data.General),stats=positive(record(data.SharesStats).SharesOutstanding);
 if(!quote||!positive(quote[0])||!positive(usdRate)||!stats)return unchanged('Current listing share/quote/FX evidence unavailable');
 if(g.Type!=='Common Stock'||analysis.company.exchange==='US'&&analysis.company.country!=='US'
   ||/\bADR\b|depositary|\bclass\s+[A-Z]\b|\b(?:non.?voting|preferred)\b/i.test(`${g.Name??''} ${analysis.company.name}`)
   ||/-[AB]\./.test(analysis.id))return unchanged('ADR or class-share basis requires explicit reconciliation');
 const currency=analysis.company.currency;
 const minor=currencyCode(currency)!==marketCapCurrency(currency);
 if(typeof g.CurrencyCode!=='string'||marketCapCurrency(g.CurrencyCode)!==marketCapCurrency(currency))return unchanged('Vendor and listing currencies disagree');
 const updated=String(g.UpdatedAt??'').slice(0,10),date=quote[1];
 const age=(Date.parse(date)-Date.parse(updated))/86400000;
 if(!Number.isFinite(age)||age < -1||age>14)return unchanged('Current share observation is not contemporaneous with the quote');
 const quarters=record(record(record(data.Financials).Balance_Sheet).quarterly);
 const observation=Object.entries(quarters).filter(([end,row])=>end<=date&&Date.parse(date)-Date.parse(end)<=200*86400000&&positive(record(row).commonStockSharesOutstanding))
   .sort(([a],[b])=>b.localeCompare(a))[0];
 // A reviewed filing can supersede a vendor's weighted/diluted balance field.
 // Keep the same age and agreement limits, require the entire ordinary equity
 // basis, and never select an older observation merely because it agrees.
 const issuer=issuerObservations.filter(o=>o.source.startsWith('issuer:')&&!o.corroborationOnly
   &&o.basis==='all-ordinary-outstanding'&&/^https:\/\//.test(o.url??'')&&positive(o.shares)
   &&o.date&&o.date<=date&&Date.parse(date)-Date.parse(o.date)<=200*86400000)
   .sort((a,b)=>b.date!.localeCompare(a.date!))[0];
 if(!observation&&!issuer)return unchanged('No dated balance share observation supports the current share basis');
 const end=issuer?.date??observation![0],reported=issuer?.shares??positive(record(observation![1]).commonStockSharesOutstanding)!;
 const splitFactor=splits.filter(s=>s.date>end&&s.date<=date).reduce((factor,s)=>factor*s.factor,1);
 const balanceShares=agrees(stats,reported)?reported:reported*splitFactor;
 if(!agrees(stats,balanceShares))return unchanged('Current and dated balance shares do not reconcile within 2%');
 const cap=analysis.company.marketCapUsd,derived=quote[0]*stats*usdRate!;
 if(!positive(cap))return unchanged('No vendor capitalization to reconcile');
 const vendorCap=positive(record(data.Highlights).MarketCapitalization);
 // EODHD cap amounts are major units even when CurrencyCode says GBX.
 const unitMismatch=minor&&vendorCap!==null&&agrees(vendorCap*100/(quote[0]*stats),1);
 const ratio=cap!/derived;
 if(!agrees(cap!,derived)&&!(updated<date&&ratio>=.8&&ratio<=1.25)&&!unitMismatch)
   return unchanged('Same-date or large capitalization conflict requires review');
 const assumptions=analysis.valuation?.assumptions;
 const supportedCorrection=analysis.valuation&&agrees(analysis.valuation.shares,stats);
 const next={...analysis,company:{...analysis.company,marketCapUsd:derived},
   ...(analysis.valuation?{valuation:{...analysis.valuation,assumptions:assumptions!.filter(note=>
     !(supportedCorrection&&/^share count corrected to current /.test(note))
     &&!(unitMismatch&&/^current share sources disagree by more than 1.5x/.test(note)))}}:{})};
 return {analysis:next,capShares:stats,evidence:{id:analysis.id,reason:unitMismatch?'Minor-unit vendor cap':updated<date&&!agrees(cap!,derived)?'Dated vendor cap refreshed at current quote':'Current issuer shares replace annual diluted shares in cap check',
   priorCap:cap,cap:derived,currentShares:stats,valuationShares:analysis.valuation?.shares,quote,usdRate,updated,balanceDate:end,balanceShares,splitFactor,...(issuer?{shareObservation:issuer}:{})}};
}
