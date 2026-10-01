import type { Valuation } from '@/lib/value/types';
import { perShareMoney } from '@/lib/value/metric-labels';
import { useWidth } from '@/lib/value/viz/use-width';
export function CompactValue({ value, price, requiredMos }: {value:Valuation|null;price:number|null;requiredMos:number}) {
 const {ref,width}=useWidth();
 if(!value)return null;
 const {low,mid,high}=value.perShare,buy=mid*(1-requiredMos),max=Math.max(high,price??0)*1.1;
 const x=(n:number)=>8+n/max*(width-16),money=(n:number)=>perShareMoney(n,value.currency);
 const anchor=(n:number)=>x(n)>width*.65?'end':x(n)<width*.35?'start':'middle';
 return <figure ref={ref} className="compact-value"><svg viewBox={`0 0 ${width} 94`} role="img" aria-label={`Price ${price===null?'':money(price)}; mid ${money(mid)}; buy at ${money(buy)}`}>
 <path d={`M8 35H${width-8}`} stroke="var(--viz-grid)"/><rect x="8" y="27" width={Math.max(0,x(buy)-8)} height="16" fill="var(--viz-buy-tint)"/><rect x={x(low)} y="31" width={Math.max(2,x(high)-x(low))} height="8" fill="var(--viz-muted)"/>
 {price!==null&&<><circle cx={x(price)} cy="35" r="3" fill="var(--ink)"/><path d={`M${x(price)} 31V17`} stroke="var(--ink)"/><text x={x(price)} y="12" textAnchor={anchor(price)}>Price {money(price)}</text></>}
 <path d={`M${x(mid)} 29V58`} stroke="var(--ink)"/><text x={x(mid)} y="69" textAnchor={anchor(mid)}>Mid {money(mid)}</text>
 <path d={`M${x(buy)} 27V76`} stroke="var(--buy)"/><text x={x(buy)} y="89" textAnchor={anchor(buy)} fill="var(--buy)">Buy ≤ {money(buy)}</text>
 {price!==null&&Math.abs(price-mid)/max>.1&&<><path d={`M${x(mid)} 47v4H${x(price)}v-4`} fill="none" stroke="var(--viz-muted)"/><text x={(x(mid)+x(price))/2} y="46" textAnchor="middle">{(price/mid).toFixed(2)}×</text></>}
 </svg></figure>;
}
