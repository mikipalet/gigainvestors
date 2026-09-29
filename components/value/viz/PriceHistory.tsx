'use client';
import { logTicks } from '@/lib/value/viz/research';
import { monthLabel } from '@/lib/value/presentation';
import { useId } from 'react';
import type { Dossier } from '@/lib/value/types';
import { T } from '@/lib/value/config';
import { compactMoney, scale } from '@/lib/value/viz/layout';
import { useWidth } from '@/lib/value/viz/use-width';
import { ChartInteraction } from './ChartInteraction';
import { DataTable } from './DataTable';
import { AsOf } from './Events';

export function PriceHistory({ dossier, domain: suppliedDomain, date }: { dossier: Dossier; domain?: [number, number]; date?: string | null }) {
  const { ref, width } = useWidth();
  const gradient = useId();
  const values = dossier.valueHistory?.filter(p => p.every(Number.isFinite) && p.slice(1).every(n=>n>0)) ?? [];
  const prices = dossier.priceHistory?.filter(p => Number.isFinite(p[1]) && p[1]>0 && /^\d{4}-\d{2}/.test(p[0])) ?? [];
  if (!values.length || !prices.length) return null;
  const requiredMos = dossier.requiredMos ?? T.price.requiredMos.stable;
  const money = (n: number) => `${dossier.company.currency} ${n.toFixed(2)}`;
  const monthYear = (month: string) => Number(month.slice(0, 4)) + (Number(month.slice(5, 7)) - 1) / 12;
  const domain: [number, number] = [Math.max(values[0][0], monthYear(prices[0][0])), monthYear(prices.at(-1)![0])];
  const visibleValues = values.filter(p => p[0] + 1 > domain[0] && p[0] <= domain[1]);
  const x = scale({ domain, range: [48, width - 110] });
  const ticks = logTicks([Math.min(...values.map(p=>p[1]*(1-requiredMos)),...prices.map(p=>p[1])),Math.max(...values.map(p=>p[3]),...prices.map(p=>p[1]))]);
  const project=scale({domain:[Math.log(ticks[0]),Math.log(ticks.at(-1)!)],range:[190,24]});
  const y=(value:number)=>project(Math.log(value));
  const latest = prices.at(-1)!;
  const matched = prices.flatMap(([month, price]) => { const value = values.find(p => p[0] === Number(month.slice(0, 4))); return value ? [price <= value[2] * (1 - requiredMos)] : []; });
  const title = `Price met the buy line in ${matched.filter(Boolean).length} of ${matched.length} months with an estimate`;
  const priceY = y(latest[1]);
  const buyY = y(values.at(-1)![2] * (1-requiredMos));
  const buyLabelY = Math.abs(priceY-buyY) < 18 ? buyY + (buyY > priceY ? 18 : -18) : buyY;
  const points = prices.filter(p => monthYear(p[0]) >= domain[0]).map(([month, price]) => { const value = values.find(p => p[0] === Number(month.slice(0, 4))); return { x: x(monthYear(month)), y: y(price), text: `${monthLabel(month)}${dossier.events?.filter(e=>e.fy===Number(month.slice(0,4))).map(e=>`; ${e.note}`).join('') ?? ''}, price ${money(price)}${value ? `; value ${money(value[1])} to ${money(value[3])}, mid ${money(value[2])}; buy below ${money(value[2] * (1 - requiredMos))}` : '; no fiscal-year value available'}` }; });
  return <figure ref={ref} className="value-viz mt-8" data-testid="price-history">
    <figcaption><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-xs text-ink/60">Price and estimated value per share, {dossier.company.currency}. Log scale. Monthly closes through {monthLabel(latest[0])} against fiscal-year estimates.</p></figcaption>
    <ChartInteraction points={points} width={width} height={258} label="Monthly price and fiscal-year value">
      <svg aria-hidden="true" width="100%" height="258" viewBox={`0 0 ${width} 258`}>
        <defs><linearGradient id={`${gradient}-upper`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--paper)"/><stop offset="1" stopColor="var(--viz-muted)"/></linearGradient><linearGradient id={`${gradient}-lower`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--viz-muted)"/><stop offset="1" stopColor="var(--paper)"/></linearGradient></defs>
        {ticks.map(t => <g key={t}><line x1="48" x2={width - 110} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)"/><text x="42" y={y(t)+3} textAnchor="end" className="viz-tick">{compactMoney(t)}</text></g>)}
        {visibleValues.map(([fy, low, mid, high]) => <g key={fy}><rect x={x(Math.max(domain[0],fy))} y={y(high)} width={Math.max(0,x(Math.min(domain[1],fy+1))-x(Math.max(domain[0],fy)))} height={Math.max(0,y(low)-y(high))} fill="var(--buy)" opacity=".12"/><line x1={x(Math.max(domain[0],fy))} x2={x(Math.min(domain[1],fy+1))} y1={y(mid)} y2={y(mid)} stroke="var(--ink)"/></g>)}
        {prices.map(([month,price]) => { const fy = monthYear(month), value = values.find(v => v[0] === Math.floor(fy)); return value && fy >= domain[0] && price < value[2]*(1-requiredMos) ? <rect key={month} x={x(fy)} y="24" width={Math.max(1,x(Math.min(domain[1],fy+1/12))-x(fy))} height="166" fill="var(--buy)" opacity=".2"/> : null; })}
        <path d={visibleValues.map(([fy,,mid],i) => `${i ? 'L' : 'M'}${x(Math.max(domain[0],fy))},${y(mid*(1-requiredMos))}H${x(Math.min(domain[1],fy+1))}`).join('')} fill="none" stroke="var(--buy)" strokeWidth="1.5"/>
        <path d={prices.filter(p => monthYear(p[0]) >= domain[0]).map(([month, close], i) => `${i ? 'L' : 'M'}${x(monthYear(month))},${y(close)}`).join('')} stroke="var(--viz-ink)" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
        {dossier.events?.map((event,i) => { const point=prices.find(p=>Number(p[0].slice(0,4))===event.fy); return point && monthYear(point[0])>=domain[0] ? <g key={i}><title>{event.note}</title><circle cx={x(monthYear(point[0]))} cy={y(point[1])} r="7" fill="var(--paper)" stroke="var(--ink)"/><text className="viz-event-number" x={x(monthYear(point[0]))} y={y(point[1])+3} textAnchor="middle">{i+1}</text></g>:null; })}
        <text x={width - 104} y={priceY+3}>Price {latest[1].toFixed(2)}</text>
        <line x1={width-110} x2={width-104} y1={buyY} y2={buyLabelY} stroke="var(--viz-ink)"/><text x={width - 102} y={buyLabelY+3}>Buy line</text>
        <path d={`M${width-30},${priceY}h6V${y(values.at(-1)![2])}h-6`} fill="none" stroke="var(--ink)"/>
        <text x={width-30} y="237" textAnchor="end">{(latest[1]/values.at(-1)![2]).toFixed(2)}× mid</text>
        <text x="48" y="210" className="viz-tick">FY{Math.floor(domain[0])}</text><text x={width-110} y="210" className="viz-tick" textAnchor="end">FY{Math.floor(domain[1])}</text>
      </svg>
    </ChartInteraction>
    <p className="text-xs text-ink/60">Buy line: {requiredMos * 100}% below each fiscal-year midpoint. Buy line uses today's required discount for every year. The shaded range reflects that year's assumptions.</p>
    <AsOf date={date ?? latest[0]} fy={values.at(-1)?.[0]}/>
    {visibleValues.some((v,i)=>i>0&&(v[2]/visibleValues[i-1][2]>2||v[2]/visibleValues[i-1][2]<.5))&&<p className="source-line">Large valuation changes: {visibleValues.filter((v,i)=>i>0&&(v[2]/visibleValues[i-1][2]>2||v[2]/visibleValues[i-1][2]<.5)).map(v=>`FY${v[0]}`).join(', ')}. Annual model inputs changed sharply; the range is not a continuous forecast. See historical assumptions.</p>}
    <details className="history-method"><summary>Historical assumptions</summary><ul>{dossier.historyAssumptions?.map((note,i)=><li key={i}>{note}</li>)}</ul></details>
    <DataTable summary="Show value data" caption="Fiscal-year value ranges" headers={['FY', 'Low', 'Mid', 'High', 'Buy below']} rows={values.map(([fy, low, mid, high]) => [fy, money(low), money(mid), money(high), money(mid*(1-requiredMos))])}/>
    <DataTable summary="Show price data" caption="Monthly closing prices" headers={['Month', dossier.company.currency]} rows={prices.map(([month, close]) => [monthLabel(month), close.toFixed(2)])}/>
  </figure>;
}
