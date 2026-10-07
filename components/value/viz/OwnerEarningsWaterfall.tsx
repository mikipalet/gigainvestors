import {ChartInteraction} from './ChartInteraction';
import {useWidth} from '@/lib/value/viz/use-width';
import type { Valuation } from '@/lib/value/types';
import { compactMoney } from '@/lib/value/viz/layout';
export function OwnerEarningsWaterfall({ valuation: v }: { valuation: Valuation }) {
  const {ref,width}=useWidth();
  if(v.method!=='owner_earnings')return null;
  const endpoint=v.bridge.findIndex(row=>/^= owner earnings$/i.test(row.label));
  if(endpoint<1)return null;
  const cashBasis=v.bridge.some(row=>/cash before maintenance/i.test(row.label));
  const labels:Record<string,string>={'net income':'Net income','+ D&A':'+ D&A','− maintenance capex':'− Maintenance capex','− stock compensation':'− Stock compensation','Stock compensation already expensed':'SBC already expensed','cash before maintenance investment':'Cash before maintenance investment'};
  const rows:Array<[string,number]>=[...v.bridge.slice(0,endpoint).map(row=>[labels[row.label]??row.label,row.value] as [string,number]),['= Normalised owner earnings',v.normalized]];
  const basis=v.assumptions.some(a=>a.startsWith('Normalized bridge scales')) ? 'Five-year normal margin at current revenue; components are scaled estimates' : v.assumptions.find(a=>/^bridge components use /i.test(a))?.replace(/^bridge components use /i,'Components use ')??'Components follow the normalized owner-earnings observation';
  const max=Math.max(...rows.slice(1,-1).map(([,value])=>Math.abs(value)),1);
  return <figure ref={ref} className="earnings-bridge"><figcaption><h3>{cashBasis?'From operating cash to owner earnings':'From reported profit to owner earnings'}</h3><p>Owner earnings total {compactMoney(v.normalized,v.currency)}. {basis}. Adjustment bars share a separate scale so small deductions remain visible.</p></figcaption><ChartInteraction width={width} height={rows.length*44} label="Owner earnings bridge" points={rows.map(([label,value],i)=>({x:width*.8,y:i*44+22,text:`${label}: ${compactMoney(value,v.currency)} · ${basis}.`}))}><dl>{rows.map(([label,value],i)=><div key={label} style={{height:44}}><dt>{label}</dt><dd>{compactMoney(value,v.currency)}</dd><dd aria-hidden="true">{i>0&&i<rows.length-1&&<span style={{width:`${Math.abs(value)/max*100}%`}}/>}</dd></div>)}</dl></ChartInteraction></figure>;

}
