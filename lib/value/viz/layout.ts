import type { Series } from '../types';

export function scale({ domain: [min, max], range: [start, end] }: { domain: [number, number]; range: [number, number] }) {
  return (value: number) => min === max ? (start + end) / 2 : start + (value - min) / (max - min) * (end - start);
}
export function niceTicks([lo, hi]: [number, number], count = 4): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1];
  if (lo === hi) { const pad = Math.abs(lo) * .1 || 1; lo -= pad; hi += pad; }
  const raw = (hi - lo) / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  let step = magnitude;
  for (const factor of [1, 2, 2.5, 5, 10, 20, 25, 50]) {
    step = factor * magnitude;
    if (Math.ceil(hi / step) - Math.floor(lo / step) + 1 <= count) break;
  }
  const start = Math.floor(lo / step), end = Math.ceil(hi / step);
  return Array.from({ length: end - start + 1 }, (_, i) => Number(((start + i) * step).toPrecision(12)));
}
export { compactMoney } from '@/lib/format';
export function seriesPath({ series, x, y }: { series: Series; x: (v: number) => number; y: (v: number) => number }) {
  let previous: number | null = null;
  return series.map(([fy, value]) => {
    if (value === null || !Number.isFinite(value)) { previous = null; return ''; }
    const command = previous === fy - 1 ? 'L' : 'M'; previous = fy;
    return `${command}${x(fy).toFixed(2)},${y(value).toFixed(2)}`;
  }).join('');
}
export function waterfallSteps(values: number[]) {
  let balance = 0;
  const steps = values.map((value, i) => { const start = i === 0 ? 0 : balance; balance += value; return { start, end: balance, value }; });
  return [...steps, { start: 0, end: balance, value: balance }];
}
// Round only the data end; the baseline remains square.
export function dataBarPath({ x, y, width, height, direction }: { x: number; y: number; width: number; height: number; direction: 'right' | 'left' | 'up' | 'down' }) {
  const r = Math.min(4, width / 2, height / 2), right = x + width, bottom = y + height;
  if (direction === 'right') return `M${x},${y}H${right-r}Q${right},${y} ${right},${y+r}V${bottom-r}Q${right},${bottom} ${right-r},${bottom}H${x}Z`;
  if (direction === 'left') return `M${right},${y}H${x+r}Q${x},${y} ${x},${y+r}V${bottom-r}Q${x},${bottom} ${x+r},${bottom}H${right}Z`;
  if (direction === 'up') return `M${x},${bottom}V${y+r}Q${x},${y} ${x+r},${y}H${right-r}Q${right},${y} ${right},${y+r}V${bottom}Z`;
  return `M${x},${y}V${bottom-r}Q${x},${bottom} ${x+r},${bottom}H${right-r}Q${right},${bottom} ${right},${bottom-r}V${y}Z`;
}

/** Axis labels use only the precision needed by the tick, independently of data cells. */
export function axisTick(value: number) {
  const magnitude=Math.abs(value);
  const [unit,suffix]=magnitude>=1e12?[1e12,'T']:magnitude>=1e9?[1e9,'B']:magnitude>=1e6?[1e6,'M']:magnitude>=1e3?[1e3,'K']:[1,''];
  return `${Number((value/Number(unit)).toPrecision(10))}${suffix}`;
}
