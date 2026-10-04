import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { runNumericTests } from '@/lib/value/tests';
import { metricLabels, formatMetric } from '@/lib/value/metric-labels';
import { valueHref } from '@/lib/value/href';
import { comparableValuation } from '@/lib/value/site-valuation';
import { TestSection } from '@/components/value/TestSection';
import type { Valuation } from '@/lib/value/types';

describe('site currency and metric contracts', () => {
  it('labels every metric emitted for every company kind, including financial return keys', () => {
    for (const kind of ['operating', 'bank', 'insurer'] as const) {
      for (const test of Object.values(runNumericTests({ years: [], kind }))) {
        for (const key of Object.keys(test.metrics)) expect(metricLabels[key], key).toBeDefined();
      }
    }
  });
  it('compares only matching currencies or explicitly converted values', () => {
    const valuation = { currency: 'JPY', perShare: { low: 800, mid: 1000, high: 1200 } } as Valuation;
    expect(comparableValuation(valuation, 'USD')).toBeNull();
    expect(comparableValuation(valuation, 'JPY')?.perShare.mid).toBe(1000);
    expect(comparableValuation({ ...valuation, perShareTrading: { currency: "USD", fxRate: .01, low: 8, mid: 10, high: 12 } }, 'USD')?.perShare.mid).toBe(10);
  });
  it('keeps internal links in the current route namespace', () => {
    expect(valueHref('/ko.us', '/value')).toBe('/s/KO');
    expect(valueHref('/', '/value/ko.us')).toBe('/value');
    expect(valueHref('/ko.us', '/')).toBe('/s/KO');
    expect(valueHref('/', '/ko.us')).toBe('/value');
  });
  it('formats units and suppresses unknown metrics', () => {
    expect(formatMetric({ value: 410e9, format: 'money', currency: 'USD' })).toBe('$410B');
    expect(formatMetric({ value: 1.2e12, format: 'money', currency: 'JPY' })).toBe('JPY 1.20T');
    expect(formatMetric({ value: .03, format: 'pp' })).toBe('3.0 pp');
    const html = renderToStaticMarkup(createElement(TestSection, { test: { key: 'moat', result: 'pass', numeric: 'pass', reasons: [], metrics: { roicMedian: .31, mystery: 7 }, series: {}, jev: [] } }));
    expect(html).toContain('ROIC, median of available years');
    expect(html).toContain('31.0%');
    expect(html).not.toContain('mystery');
  });
});
