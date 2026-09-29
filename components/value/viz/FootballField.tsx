'use client';
import { useState } from 'react';
import type { Valuation } from '@/lib/value/types';
import { T } from '@/lib/value/config';
import { perShareMoney } from '@/lib/value/metric-labels';
import { compactMoney, niceTicks, scale } from '@/lib/value/viz/layout';
import { useWidth } from '@/lib/value/viz/use-width';
import { DataTable } from './DataTable';

export function FootballField({ valuation: v, price, mismatch }: { valuation: Valuation; price: number | null; mismatch?: string | null }) {
  const { ref, width } = useWidth();
  const [tip, setTip] = useState<string | null>(null);
  const { low, mid, high } = v.perShare;
  const comparedPrice = mismatch ? null : price;
  const buyBelow = mid * (1 - T.price.passMos);
  const ticks = niceTicks([Math.min(0, low, buyBelow), Math.max(high, comparedPrice ?? 0)], 4);
  const x = scale({ domain: [ticks[0], ticks.at(-1)!], range: [22, width - 22] });
  const money = (n: number) => perShareMoney(n, v.currency);
  const summary = `Estimated value ${low.toFixed(2)} to ${high.toFixed(2)} ${v.currency}, mid ${mid.toFixed(2)}; ${mismatch ?? (price === null ? 'No price yet' : `price ${price.toFixed(2)}; margin of safety ${(mid > 0 ? (1 - price / mid) * 100 : 0).toFixed(1)}%`)}`;
  const focus = (text: string) => ({ tabIndex: 0, onFocus: () => setTip(text), onBlur: () => setTip(null), onPointerEnter: () => setTip(text), onPointerLeave: () => setTip(null), 'aria-label': text });
  return <div ref={ref} className="value-viz mt-5" data-testid="football-field">
    <div className="flex flex-wrap justify-between gap-2 text-xs text-ink/60"><span>{v.method === 'book_value' ? 'Book value' : 'Owner earnings'} · value per share</span><span>{v.currency}</span></div>
    <svg role="img" aria-label={summary} width="100%" height="166" viewBox={`0 0 ${width} 166`}>
      <g {...focus(`Buy below ${money(buyBelow)} for at least ${T.price.passMos * 100}% margin of safety`)}>
        <rect x={x(ticks[0])} y="48" width={Math.max(0, x(buyBelow) - x(ticks[0]))} height="46" fill="var(--viz-buy-tint)" />
        <text x={x(ticks[0]) + 5} y="41">buy below {money(buyBelow)}</text>
      </g>
      <line x1={22} x2={width - 22} y1="72" y2="72" stroke="var(--viz-grid)" />
      <g {...focus(`Estimated range ${money(low)} to ${money(high)}`)}><rect x={x(low)} y="64" width={Math.max(1, x(high) - x(low))} height="16" rx="4" fill="var(--viz-ink)" opacity=".2" /></g>
      <g {...focus(`Midpoint ${money(mid)}`)}><line x1={x(mid)} x2={x(mid)} y1="60" y2="84" stroke="var(--viz-ink)" strokeWidth="2" /></g>
      {comparedPrice !== null && <g {...focus(`Price ${money(comparedPrice)}`)}><path d={`M${x(comparedPrice)} 64l6 8 -6 8 -6 -8Z`} fill="var(--viz-ink)" stroke="var(--paper)" strokeWidth="2" /><text x={Math.max(22, Math.min(width - 22, x(comparedPrice)))} textAnchor={x(comparedPrice) > width * .7 ? 'end' : x(comparedPrice) < width * .3 ? 'start' : 'middle'} y="19">Price {money(comparedPrice)}</text></g>}
      {/* Split labels into lanes on narrow screens when the value range is compressed. */}
      {[low, mid, high].map((value, i) => <g key={i} {...focus(`${['Low', 'Mid', 'High'][i]} ${money(value)}`)}><text x={i === 0 ? Math.max(85, x(value)) : i === 2 ? Math.min(width - 85, x(value)) : x(value)} textAnchor={i === 0 ? 'end' : i === 2 ? 'start' : 'middle'} y={i === 1 ? 119 : 103}>{['Low', 'Mid', 'High'][i]} {value.toFixed(2)}</text></g>)}
      <line x1="22" x2={width - 22} y1="139" y2="139" stroke="var(--viz-grid)" />
      {ticks.map(t => <g key={t}><line x1={x(t)} x2={x(t)} y1="139" y2="143" stroke="var(--viz-grid)" /><text className="viz-tick" x={x(t)} y="157" textAnchor="middle">{compactMoney(t)}</text></g>)}
    </svg>
    <p className="viz-tooltip" role={tip ? 'tooltip' : undefined}>{tip ?? mismatch ?? (price === null ? 'No price yet' : 'Focus a mark to inspect the estimate and price.')}</p>
    <DataTable caption="Valuation and price" headers={['Measure', v.currency]} rows={[
      ['Low estimate', low.toFixed(2)], ['Mid estimate', mid.toFixed(2)], ['High estimate', high.toFixed(2)], ['Buy below', buyBelow.toFixed(2)], ['Current price', mismatch ?? (price === null ? 'No price yet' : price.toFixed(2))],
    ]} />
  </div>;
}
