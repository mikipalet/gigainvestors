import { isInvestmentHolding } from './investment-nav';
import {qualityLtmAt,qualityLtmHistoryAt} from './quality-ltm';
import { qualityMetric } from './quality-metric';
import { publishedBuyPrice } from './buy-price';
import { valuationFlags } from './data-quality';
import { earningsVolatility } from './history';
import { checkIntegrity } from './integrity';
import { buyReturnInputs, ownerReturn } from './owner-return';
import { runNumericTests } from './tests';
import { QUALITY_TESTS,type Company,type Fundamentals,type PriceHistory,type SnapshotRow } from './types';
import { valueCompany, valuationMargin } from './valuation';
import { availableOn, trailingAt, type Interim } from './quarterly-inputs';
import { quarterEnd } from './time-travel';
import { applyAdjustments } from './judgement/apply';
import trust from './judgement/trust.json';
import type { JudgementRecord } from './judgement/types';

type QuarterBasis={priceDate:string;annual:number;annualEnd:string;annualFiled:string;ttmEnd:string;periods:Array<{end:string;filed:string;source:string}>};
const positive=(n:number|null|undefined):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const compact=(n:number|null)=>n===null||!Number.isFinite(n)?null:Number(n.toFixed(6));
export const QUARTER_ASSUMPTIONS=[
 'Calendar-quarter close; quality uses annual reports plus a reconciled four-quarter provisional LTM where each test has complete inputs. LTM-only verdict changes need two consecutive quarterly confirmations; annual replacements and missing-field fallback apply immediately. All statements must be filed strictly before quarter end, with a 90-day fallback for unknown filing dates.',
 'Valuation uses the existing annual normalization capped by filed trailing owner earnings: four consecutive quarters, two consecutive halves, otherwise the last annual report. Expected return is the IRR of the same valuation.',
 'Stored judgement is restricted to annual periods and evidence filed before quarter end. Current report readings and current share-count overrides are excluded.',
 'Cached financials may be restated. Current issuer classification, bond yields, FX and surviving universe are retained; this is not a vintage point-in-time backtest.',
 'Monthly close series are not interpolated; cached split bases may differ. Realized price gains exclude dividends.',
];

export function snapshotForQuarter({company,fundamentals,quarter,prices,latestPrice,filedByPeriod={},interims=[],judgement,bondYield,fxRate,asOf}: {
 company:Company;fundamentals:Fundamentals;quarter:string;prices:PriceHistory;latestPrice:[number,string]|null;filedByPeriod?:Record<string,string>;
 interims?:Interim[];judgement?:JudgementRecord|null;bondYield:number|null;fxRate:number|null;asOf:string;
}) {
 const cutoff=quarterEnd(quarter);
 if(cutoff>=asOf)return null;
 const annuals=fundamentals.years.filter(y=>y.end<cutoff&&availableOn(y.end,filedByPeriod[y.end])<cutoff).sort((a,b)=>a.fy-b.fy);
 const target=annuals.at(-1);
 if(!target||new Set(annuals.map(y=>y.fy)).size<10)return null;
 const pastPrices=prices.filter(([m,p])=>m<=cutoff.slice(0,7)&&positive(p)),monthly=new Map(pastPrices);
 const price=monthly.get(cutoff.slice(0,7));if(!positive(price))return null;
 const currency=target.currency??fundamentals.currency;
 const clean=annuals.map(y=>{
  const copy={...y};delete copy.maintenanceCapexJudgement;delete copy.marginOperatingIncomeJudgement;delete copy.acquisitionIssuanceJudgement;
  return {...copy,marketCap:positive(fxRate)&&positive(y.dilutedShares)&&positive(monthly.get(y.end.slice(0,7)))?monthly.get(y.end.slice(0,7))!*y.dilutedShares/fxRate:null};
 });
 const record=judgement?{...judgement,readings:judgement.readings.filter(r=>r.period&&annuals.some(y=>y.end===r.period)&&r.evidence&&r.evidence.filed<cutoff),numericFacts:judgement.numericFacts?.filter(f=>f.evidence.filed<cutoff&&annuals.some(y=>y.fy===f.fy)),facts:[]}:null;
 const adjusted=applyAdjustments(clean,record,trust,currency);
 const prefix:Fundamentals={id:fundamentals.id,currency,years:adjusted.years,integrity:{ok:true,reasons:[]},fetchedAt:fundamentals.fetchedAt,splits:fundamentals.splits?.filter(s=>s.date<cutoff)};
 prefix.integrity=checkIntegrity(prefix,{source:company.source,priceHistory:pastPrices});
 const qualityLtm=qualityLtmAt(fundamentals.qualityQuarters??[],prefix.years,cutoff,fundamentals.splits);
 const qualityLtmHistory=qualityLtmHistoryAt(fundamentals.qualityQuarters??[],prefix.years,cutoff,fundamentals.splits,qualityLtm);
 for(const ltm of qualityLtmHistory)if(positive(fxRate)&&positive(ltm.dilutedShares)&&positive(monthly.get(ltm.end.slice(0,7))))ltm.marketCap=monthly.get(ltm.end.slice(0,7))!*ltm.dilutedShares/fxRate;
 const numeric=runNumericTests({years:prefix.years,qualityLtm,qualityLtmHistory,kind:company.kind,industry:company.industry,priceHistoryPending:false});
 // Evidence can correct inputs; the verdict must always follow the resulting numbers.
 const t5=prefix.integrity.ok?QUALITY_TESTS.map(key=>numeric[key as keyof typeof numeric].numeric[0].toUpperCase()).join(''):'UUUUU';
 const volatility=earningsVolatility({opMarginCv:numeric.understandable.metrics.roeCv??numeric.understandable.metrics.opMarginCv??null});
 const investmentHolding=isInvestmentHolding(company,prefix.years);
 const trailing=trailingAt(interims,{...target,currency},cutoff);
 const valuation=prefix.integrity.ok&&(investmentHolding||bondYield!==null&&Number.isFinite(bondYield))&&positive(fxRate)
  ?valueCompany({investmentHolding,years:prefix.years,ttm:trailing?.year,kind:company.kind,currency,bondYield,cyclical:volatility==='volatile',priceHistory:pastPrices,qualityPass:t5==='PPPPP'}).valuation:null;
 const v:[number,number,number]|null=valuation?[valuation.perShare.low*fxRate!,valuation.perShare.mid*fxRate!,valuation.perShare.high*fxRate!]:null;
 if(valuation&&fxRate)valuation.perShareTrading={currency:company.currency,fxRate,low:v![0],mid:v![1],high:v![2]};
 const flags=valuationFlags({price,mid:v?.[1]??null,assumptions:valuation?.assumptions??[]}),mos=valuationMargin(valuation,volatility);
 const buy=publishedBuyPrice({buyReturnInputs:buyReturnInputs(valuation,company.currency),st:prefix.integrity.ok?'s':'i',t:t5,v,m:mos,dataQualityFlags:flags},[price,cutoff]);
 const expected=flags.length?null:ownerReturn(valuation,company.currency,null,price)?.expected??null;
 const gain=latestPrice&&positive(latestPrice[0])&&latestPrice[1]>=cutoff&&latestPrice[1]<=asOf?compact(latestPrice[0]/price-1):null;
 const basis:QuarterBasis={priceDate:cutoff,annual:target.fy,annualEnd:target.end,annualFiled:availableOn(target.end,filedByPeriod[target.end]),ttmEnd:trailing?.year.end??target.end,periods:trailing?.periods.map(({end,filed,source})=>({end,filed,source}))??[]};
 const row:SnapshotRow=[company.id,t5,v&&positive(v[1])?compact(price/v[1]):null,buy.b,gain,{discount:mos,price,buyPrice:v&&positive(v[1])?v[1]*(1-mos):null},qualityMetric(company.kind,numeric.moat.metrics),{annual:basis.annual,ttm:basis.ttmEnd,expected:compact(expected)}];
 return {row,basis,valuation,ttm:trailing?.year??null,integrity:prefix.integrity,numeric,qualityLtm};
}
