import type { Valuation } from '@/lib/value/types';
import { perShareMoney } from '@/lib/value/metric-labels';
export function CompactValue({ value, price, requiredMos }: {value:Valuation|null;price:number|null;requiredMos:number}) {
 if(!value)return <figure className="compact-value"><figcaption>Comparable valuation unavailable</figcaption></figure>;
 const {low,mid,high}=value.perShare, buy=mid*(1-requiredMos);
 const max=Math.max(high,price??0)*1.08;
 const x=(n:number)=>n/max*100;
 return <figure className="compact-value"><figcaption><span>Price <b>{price===null?'Arriving':perShareMoney(price,value.currency)}</b></span><span>Mid value <b>{perShareMoney(mid,value.currency)}</b></span></figcaption><div className="compact-track" aria-hidden="true"><i className="buy-zone" style={{width:`${x(buy)}%`}}/><i className="value-range" style={{left:`${x(low)}%`,width:`${x(high)-x(low)}%`}}/><i className="mid-mark" style={{left:`${x(mid)}%`}}/><i className="buy-mark" style={{left:`${x(buy)}%`}}/>{price!==null&&<i className="price-mark" style={{left:`${x(price)}%`}}/>}</div><p>Buy ≤ {perShareMoney(buy,value.currency)} <span>· {requiredMos*100}% margin of safety</span></p></figure>;
}
