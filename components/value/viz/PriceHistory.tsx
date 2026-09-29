'use client';
import { useId } from 'react';
import type { Dossier } from '@/lib/value/types';
import { T } from '@/lib/value/config';
import { compactMoney, niceTicks, scale } from '@/lib/value/viz/layout';
import { useWidth } from '@/lib/value/viz/use-width';
import { ChartInteraction } from './ChartInteraction';
import { DataTable } from './DataTable';
import { AsOf, EventNotes, EventTicks } from './Events';

export function PriceHistory({ dossier, domain, date }: { dossier: Dossier; domain: [number, number]; date?: string | null }) {
  const { ref, width } = useWidth();
  const gradient = useId();
  const values = dossier.valueHistory?.filter(p => p.every(Number.isFinite)) ?? [];
  const prices = dossier.priceHistory?.filter(p => Number.isFinite(p[1]) && /^\d{4}-\d{2}/.test(p[0])) ?? [];
  if (!values.length || !prices.length) return null;
  const requiredMos = dossier.requiredMos ?? T.price.passMos;
  const money = (n: number) => `${dossier.company.currency} ${n.toFixed(2)}`;
  const monthYear = (month: string) => Number(month.slice(0, 4)) + (Number(month.slice(5, 7)) - 1) / 12;
  const x = scale({ domain, range: [48, width - 110] });
  const ticks = niceTicks([Math.min(0, ...values.map(p => p[1])), Math.max(...values.map(p => p[3]), ...prices.map(p => p[1]))], 4);
  const y = scale({ domain: [ticks[0], ticks.at(-1)!], range: [190, 24] });
  const latest = prices.at(-1)!;
  const matched = prices.flatMap(([month, price]) => { const value = values.find(p => p[0] === Number(month.slice(0, 4))); return value ? [price <= value[2] * (1 - requiredMos)] : []; });
  const title = `Price met the buy line in ${matched.filter(Boolean).length} of ${matched.length} matched months`;
  const priceY = y(latest[1]);
  const buyY = y(values.at(-1)![2] * (1-requiredMos));
  const buyLabelY = Math.abs(priceY-buyY) < 18 ? buyY + (buyY > priceY ? 18 : -18) : buyY;
  const points = prices.map(([month, price]) => { const value = values.find(p => p[0] === Number(month.slice(0, 4))); return { x: x(monthYear(month)), text: `${month}, price ${money(price)}${value ? `; value ${money(value[1])} to ${money(value[3])}, mid ${money(value[2])}; buy below ${money(value[2] * (1 - requiredMos))}` : '; no fiscal-year value available'}` }; });
  return <figure ref={ref} className="value-viz mt-8" data-testid="price-history">
    <figcaption><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-xs text-ink/60">Price and estimated value per share, {dossier.company.currency}. Monthly closes through {latest[0]} against fiscal-year assumptions, not a guarantee.</p></figcaption>
    <ChartInteraction points={points} width={width} height={244} label="Monthly price and fiscal-year value">
      <svg aria-hidden="true" width="100%" height="244" viewBox={`0 0 ${width} 244`}>
        <defs><linearGradient id={`${gradient}-upper`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--paper)"/><stop offset="1" stopColor="var(--viz-muted)"/></linearGradient><linearGradient id={`${gradient}-lower`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--viz-muted)"/><stop offset="1" stopColor="var(--paper)"/></linearGradient></defs>
        {ticks.map(t => <g key={t}><line x1="48" x2={width - 110} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)"/><text x="42" y={y(t)+3} textAnchor="end" className="viz-tick">{compactMoney(t)}</text></g>)}
        {values.map(([fy, low, mid, high]) => <g key={fy}><rect x={x(fy)} y={y(high)} width={Math.max(0, x(Math.min(domain[1], fy+1)) - x(fy))} height={Math.max(0, y(mid)-y(high))} fill={`url(#${gradient}-upper)`}/><rect x={x(fy)} y={y(mid)} width={Math.max(0, x(Math.min(domain[1], fy+1)) - x(fy))} height={Math.max(0, y(low)-y(mid))} fill={`url(#${gradient}-lower)`}/><line x1={x(fy)} x2={x(Math.min(domain[1], fy+1))} y1={y(mid*(1-requiredMos))} y2={y(mid*(1-requiredMos))} stroke="var(--viz-ink)"/></g>)}
        <path d={prices.map(([month, close], i) => `${i ? 'L' : 'M'}${x(monthYear(month))},${y(close)}`).join('')} stroke="var(--viz-ink)" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
        <text x={width - 104} y={priceY+3}>Price {latest[1].toFixed(2)}</text>
        <line x1={width-110} x2={width-104} y1={buyY} y2={buyLabelY} stroke="var(--viz-ink)"/><text x={width - 102} y={buyLabelY+3}>Buy line</text>
        <text x="48" y="210" className="viz-tick">FY{domain[0]}</text><text x={width-110} y="210" className="viz-tick" textAnchor="end">FY{Math.floor(domain[1])}</text><EventTicks events={dossier.events} x={x} y={218}/>
      </svg>
    </ChartInteraction>
    <p className="text-xs text-ink/60">Buy line: {requiredMos * 100}% below each fiscal-year midpoint. The shaded range reflects that year's assumptions.</p>
    <EventNotes events={dossier.events}/><AsOf date={date ?? latest[0]} fy={values.at(-1)?.[0]}/>
    <DataTable caption="Fiscal-year value ranges" headers={['FY', 'Low', 'Mid', 'High', 'Buy below']} rows={values.map(([fy, low, mid, high]) => [fy, money(low), money(mid), money(high), money(mid*(1-requiredMos))])}/>
    <DataTable caption="Monthly closing prices" headers={['Month', dossier.company.currency]} rows={prices.map(([month, close]) => [month, close.toFixed(2)])}/>
  </figure>;
}
