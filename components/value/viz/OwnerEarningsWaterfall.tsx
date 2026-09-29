import type { Valuation } from '@/lib/value/types';
import { compactMoney } from '@/lib/value/viz/layout';
export function OwnerEarningsWaterfall({ valuation: v }: { valuation: Valuation }) {
  const components = [/^net income$/i, /D&A/i, /maintenance capex/i, /stock compensation/i].map(pattern => v.bridge.find(row => pattern.test(row.label))?.value);
  if (components.some(value => value === undefined)) return <p>Components not reported; see the valuation table.</p>;
  const adjustments = components.slice(1).map((v,i)=>i ? -Math.abs(v!) : v!);
  const lease = v.bridge.find(row => /estimated lease payments/i.test(row.label));
  if (lease) adjustments.push(-Math.abs(lease.value));
  const max = Math.max(...adjustments.map(Math.abs),1);
  const rows = [['Net income',components[0]!],['+ D&A',adjustments[0]],['− Maintenance capex',adjustments[1]],['− Stock compensation',adjustments[2]],...(lease ? [['− Lease payments',adjustments[3]] as const] : []),['= Normalised owner earnings',v.normalized]] as const;
  return <figure className="earnings-bridge"><figcaption><h3>From reported profit to owner earnings</h3><p>Owner earnings total {compactMoney(v.normalized,v.currency)}. Components use the median owner-earnings observation. Adjustment bars share a separate scale so small deductions remain visible.</p></figcaption><dl>{rows.map(([label,value],i)=><div key={label}><dt>{label}</dt><dd>{compactMoney(value,v.currency)}</dd><dd aria-hidden="true">{i>0&&i<rows.length-1&&<span style={{width:`${Math.abs(value)/max*100}%`}}/>}</dd></div>)}</dl></figure>;

}
