import { clamp } from '@/lib/value/viz/layout';
export function MarginBar({ value }: { value: number }) {
  const extent = Math.abs(clamp(value)) * 38;
  return <span className="value-viz inline-flex flex-col items-end gap-1 tabular-nums"><span>{(value * 100).toFixed(1)}%</span><svg width="80" height="10" role="img" tabIndex={0} aria-label={`${(value * 100).toFixed(1)}% margin of safety`}><title>{`${(value * 100).toFixed(1)}% margin of safety`}</title><rect x={value < 0 ? 40 - extent : 40} y="1" width={extent} height="8" fill={value < 0 ? 'var(--viz-sell-tint)' : 'var(--viz-buy-tint)'} /><line x1="40" x2="40" y1="0" y2="10" stroke="var(--viz-muted)" /></svg></span>;
}
