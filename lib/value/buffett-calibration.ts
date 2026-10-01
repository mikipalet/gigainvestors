/** Buffett evaluation helpers; legacy proposal retained alongside shared live scoring. */
import { ownerReturn } from './owner-return';
import { median, roic } from './metrics';
import { ownerEarningsBridge } from './owner-earnings';
import { presentValue } from './valuation';
import type { PriceHistory, Valuation, Year } from './types';

const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
export function quarterStart(end: string): string {
 const date = new Date(end);
 if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isFinite(+date) || date.toISOString().slice(0,10)!==end) throw new Error('Invalid purchase date');
 return `${end.slice(0,4)}-${String(Math.floor(date.getUTCMonth()/3)*3+1).padStart(2,'0')}-01`;
}
/** Filing strictly before the purchase quarter. Unknown dates are never assumed known. */
export function annualPrefix(years: Year[], filed: Record<string,string>, quarterEnd: string): Year[] {
 const cutoff=quarterStart(quarterEnd);
 return years.filter(y=>filed[y.end] && filed[y.end]>y.end && filed[y.end]<cutoff && y.end<cutoff).sort((a,b)=>a.fy-b.fy).map(y=>({...y}));
}
/** The corpus stores monthly closes without volume: this is NOT VWAP or execution cost. */
export function quarterPrice(prices: PriceHistory, end: string) {
 const start=quarterStart(end).slice(0,7), endMonth=end.slice(0,7);
 const rows=[...new Map(prices.filter(([m,p])=>m>=start&&m<=endMonth&&positive(p)))].sort(([a],[b])=>a.localeCompare(b));
 if(rows.length!==3) return null;
 return {price:rows.reduce((s,[,p])=>s+p,0)/3,low:Math.min(...rows.map(r=>r[1])),high:Math.max(...rows.map(r=>r[1])),method:'mean-monthly-close (not VWAP)' as const};
}
export type HoldingEvent={date:string;cusip:string;type:'first-observed'|'reentry'|'add';shares:number;held:number};
/** Inputs must already consolidate issuer rows/amendments. Adds are raw deltas, not trade confirmations. */
export function holdingEvents(quarters: Array<{date:string;holdings:Record<string,number>}>): HoldingEvent[] {
 const sorted=[...quarters].sort((a,b)=>a.date.localeCompare(b.date)), seen=new Set<string>(), results:HoldingEvent[]=[];
 const ordinal=(s:string)=>Number(s.slice(0,4))*4+Math.floor((Number(s.slice(5,7))-1)/3);
 for(let i=0;i<sorted.length;i++) {
  const q=sorted[i],prev=sorted[i-1];
  if(prev && ordinal(q.date)-ordinal(prev.date)===1) for(const [cusip,held] of Object.entries(q.holdings)) {
   const old=prev.holdings[cusip]??0;
   if(held>old && positive(held)) results.push({date:q.date,cusip,type:old>0?'add':seen.has(cusip)?'reentry':'first-observed',shares:held-old,held});
  }
  Object.keys(q.holdings).forEach(c=>seen.add(c));
 }
 return results;
}
export function scorePurchase(v: Valuation|null, mos:number, price:number|null, t5:string, eligible=true) {
 const mid=v?.perShareTrading?.mid??v?.perShare.mid;
 const buyPrice=positive(mid)?mid*(1-mos):null;
 const ratio=positive(price)&&positive(buyPrice)?price/buyPrice:null;
 // Share the live publication return calculation, including financials.
 const expectedReturn=ownerReturn(v,v?.perShareTrading?.currency??v?.currency??'',null,price)?.expected??null;
 const quality=t5==='PPPPP', returnPass=expectedReturn!==null&&v!==null&&expectedReturn>=v.discountRate;
 return {quality,buyPrice,ratio,expectedReturn,returnPass,pricePass:ratio!==null&&ratio<=1,
  buy:eligible&&quality&&ratio!==null&&ratio<=1&&returnPass,
  within20:eligible&&quality&&ratio!==null&&ratio<=1.2&&returnPass};
}
export type ProposalInput={valuation:Valuation;years:Year[];t5:string;cv:number|null;mos:number};
/** No identity, Berkshire ownership, size or ex-post outcome enters eligibility. */
export function proposeValuation({valuation:v,years,t5,cv,mos}:ProposalInput) {
 const fallback={valuation:v,mos,eligible:false,reason:'Requires five passes, stable or improving moderate margins, 11 positive annual OE/share observations and median ROIC ≥20%'};
 const history=[...years].sort((a,b)=>a.fy-b.fy),ys=history.slice(-11);
 if(v.method!=='owner_earnings'||t5!=='PPPPP'||cv===null||!Number.isFinite(cv)||cv>.35||ys.length!==11||ys.some((y,i)=>i>0&&y.fy!==ys[i-1].fy+1)) return fallback;
 const oe=ownerEarningsBridge(history).slice(-11).map(r=>positive(r.year.dilutedShares)&&positive(r.value)?r.value/r.year.dilutedShares:null);
 const returns=ys.slice(1).map(roic);
 // Infinity from negative invested capital is not evidence of a durable franchise.
 if(oe.some(p=>!positive(p))||returns.filter(r=>r!==null&&Number.isFinite(r)).length<8||(median(returns.filter((r):r is number=>r!==null&&Number.isFinite(r)))??0)<.2) return fallback;
 const values=oe as number[], decade=(values[10]/values[0])**.1-1, five=(values[10]/values[5])**.2-1;
 const growth=Math.max(0,Math.min(.12,.75*decade,.75*five));
 const latest=ys[10],prior=ys[7];
 const margins=ys.slice(1).map(y=>positive(y.revenue)&&y.operatingIncome!==null?y.operatingIncome/y.revenue:null);
 if(cv>.2&&(margins.some(m=>m===null)||margins[9]!<median(margins as number[])!))return fallback;
 const proposedMos=cv<=.2?.15:.25;
 if(latest.revenue===null||prior.revenue===null||latest.revenue<prior.revenue||growth<=0)return fallback;
 // Normalize in per-share units so buybacks do not mix historical aggregate earnings/current shares.
 const normalized=Math.min(median(values.slice(-3))!,values[10])*v.shares;
 // Preserve a lower complete TTM observation in the current valuation, if present.
 const ttmBinding=v.assumptions.some(a=>a.startsWith('bridge components use TTM'));
 const base=ttmBinding?Math.min(normalized,v.normalized):normalized;
 const highRate=v.discountRate-Math.min(.01,(v.discountRate-v.terminalGrowth)/2);
 const pv=(g:number,r:number)=>(presentValue({oe:base,g,r,terminal:v.terminalGrowth})+v.netCash)/v.shares;
 const perShare={low:pv(growth/2,v.discountRate+.01),mid:pv(growth,v.discountRate),high:pv(growth,highRate)};
 const proposed:Valuation={...v,normalized:base,growth,perShare,bridge:[],assumptions:[...v.assumptions,'Research proposal: three-year median per-share OE; 75% of lesser 10/5-year CAGR capped at 12%; MOS 15% stable / 25% moderate with nondeclining margins'],
  ...(v.perShareTrading?{perShareTrading:{currency:v.perShareTrading.currency,fxRate:v.perShareTrading.fxRate,low:perShare.low*v.perShareTrading.fxRate,mid:perShare.mid*v.perShareTrading.fxRate,high:perShare.high*v.perShareTrading.fxRate}}:{})};
 return {valuation:proposed,mos:proposedMos,eligible:true,reason:'durable-grower proposal',decade,five};
}
