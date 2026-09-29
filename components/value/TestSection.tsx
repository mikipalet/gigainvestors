import { metricLabels, formatMetric } from '@/lib/value/metric-labels';
import { T } from '@/lib/value/config';
import type { Kind, Series, TestOutcome } from '@/lib/value/types';
import { testLabels } from './TestChips';
import { StatusGlyph } from './viz/StatusGlyph';
import { ThresholdSeries } from './viz/ThresholdSeries';
import { BulletRow } from './viz/BulletRow';
import { DollarTest } from './viz/DollarTest';
import { JevAnswers } from './viz/JevAnswers';
import { DataTable } from './viz/DataTable';

export function TestSection({ test, currency = '', domain, netIncome, kind = 'operating' }: { test: TestOutcome; currency?: string; domain?: [number, number]; netIncome?: Series; kind?: Kind }) {
  const fiscalYears = Object.values(test.series).flat().map(p => p[0]);
  const years: [number, number] = domain ?? (fiscalYears.length ? [Math.min(...fiscalYears), Math.max(...fiscalYears)] : [0, 1]);
  const seriesKeys: Record<string, string[]> = { understandable: ['revenue', 'operatingMargin'], moat: ['roic', 'roe', 'grossMargin'], economics: ['ownerEarnings'], management: ['shares'], accounting: ['accruals'], price: [] };
  const labels: Record<string, string> = { revenue: 'Revenue', operatingMargin: 'Operating margin', roic: 'ROIC', roe: 'Return on equity', grossMargin: 'Gross margin', ownerEarnings: 'Owner earnings', shares: 'Diluted shares', accruals: 'Sloan accruals' };
  const thresholds: Record<string, number> = { roic: T.moat.roicMedian, roe: T.moat.roeMedianFin, accruals: T.accounting.maxAccruals };
  const metrics = Object.entries(test.metrics).filter(([key]) => metricLabels[key]);
  return <section data-test={test.key} className="border-t border-ink/20 py-6" aria-labelledby={`test-${test.key}`}>
    <div className="mb-3 flex items-baseline justify-between gap-4"><h2 id={`test-${test.key}`} className="text-xl font-semibold">{testLabels[test.key]}</h2><span className="flex items-center gap-2 text-sm"><StatusGlyph result={test.result} label={`${testLabels[test.key]}: ${test.result}`} />{test.result === 'na' ? 'n/a' : test.result}</span></div>
    {test.reasons.map((reason, i) => <p key={i} className="mb-2 text-sm">{reason}</p>)}
    <div className="my-5 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">{seriesKeys[test.key].filter(key => test.series[key]?.some(p => p[1] !== null)).map(key => {
      const series = test.series[key];
      const first = key === 'shares' ? series.find(p => p[1] !== null && p[1] > 0)?.[1] : null;
      const plotted: Series = key === 'shares' ? series.map(([fy, value]) => [fy, value === null || !first ? null : value / first * 100]) : series;
      return <ThresholdSeries key={key} label={labels[key]} series={plotted} domain={years} currency={currency} format={key === 'shares' ? 'index' : ['revenue', 'ownerEarnings'].includes(key) ? 'money' : 'pct'} threshold={thresholds[key]} better={key === 'accruals' ? 'lower' : 'higher'} inflation={key === 'grossMargin'} allowedBelow={key === 'roic' ? T.moat.roicWorst3 : key === 'roe' ? T.moat.roeWorst3Fin : undefined} comparison={key === 'ownerEarnings' && netIncome?.some(p => p[1] !== null) ? { label: 'Net income', series: netIncome } : undefined} caption={key === 'shares' ? 'Indexed to 100 in the first reported fiscal year.' : key === 'operatingMargin' ? `Coefficient of variation ${formatMetric({ value: test.metrics.opMarginCv ?? null, format: 'x' })}` : undefined} />;
    })}{test.key === 'management' && <DollarTest retained={test.metrics.retainedEarnings ?? null} created={test.metrics.marketCapGain ?? null} currency={currency} />}</div>
    <dl className="my-3 text-sm">{metrics.map(([key, value]) => {
      const metadata = metricLabels[key];
      if (kind !== 'operating' && ['grossMarginDrop', 'capexToRevenue', 'accruals', 'receivablesGrowthGap'].includes(key)) return <div key={key} className="flex justify-between gap-4 border-t border-ink/15 py-2 text-ink/60"><dt>{metadata.label}</dt><dd className="flex items-center gap-2">Not applicable<StatusGlyph result="na" label={`${metadata.label}: n/a`} /></dd></div>;
      if (metadata.threshold !== undefined && metadata.better) return <BulletRow key={key} {...metadata} threshold={metadata.threshold} better={metadata.better} value={value} currency={currency} resultOverride={test.key === 'price' ? test.result : undefined} />;
      const boolean = metadata.format === 'yesno';
      const positive = key === 'debtFundedBuybacks' ? value === 0 : value !== null && value >= 0;
      return <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-ink/15 py-2"><dt className="text-ink/60">{metadata.label}</dt><dd className="flex items-center gap-2 text-right tabular-nums">{formatMetric({ value, format: metadata.format, currency })}{boolean && <StatusGlyph result={value === null ? 'unclear' : positive ? 'pass' : 'fail'} label={`${metadata.label}: ${value === null ? 'unclear' : positive ? 'pass' : 'fail'}`} />}</dd></div>;
    })}</dl>
    {metrics.some(([key]) => metricLabels[key].threshold !== undefined) && <DataTable caption={`${testLabels[test.key]} metrics and thresholds`} headers={['Metric', 'Value', 'Passing threshold']} rows={metrics.map(([key, value]) => { const m = metricLabels[key]; if (kind !== 'operating' && ['grossMarginDrop', 'capexToRevenue', 'accruals', 'receivablesGrowthGap'].includes(key)) return [m.label, 'Not applicable', 'Not applicable']; return [m.label, formatMetric({ value, format: m.format, currency }), m.threshold === undefined ? 'No fixed threshold' : `${m.better === 'higher' ? m.strict ? '>' : '≥' : m.strict ? '<' : '≤'} ${formatMetric({ value: m.threshold, format: m.format, currency })}`]; })} />}
    <div className="mt-5"><JevAnswers answers={test.jev} /></div>
  </section>;
}
