'use client';
import { useId } from 'react';
import type { Valuation } from '@/lib/value/types';
import { T } from '@/lib/value/config';
import { perShareMoney } from '@/lib/value/metric-labels';
import { compactMoney, niceTicks, scale } from '@/lib/value/viz/layout';
import { useWidth } from '@/lib/value/viz/use-width';
import { DataTable } from './DataTable';
import { ChartInteraction } from './ChartInteraction';
import { AsOf } from './Events';

export function FootballField({ valuation: v, price, mismatch, requiredMos = T.price.passMos, volatility, date, fy }: { valuation: Valuation; price: number | null; mismatch?: string | null; requiredMos?: number; volatility?: string; date?: string | null; fy?: number }) {
  const { ref, width } = useWidth();
  const gradient = useId();
  const { low, mid, high } = v.perShare;
  const comparedPrice = mismatch ? null : price;
  const buyBelow = mid * (1 - requiredMos);
  const ticks = niceTicks([Math.min(0, low, buyBelow), Math.max(high, comparedPrice ?? 0)], 4);
  const x = scale({ domain: [ticks[0], ticks.at(-1)!], range: [22, width - 22] });
  const money = (n: number) => perShareMoney(n, v.currency);
  const summary = `Estimated value ${low.toFixed(2)} to ${high.toFixed(2)} ${v.currency}, mid ${mid.toFixed(2)}; ${mismatch ?? (price === null ? 'No price yet' : `price ${price.toFixed(2)}; margin of safety ${(mid > 0 ? (1 - price / mid) * 100 : 0).toFixed(1)}%`)}`;
  const conclusion = comparedPrice === null ? 'A value range awaits a comparable price' : `${((1 - comparedPrice / mid) * 100).toFixed(1)}% margin of safety at the latest price`;
  const buyLabel = `buy below ${money(buyBelow)} (${requiredMos * 100}% below mid${volatility ? `, earnings are ${volatility === 'moderate' ? 'moderately volatile' : volatility}` : ''})`;
  const marks = [{ x: x(buyBelow), y: 48, text: buyLabel }, { x: x(low), y: 103, text: `Low estimate ${money(low)}` }, { x: x(mid), y: 80, text: `Midpoint ${money(mid)}` }, { x: x(high), y: 103, text: `High estimate ${money(high)}` }, ...(comparedPrice === null ? [] : [{ x: x(comparedPrice), y: 64, text: `Price ${money(comparedPrice)}` }])];
  return <figure ref={ref} className="value-viz mt-5" data-testid="football-field">
    <figcaption><h2 className="text-lg font-semibold">{conclusion}</h2><p className="mt-1 text-xs text-ink/60">{v.method === 'book_value' ? 'Book value' : 'Owner earnings'} · value per share, {v.currency}. Range from our assumptions, not a guarantee.</p><p className="sr-only">{summary}</p></figcaption>
    <p className="mt-3 text-xs">{buyLabel}</p>
    <ChartInteraction points={marks} width={width} height={166} label="Valuation and price marks" fallback={mismatch ?? (price === null ? 'No price yet' : undefined)}>
    <svg aria-hidden="true" width="100%" height="166" viewBox={`0 0 ${width} 166`}>
      <defs><linearGradient id={gradient}><stop offset="0" stopColor="var(--paper)"/><stop offset={`${high === low ? 50 : (mid - low) / (high - low) * 100}%`} stopColor="var(--viz-muted)"/><stop offset="1" stopColor="var(--paper)"/></linearGradient></defs>
      <rect x={x(ticks[0])} y="48" width={Math.max(0, x(buyBelow) - x(ticks[0]))} height="46" fill="var(--viz-buy-tint)" />
      <line x1={x(buyBelow)} x2={x(buyBelow)} y1="48" y2="94" stroke="var(--viz-ink)" />
      <line x1={22} x2={width - 22} y1="72" y2="72" stroke="var(--viz-grid)" />
      <g><rect x={x(low)} y="64" width={Math.max(1, x(high) - x(low))} height="16" rx="4" fill={`url(#${gradient})`} /></g>
      <g><line x1={x(mid)} x2={x(mid)} y1="60" y2="84" stroke="var(--viz-ink)" strokeWidth="2" /></g>
      {comparedPrice !== null && <g><path d={`M${x(comparedPrice)} 64l6 8 -6 8 -6 -8Z`} fill="var(--viz-ink)" stroke="var(--paper)" strokeWidth="2" /><text x={Math.max(22, Math.min(width - 22, x(comparedPrice)))} textAnchor={x(comparedPrice) > width * .7 ? 'end' : x(comparedPrice) < width * .3 ? 'start' : 'middle'} y="19">Price {money(comparedPrice)}</text></g>}
      {/* Split labels into lanes on narrow screens when the value range is compressed. */}
      {[low, mid, high].map((value, i) => <g key={i}><text x={i === 0 ? Math.max(85, x(value)) : i === 2 ? Math.min(width - 85, x(value)) : x(value)} textAnchor={i === 0 ? 'end' : i === 2 ? 'start' : 'middle'} y={i === 1 ? 119 : 103}>{['Low', 'Mid', 'High'][i]} {value.toFixed(2)}</text></g>)}
      <line x1="22" x2={width - 22} y1="139" y2="139" stroke="var(--viz-grid)" />
      {ticks.map(t => <g key={t}><line x1={x(t)} x2={x(t)} y1="139" y2="143" stroke="var(--viz-grid)" /><text className="viz-tick" x={x(t)} y="157" textAnchor="middle">{compactMoney(t)}</text></g>)}
    </svg></ChartInteraction>
    <AsOf date={date} fy={fy} />
    <DataTable caption="Valuation and price" headers={['Measure', v.currency]} rows={[
      ['Low estimate', low.toFixed(2)], ['Mid estimate', mid.toFixed(2)], ['High estimate', high.toFixed(2)], ['Buy below', buyBelow.toFixed(2)], ['Current price', mismatch ?? (price === null ? 'No price yet' : price.toFixed(2))],
    ]} />
  </figure>;
}
