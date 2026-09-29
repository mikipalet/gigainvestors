import { sameCurrency } from './currency';
import type { Dossier, Series, Valuation } from './types';

/** Aggregate capital in reporting currency. FX is reporting -> listing units.
 * Prefer published USD capitalisation; otherwise reconstruct from price and shares.
 * Never divide reporting earnings by a USD cap without a known conversion.
 */
export function reportingCapital(v: Valuation | null, trading: string, capUsd: number | null, price: number | null) {
 if (!v) return null;
 const fx=sameCurrency(v.currency,trading)?1:v.perShareTrading&&sameCurrency(v.perShareTrading.currency,trading)?v.perShareTrading.fxRate:null;
 const capital=sameCurrency(v.currency,'USD')&&capUsd!=null?capUsd:
  sameCurrency(trading,'USD')&&capUsd!=null&&fx&&fx>0?capUsd/fx:
  price!=null&&price>0&&v.shares>0&&fx&&fx>0?price*v.shares/fx:null;
 return capital!=null&&Number.isFinite(capital)&&capital>0?capital:null;
}
export function ownerReturn(v: Valuation | null, trading: string, capUsd: number | null, price: number | null) {
 const capital=reportingCapital(v,trading,capUsd,price);
 if(!v||v.method!=='owner_earnings'||capital===null||!Number.isFinite(v.normalized))return null;
 return {cash:v.normalized,capital,currency:v.currency,yield:v.normalized/capital,growth:v.growth};
}
const observations=(series:Series=[])=>series.filter((p):p is [number,number]=>p[1]!==null&&Number.isFinite(p[1])).sort((a,b)=>a[0]-b[0]);
export function referenceMetrics(d:Dossier, price:number|null) {
 const capital=reportingCapital(d.valuation,d.company.currency,d.company.marketCapUsd,price);
 const income=observations(d.series.netIncome).at(-1), retained=income?d.series.retainedEarnings?.find(p=>p[0]===income[0])?.[1]:null;
 const dividend=income&&retained!=null?income[1]-retained:null;
 const revenue=observations(d.series.revenue).slice(-11),first=revenue[0],last=revenue.at(-1);
 return {pe:capital&&income&&income[1]>0?capital/income[1]:null,
  dividendYield:capital&&dividend!=null&&dividend>=0?dividend/capital:null,
  netDebtToEarnings:d.valuation&&income&&income[1]>0?-d.valuation.netCash/income[1]:null,
  revenueGrowth:first&&last&&first[1]>0&&last[1]>0&&last[0]>first[0]?(last[1]/first[1])**(1/(last[0]-first[0]))-1:null,
  first:first?.[0],last:last?.[0],fy:income?.[0]};
}
export function cashAmount(n:number,currency:string) {
 return `${currency} ${new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n)}`;
}
