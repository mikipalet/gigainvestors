'use client';
import type { Valuation } from '@/lib/value/types';
import { compactMoney, dataBarPath, niceTicks, scale, waterfallSteps } from '@/lib/value/viz/layout';
import { useWidth } from '@/lib/value/viz/use-width';
export function OwnerEarningsWaterfall({ valuation: v }: { valuation: Valuation }) {
  const { ref, width } = useWidth();
  const components = [/^net income$/i, /D&A/i, /maintenance capex/i, /stock compensation/i].map(pattern => v.bridge.find(row => pattern.test(row.label))?.value);
  if (components.some(value => value === undefined)) return <p className="text-sm text-ink/55">Components not reported; see the valuation table.</p>;
  const values = components.map((value, i) => i > 1 ? -Math.abs(value!) : value!);
  const steps = waterfallSteps(values);
  const ticks = niceTicks([Math.min(0, ...steps.flatMap(s => [s.start, s.end])), Math.max(...steps.flatMap(s => [s.start, s.end]))], 3);
  const y = scale({ domain: [ticks[0], ticks.at(-1)!], range: [151, 26] });
  const band = (width - 48) / 5, bw = Math.min(24, band - 2), x = (i: number) => 45 + band * (i + .5);
  const labels = [['Net', 'income'], ['+ D&A', ''], ['− Maint.', 'capex'], ['− Stock', 'comp.'], ['= Owner', 'earnings']];
  return <div ref={ref} className="value-viz"><svg role="img" aria-label={`Owner earnings: ${values.map(n => compactMoney(n, v.currency)).join(', ')}; total ${compactMoney(steps[4].end, v.currency)}`} width="100%" height="204" viewBox={`0 0 ${width} 204`}>
    {ticks.map(t => <g key={t}><line x1="42" x2={width - 2} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" /><text className="viz-tick" x="37" y={y(t) + 3} textAnchor="end">{compactMoney(t)}</text></g>)}
    {steps.map((s, i) => <g key={i} tabIndex={0} aria-label={`${labels[i].join(' ')}: ${compactMoney(s.value, v.currency)}`}><title>{`${labels[i].join(' ')}: ${compactMoney(s.value, v.currency)}`}</title>
      {i < 4 && <line x1={x(i) + bw / 2} x2={x(i + 1) - bw / 2} y1={y(s.end)} y2={y(s.end)} stroke="var(--viz-grid)" />}
      <path d={dataBarPath({ x: x(i) - bw / 2, y: Math.min(y(s.start), y(s.end)), width: bw, height: Math.max(1, Math.abs(y(s.end) - y(s.start))), direction: s.value >= 0 ? "up" : "down" })} fill={i === 0 || i === 4 ? 'var(--viz-ink)' : s.value < 0 ? 'var(--viz-sell)' : 'var(--viz-buy)'} opacity={i === 0 || i === 4 ? 1 : .7} />
      <text x={x(i)} y={Math.min(y(s.start), y(s.end)) - 7} textAnchor="middle">{i > 0 && i < 4 && s.value > 0 ? '+' : ''}{compactMoney(s.value)}</text>
      <text x={x(i)} y="176" textAnchor="middle">{labels[i][0]}<tspan x={x(i)} dy="14">{labels[i][1]}</tspan></text>
    </g>)}
  </svg></div>;
}
