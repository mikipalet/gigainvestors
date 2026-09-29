import type { Series } from '../types';
export const logSeries = (series: Series): Series => series.map(([fy, value]) => [fy, value !== null && Number.isFinite(value) && value > 0 ? value : null]);
export function cagr(series: Series) {
  const points = series.filter((p): p is [number, number] => p[1] !== null && Number.isFinite(p[1]));
  const first = points[0], last = points.at(-1);
  return first && last && first[1] > 0 && last[1] > 0 && last[0] > first[0] ? (last[1] / first[1]) ** (1 / (last[0] - first[0])) - 1 : null;
}
export const marginExtent = (value: number) => value === 0 ? 0 : Math.max(2, Math.min(1, Math.abs(value)) * 24);
export const growthLabel = (value: number) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%/yr`;

export function logTicks([min, max]: [number, number], height = 166) {
  if (min === max) { min /= 2; max *= 2; }
  const candidates: number[] = [];
  for (let power = Math.floor(Math.log10(min)) - 1; power <= Math.ceil(Math.log10(max)); power++) {
    for (const factor of [1, 2, 5]) candidates.push(Number((factor * 10 ** power).toPrecision(12)));
  }
  const lower = candidates.findLastIndex(n => n <= min), upper = candidates.findIndex(n => n >= max);
  const enclosing = candidates.slice(lower, upper + 1);
  const span=Math.log(enclosing.at(-1)!/enclosing[0]);
  const spaced:number[]=[];
  for(const tick of enclosing) if(!spaced.length || Math.log(tick/spaced.at(-1)!)/span*height>=18) spaced.push(tick);
  const end=enclosing.at(-1)!;
  if(spaced.at(-1)!==end){if(Math.log(end/spaced.at(-1)!)/span*height<18)spaced.pop();spaced.push(end);}
  return spaced;
}
