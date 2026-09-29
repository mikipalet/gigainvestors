import { T } from '../config';
import type { Series } from '../types';

export const clamp = (v: number) => Math.max(-1, Math.min(1, v));
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
export const compactMoney = (value: number, currency = '') => `${currency} ${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`.trim();
export function seriesPath({ series, x, y }: { series: Series; x: (v: number) => number; y: (v: number) => number }) {
  let previous: number | null = null;
  return series.map(([fy, value]) => {
    if (value === null || !Number.isFinite(value)) { previous = null; return ''; }
    const command = previous === fy - 1 ? 'L' : 'M'; previous = fy;
    return `${command}${x(fy).toFixed(2)},${y(value).toFixed(2)}`;
  }).join('');
}
export function beeswarm({ points, width, gap = 10 }: { points: { id: string; value: number }[]; width: number; gap?: number }) {
  const placed: { id: string; value: number; x: number; y: number }[] = [];
  for (const point of [...points].sort((a, b) => a.value - b.value || a.id.localeCompare(b.id))) {
    const x = (clamp(point.value) + 1) / 2 * width;
    const neighbors = placed.filter(p => Math.abs(p.x - x) < gap);
    // Tangency candidates avoid the wasted space of a rectangular packing grid.
    const candidates = [0, ...neighbors.flatMap(p => { const dy = Math.sqrt(gap ** 2 - (x - p.x) ** 2) + .001; return [p.y + dy, p.y - dy]; })].sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
    const y = candidates.find(y => neighbors.every(p => Math.hypot(x - p.x, y - p.y) >= gap))!;
    placed.push({ ...point, x, y });
  }
  return placed;
}
export function waterfallSteps(values: number[]) {
  let balance = 0;
  const steps = values.map((value, i) => { const start = i === 0 ? 0 : balance; balance += value; return { start, end: balance, value }; });
  return [...steps, { start: 0, end: balance, value: balance }];
}
export function funnelCounts(entries: { tests: string; mos: number | null }[]) {
  return Array.from({ length: 7 }, (_, gate) => entries.filter(e => e.tests.slice(0, Math.min(gate, 5)) === 'P'.repeat(Math.min(gate, 5)) && (gate < 6 || (e.mos !== null && e.mos >= T.price.passMos))).length);
}

// Round only the data end; the baseline remains square.
export function dataBarPath({ x, y, width, height, direction }: { x: number; y: number; width: number; height: number; direction: 'right' | 'left' | 'up' | 'down' }) {
  const r = Math.min(4, width / 2, height / 2), right = x + width, bottom = y + height;
  if (direction === 'right') return `M${x},${y}H${right-r}Q${right},${y} ${right},${y+r}V${bottom-r}Q${right},${bottom} ${right-r},${bottom}H${x}Z`;
  if (direction === 'left') return `M${right},${y}H${x+r}Q${x},${y} ${x},${y+r}V${bottom-r}Q${x},${bottom} ${x+r},${bottom}H${right}Z`;
  if (direction === 'up') return `M${x},${bottom}V${y+r}Q${x},${y} ${x+r},${y}H${right-r}Q${right},${y} ${right},${y+r}V${bottom}Z`;
  return `M${x},${y}V${bottom-r}Q${x},${bottom} ${x+r},${bottom}H${right-r}Q${right},${bottom} ${right},${bottom-r}V${y}Z`;
}
