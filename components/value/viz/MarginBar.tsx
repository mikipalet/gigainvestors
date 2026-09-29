import { marginExtent } from '@/lib/value/viz/research';
export function MarginBar({ value }: { value: number }) {
  const extent = marginExtent(value);
  return <span className="value-viz inline-flex flex-col items-end gap-1 tabular-nums"><span>{(value * 100).toFixed(1)}%</span><span aria-hidden="true" className="relative block h-2 w-12 bg-ink/5"><span className="absolute inset-y-0 left-1/2 border-l border-ink/55"/><span className="absolute inset-y-0" style={{ width: extent, left: value < 0 ? 24 - extent : 24, background: value < 0 ? 'var(--viz-sell)' : 'var(--viz-buy)' }}/></span></span>;
}
