import {valuationReturnModel,modelReturn,cashCoversPrice} from './return-model';
import { T } from './config';
import { sameCurrency } from './currency';
import type { Dossier, Series, Valuation } from './types';

/** Aggregate capital in reporting currency. FX is reporting -> listing units.
 * Use the current quote and shares; cached USD capitalisation is a fallback when the quote is unavailable.
 * Never divide reporting earnings by a USD cap without a known conversion.
 */
function reportingCapital(v: Valuation | null, trading: string, capUsd: number | null, price: number | null) {
 if (!v) return null;
 const fx=sameCurrency(v.currency,trading)?1:v.perShareTrading&&sameCurrency(v.perShareTrading.currency,trading)?v.perShareTrading.fxRate:null;
 const capital=price!=null&&price>0&&v.shares>0&&fx&&fx>0?price*v.shares/fx:
  sameCurrency(v.currency,'USD')&&capUsd!=null?capUsd:
  sameCurrency(trading,'USD')&&capUsd!=null&&fx&&fx>0?capUsd/fx:null;
 return capital!=null&&Number.isFinite(capital)&&capital>0?capital:null;
}
export function ownerReturn(v: Valuation | null, trading: string, capUsd: number | null, price: number | null) {
 const capital=reportingCapital(v,trading,capUsd,price);
 if(!v||capital===null||!Number.isFinite(v.normalized)||!Number.isFinite(v.growth))return null;
 const model=valuationReturnModel(v);
 const expected=model&&modelReturn(model,capital/v.shares);
 if(expected===null||expected===undefined)return null;
 const cash=v.method==='owner_earnings'?v.normalized:v.method==='book_value'?model!.terminalCash*v.shares:0;
 return {cash,capital,currency:v.currency,yield:cash/capital,growth:v.growth,expected};
}

export function requiredReturnCopy(v: Valuation | null, country: string) {
 if (!v || !Number.isFinite(v.discountRate)) return '';
 if (v.method === 'nav') return 'required return 10.0% a year';
 const rate = `required return ${(v.discountRate * 100).toFixed(1)}% a year`;
 return v.bondYield === null || !Number.isFinite(v.bondYield) ? rate
  : `${rate} (${v.discountRate === T.valuation.minDiscount ? '10% floor; ' : ''}${country} 10-year bond ${(v.bondYield * 100).toFixed(1)}% + 4 points)`;
}
export function expectedReturnCopy(owner: NonNullable<ReturnType<typeof ownerReturn>>, valuation: Valuation | null, _country: string) {
 return `About ${(owner.expected*100).toFixed(1)}% a year at today's price (needs ${((valuation?.discountRate??.1)*100).toFixed(1)}%)`;
}

const observations=(series:Series=[])=>series.filter((p):p is [number,number]=>p[1]!==null&&Number.isFinite(p[1])).sort((a,b)=>a[0]-b[0]);
export function referenceMetrics(d:Dossier, price:number|null) {
 const capital=reportingCapital(d.valuation,d.company.currency,d.company.marketCapUsd,price);
 const income=observations(d.series.netIncome).at(-1), retained=income?d.series.retainedEarnings?.find(p=>p[0]===income[0])?.[1]:null;
 const dividend=income&&retained!=null?income[1]-retained:null;
 const revenue=observations(d.series.revenue).slice(-11),first=revenue[0],last=revenue.at(-1);
 return {pe:capital&&income&&income[1]>0?capital/income[1]:null,
  dividendYield:capital&&dividend!=null&&dividend>=0?dividend/capital:null,
  netDebtToEarnings:d.valuation&&income&&income[1]>0?(d.valuation.netDebt !== undefined ? d.valuation.netDebt/income[1] : d.valuation.version === 2 ? null : -d.valuation.netCash/income[1]):null,
  revenueGrowth:first&&last&&first[1]>0&&last[1]>0&&last[0]>first[0]?(last[1]/first[1])**(1/(last[0]-first[0]))-1:null,
  first:first?.[0],last:last?.[0],fy:income?.[0]};
}

/** Quote-sensitive return inputs in listing currency; absent estimates cannot pass the hurdle. */
export function buyReturnInputs(v: Valuation | null, trading: string) {
 if(!v)return null;
 const fx=sameCurrency(v.currency,trading)?1:v.perShareTrading&&sameCurrency(v.perShareTrading.currency,trading)?v.perShareTrading.fxRate:null;
 const model=valuationReturnModel(v);
 if(!model||!fx||fx<=0)return null;
 return {cashPerShare:model.terminalCash*fx,growth:v.growth,requiredReturn:v.discountRate,
  model:{...model,cashNow:model.cashNow*fx,annual:model.annual.map(c=>c*fx),terminalCash:model.terminalCash*fx}};
}

/** The exact model parameters, shared by the price card and valuation drawer. */
export function returnModelCopy(v:Valuation,trading:string):string {
 const inputs=buyReturnInputs(v,trading),model=inputs?.model;
 if(!model)return '';
 const money=(n:number)=>`${trading} ${n.toFixed(2)}`;
 const pct=(n:number)=>`${(n*100).toFixed(1)}%`;
 if(v.method==='nav')return `NAV ${money(v.normalized*(v.perShareTrading?.fxRate??1))}/share; ${pct(v.growth)} total return reinvested for 10 years → ${money(model.annual[9])}/share at year 10.`;
 if(v.method==='book_value')return `Book ${money(v.normalized*(v.perShareTrading?.fxRate??1))}/share; ROE ${pct(v.financialReturn!.roe)}; first payout ${money(model.terminalCash)}/share, growing ${pct(v.growth)} perpetually (4× book payout cap applied).`;
 return `Owner cash ${money(v.normalized/v.shares*(v.perShareTrading?.fxRate??1))}/share; ${pct(v.growth)} growth ${v.tier==='compounder'?'fades over 10 years':'for 5 years, then fades'} to ${pct(v.terminalGrowth)}; excess cash ${money(model.cashNow)}/share today.`;
}

export function cashCoveredReturnCopy(v:Valuation|null,trading:string,price:number|null):string{
 const model=buyReturnInputs(v,trading)?.model;
 return model&&price!==null&&cashCoversPrice(model,price)?"Modelled excess cash covers today’s price; no finite annual IRR. The return hurdle is met.":"";
}
