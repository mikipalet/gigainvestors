import { T } from '@/lib/value/config';
import { compactMoney,niceTicks,scale,seriesPath,waterfallSteps } from '@/lib/value/viz/layout';
import { describe,expect,it } from 'vitest';

describe('visualization geometry', () => {
  it('makes finite scales for constant and negative domains', () => {
    expect(scale({ domain: [5, 5], range: [0, 100] })(5)).toBe(50);
    expect(scale({ domain: [-10, 10], range: [0, 100] })(0)).toBe(50);
  });
  it('uses clean ticks enclosing tiny, constant and negative data', () => {
    for (const domain of [[0.21, 0.29], [-0.031, 0.1], [5, 5], [0, 0], [1e9, 48e9]] as [number, number][]) {
      const ticks = niceTicks(domain, 4);
      expect(ticks.length).toBeGreaterThanOrEqual(2);
      expect(ticks.length).toBeLessThanOrEqual(5);
      expect(ticks[0]).toBeLessThanOrEqual(domain[0]);
      expect(ticks.at(-1)).toBeGreaterThanOrEqual(domain[1]);
      expect(ticks.every(Number.isFinite)).toBe(true);
    }
    expect(niceTicks([0, 43], 4)).toEqual([0, 20, 40, 60]);
  });
  it('formats compact money without losing the currency or negative sign', () => {
    expect(compactMoney(12_500_000_000, 'USD')).toBe('$13B');
    expect(compactMoney(-2_100_000, 'EUR')).toBe('EUR -2.1M');
    expect(compactMoney(0, 'USD')).toBe('$0');
    expect(compactMoney(-113_000_000_000, 'USD')).toBe('-$113B');
  });
  it('never connects across a missing fiscal year or null', () => {
    const path = seriesPath({ series: [[2020, 1], [2021, null], [2022, 3], [2024, 4]], x: x => x, y: y => y });
    expect(path.match(/M/g)).toHaveLength(3);
    expect(path).not.toContain('NaN');
  });
  it('connects waterfall balances including negative totals', () => {
    const steps = waterfallSteps([10, 2, -7, -8]);
    expect(steps.map(s => s.end)).toEqual([10, 12, 5, -3, -3]);
    expect(steps.at(-1)?.start).toBe(0);
  });

});

// Presentation must preserve the domain's three-way price verdict and financial n/a.
import { TestSection } from '@/components/value/TestSection';
import { BulletRow } from '@/components/value/viz/BulletRow';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
it('keeps an intermediate margin unclear rather than calling it a failure', () => {
  const html = renderToStaticMarkup(createElement(BulletRow, { label: 'Margin of safety', value: .089, threshold: T.price.requiredMos.stable, better: 'higher', format: 'pct', currency: 'USD', resultOverride: 'unclear' }));
  expect(html).toContain('Margin of safety: wait');
  expect(html).not.toContain('Margin of safety: fail');
});
it('identifies inapplicable bank metrics instead of drawing missing operating bullets', () => {
  const html = renderToStaticMarkup(createElement(TestSection, { kind: 'bank', test: { key: 'accounting', result: 'pass', numeric: 'pass', reasons: [], metrics: { accruals: null }, series: {}, jev: [] } }));
  expect(html).not.toContain('Sloan accruals');
  expect(html).not.toContain('Sloan accruals: Not reported');
});
