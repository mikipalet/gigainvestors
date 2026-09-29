'use client';
import { compactMoney, dataBarPath, niceTicks, scale } from '@/lib/value/viz/layout';
import { useWidth } from '@/lib/value/viz/use-width';
import { StatusGlyph } from './StatusGlyph';
import { DataTable } from './DataTable';
export function DollarTest({ retained, created, currency }: { retained: number | null; created: number | null; currency: string }) {
  const { ref, width } = useWidth();
  const rows = [['Retained earnings, 10 years', retained], ['Market value created', created]] as const;
  const ticks = niceTicks([Math.min(0, retained ?? 0, created ?? 0), Math.max(retained ?? 0, created ?? 0)], 3);
  const x = scale({ domain: [ticks[0], ticks.at(-1)!], range: [8, width - 85] });
  const result = retained === null || created === null ? 'unclear' : created >= retained ? 'pass' : 'fail';
  const sentence = retained !== null && retained > 0 && created !== null ? `Every retained dollar became $${(created / retained).toFixed(2)} of market value` : 'The $1 ratio is unavailable without positive retained earnings.';
  return <div ref={ref} className="value-viz min-w-0"><h3 className="text-xs font-medium">The $1 test</h3>
    <svg role="img" tabIndex={0} aria-label={sentence} width="100%" height="140" viewBox={`0 0 ${width} 140`}><title>{sentence}</title>
      {rows.map(([label, value], i) => <g key={label}><text x="8" y={20 + i * 49}>{label}</text>{value !== null && <><path d={dataBarPath({ x: Math.min(x(0), x(value)), y: 29 + i * 49, width: Math.abs(x(value) - x(0)), height: 12, direction: value >= 0 ? "right" : "left" })} fill={i ? 'var(--viz-ink)' : 'var(--viz-muted)'} /><text x={x(value) + 6} y={39 + i * 49}>{compactMoney(value)}</text></>}</g>)}
      <line x1={x(0)} x2={x(0)} y1="27" y2="94" stroke="var(--viz-grid)" />
      {ticks.map(t => <text key={t} className="viz-tick" x={x(t)} y="120" textAnchor={t === ticks[0] ? 'start' : 'middle'}>{compactMoney(t)}</text>)}
      <text className="viz-tick" x={width - 8} y="120" textAnchor="end">{currency}</text>
    </svg><p className="flex items-start gap-2 text-xs"><StatusGlyph result={result} label={`$1 test: ${result}`} />{sentence}</p>
    <DataTable caption="The $1 test" headers={['Measure', currency]} rows={rows.map(([label, value]) => [label, value === null ? 'Not reported' : compactMoney(value, currency)])} />
  </div>;
}
