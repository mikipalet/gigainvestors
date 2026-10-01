'use client';
import { validValueRange } from '@/lib/value/presentation';
import { useId } from 'react';
import type { Valuation } from '@/lib/value/types';
import { T } from '@/lib/value/config';
import { perShareMoney } from '@/lib/value/metric-labels';
import { axisTick, compactMoney, niceTicks, scale } from '@/lib/value/viz/layout';
import { useWidth } from '@/lib/value/viz/use-width';
import { DataTable } from './DataTable';
import { ChartInteraction } from './ChartInteraction';
import { AsOf } from './Events';

export function FootballField({ valuation: v, price, mismatch, requiredMos = T.price.requiredMos.stable, volatility, date, fy, uncertainty }: { valuation: Valuation; price: number | null; mismatch?: string | null; requiredMos?: number; volatility?: string; date?: string | null; fy?: number; uncertainty?: string }) {
  const { ref, width } = useWidth();
  const gradient = useId();
  const { low, mid, high } = v.perShare;
  if (!validValueRange(v.perShare)) return null;
  const comparedPrice = mismatch || !Number.isFinite(mid) || mid <= 0 ? null : price;
  const buyBelow = mid * (1 - requiredMos);
  const maximum=Math.max(high,comparedPrice??0)*1.1;
  const ticks=niceTicks([0,maximum],width<480?3:5).filter(t=>t>=0&&t<=maximum);
  const x = scale({ domain: [0, maximum], range: [40, width - 40] });
  const money = (n: number) => perShareMoney(n, v.currency);
  const summary = `Estimated value ${low.toFixed(2)} to ${high.toFixed(2)} ${v.currency}, mid ${mid.toFixed(2)}; ${mismatch ?? (comparedPrice === null ? 'Comparable price and positive value required' : `price ${comparedPrice.toFixed(2)}; ${(comparedPrice / mid).toFixed(2)} times mid value`)}`;
  const conclusion = comparedPrice === null ? 'A value range awaits a comparable price' : comparedPrice <= mid ? `${((1 - comparedPrice / mid) * 100).toFixed(1)}% below our mid estimate` : `Price is ${(comparedPrice / mid).toFixed(2)}× our mid estimate`;
  const buyLabel = `buy below ${money(buyBelow)} (${requiredMos * 100}% below mid${volatility ? `, earnings are ${volatility === 'moderate' ? 'moderately volatile' : volatility}` : ''})`;
  const marks = [{ x: x(buyBelow), y: 48, text: buyLabel }, { x: x(low), y: 103, text: `Low estimate ${money(low)}` }, { x: x(mid), y: 80, text: `Midpoint ${money(mid)}` }, { x: x(high), y: 103, text: `High estimate ${money(high)}` }, ...(comparedPrice === null ? [] : [{ x: x(comparedPrice), y: 64, text: `Price must ${comparedPrice>buyBelow ? `fall ${((1-buyBelow/comparedPrice)*100).toFixed(0)}% to reach` : `rise ${((buyBelow/comparedPrice-1)*100).toFixed(0)}% to leave`} the buy line at ${money(buyBelow)}` }])];
  return <figure ref={ref} className="value-viz mt-5" data-testid="football-field">
    <figcaption><h2 className="text-lg font-semibold">{uncertainty ?? conclusion}</h2><p className="mt-1 text-xs text-ink/60">{v.method === 'nav' ? 'NAV' : v.method === 'book_value' ? 'Book value' : 'Owner earnings'} · value per share, {v.currency}.</p><p className="sr-only">{summary}</p></figcaption>
    <p className="mt-3 text-xs">{buyLabel}</p>
    <ChartInteraction points={marks} width={width} height={212} label="Valuation and price marks" fallback={mismatch ?? (price === null ? 'No price yet' : undefined)}>
    <svg aria-hidden="true" width="100%" height="212" viewBox={`0 0 ${width} 212`}>
      <defs><linearGradient id={gradient}><stop offset="0" stopColor="var(--paper)"/><stop offset={`${high === low ? 50 : (mid - low) / (high - low) * 100}%`} stopColor="var(--viz-muted)"/><stop offset="1" stopColor="var(--paper)"/></linearGradient></defs>
      <rect x={x(ticks[0])} y="48" width={Math.max(0, x(buyBelow) - x(ticks[0]))} height="46" fill="var(--viz-buy-tint)" />
      <line x1={x(buyBelow)} x2={x(buyBelow)} y1="48" y2="94" stroke="var(--viz-ink)" />
      <line x1={22} x2={width - 22} y1="72" y2="72" stroke="var(--viz-grid)" />
      <g><rect x={x(low)} y="64" width={Math.max(1, x(high) - x(low))} height="16"  fill={`url(#${gradient})`} /></g>
      <g><line x1={x(mid)} x2={x(mid)} y1="60" y2="84" stroke="var(--viz-ink)" strokeWidth="2" /></g>
      {comparedPrice !== null && <g><line x1={x(comparedPrice)} x2={x(comparedPrice)} y1="62" y2="94" stroke="var(--viz-ink)" strokeWidth="2" /><text x={Math.max(22, Math.min(width - 22, x(comparedPrice)))} textAnchor={x(comparedPrice) > width * .7 ? 'end' : x(comparedPrice) < width * .3 ? 'start' : 'middle'} y="14">Price {money(comparedPrice)}</text></g>}
      {[{value:mid,label:`Mid ${money(mid)}`,y:110},{value:buyBelow,label:`Buy ${money(buyBelow)}`,y:132}].map(mark=>{
        const tx=Math.max(20,Math.min(width-20,x(mark.value)));
        return <g key={mark.label}><line x1={x(mark.value)} x2={tx} y1="84" y2={mark.y-12} stroke="var(--viz-muted)"/><text x={tx} y={mark.y} textAnchor={tx<width/2?'start':'end'}>{mark.label}</text></g>;
      })}
      <text x="22" y="42">Range {money(low)}–{money(high)}</text>
      {comparedPrice!==null&&<g><path d={`M${x(mid)},152v6H${x(comparedPrice)}v-6`} stroke="var(--ink)" fill="none"/><text x={Math.max(60,Math.min(width-60,(x(mid)+x(comparedPrice))/2))} y="174" textAnchor="middle">{(comparedPrice/mid).toFixed(2)}× mid</text></g>}
      {ticks[0]>0&&<text x="4" y="180" className="viz-tick">0 ⫽</text>}<line x1="22" x2={width - 22} y1="184" y2="184" stroke="var(--viz-grid)" />
      {ticks.map(t => <g key={t}><line x1={x(t)} x2={x(t)} y1="184" y2="188" stroke="var(--viz-grid)" /><text className="viz-tick" x={x(t)} y="205" textAnchor="middle">{axisTick(t)}</text></g>)}
    </svg></ChartInteraction>
    <p className="source-line">Axis in {v.currency}. Range from our assumptions, not a guarantee.{mid===high?' Mid and high estimates coincide.':''}</p>
    <AsOf date={date} fy={fy} />
    <DataTable caption="Valuation and price" headers={['Measure', v.currency]} rows={[
      ['Low estimate', low.toFixed(2)], ['Mid estimate', mid.toFixed(2)], ['High estimate', high.toFixed(2)], ['Buy below', buyBelow.toFixed(2)], ['Current price', mismatch ?? (price === null ? 'No price yet' : price.toFixed(2))],
    ]} />
  </figure>;
}
