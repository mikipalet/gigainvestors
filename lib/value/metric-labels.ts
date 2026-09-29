import { T } from './config';
export type MetricFormat = 'pct' | 'pp' | 'x' | 'money' | 'count' | 'years' | 'yesno';
export const metricLabels: Record<string, { label: string; format: MetricFormat; threshold?: number; better?: 'higher' | 'lower'; strict?: boolean; nonNegative?: boolean }> = {
  historyYears: { nonNegative: true, label: 'Financial history', format: 'years', threshold: T.understandable.years, better: 'higher' },
  revenueDeclines: { nonNegative: true, label: 'Years with declining revenue', format: 'count', threshold: T.understandable.maxRevenueDeclines, better: 'lower' },
  lossYears: { nonNegative: true, label: 'Years with a net loss', format: 'count', threshold: T.understandable.maxLossYears, better: 'lower' },
  opMarginCv: { nonNegative: true, label: 'Operating margin variation', format: 'x', threshold: T.understandable.maxOpMarginCv, better: 'lower', strict: true },
  roicMedian: { label: 'ROIC, 10-year median', format: 'pct', threshold: T.moat.roicMedian, better: 'higher' },
  roicWorst3: { label: 'ROIC, second-lowest year', format: 'pct', threshold: T.moat.roicWorst3, better: 'higher' },
  roeMedian: { label: 'ROE, 10-year median', format: 'pct', threshold: T.moat.roeMedianFin, better: 'higher' },
  roeWorst3: { label: 'ROE, second-lowest year', format: 'pct', threshold: T.moat.roeWorst3Fin, better: 'higher' },
  grossMarginDrop: { label: 'Gross margin decline, 2020 to 2023', format: 'pp', threshold: T.moat.gmDropPp, better: 'lower' },
  capexToRevenue: { label: 'Capital spending / revenue', format: 'pct' },
  oeToNi: { label: 'Owner earnings / net income', format: 'x', threshold: T.economics.oeToNi, better: 'higher' },
  roiic: { label: 'Return on incremental invested capital', format: 'pct', threshold: T.economics.roiic, better: 'higher' },
  nwcToRevenueTrend: { label: 'Working capital / revenue, annual change', format: 'pp' },
  marketCapGain: { label: 'Market cap gain', format: 'money' },
  retainedEarnings: { label: 'Cumulative retained earnings', format: 'money' },
  shareCagr: { label: 'Diluted shares, 10-year annual growth', format: 'pct', threshold: T.management.maxShareCagr, better: 'lower' },
  buybackYieldCovariance: { label: 'Buybacks larger when the stock was cheap', format: 'yesno' },
  debtFundedBuybacks: { label: 'Debt-funded buybacks', format: 'yesno' },
  acquisitionSpend: { label: 'Acquisition spending', format: 'money' },
  roicTrend: { label: 'ROIC, annual change', format: 'pp' },
  accruals: { label: 'Sloan accruals', format: 'pct', threshold: T.accounting.maxAccruals, better: 'lower', strict: true },
  receivablesGrowthGap: { label: 'Receivables growth above revenue growth', format: 'pp', better: 'lower' },
  restructuringYears: { nonNegative: true, label: 'Restructuring years, last five', format: 'count', threshold: T.accounting.maxRestructYears, better: 'lower' },
  sbcToOcf: { label: 'Stock compensation / operating cash flow', format: 'pct', threshold: T.accounting.maxSbcToOcf, better: 'lower', strict: true },
  goodwillIntangiblesToEquity: { label: 'Goodwill and intangibles / equity', format: 'x' },
  marginOfSafety: { label: 'Margin of safety', format: 'pct', threshold: T.price.requiredMos.stable, better: 'higher' },
  mos: { label: 'Margin of safety', format: 'pct', threshold: T.price.requiredMos.stable, better: 'higher' },
  normalized: { label: 'Normalized owner earnings', format: 'money' },
  growth: { label: 'Growth', format: 'pct' },
  discountRate: { label: 'Discount rate', format: 'pct' },
  terminalGrowth: { label: 'Terminal growth', format: 'pct' },
  bondYield: { label: 'Government bond yield', format: 'pct' },
  equityBondYield: { label: 'Equity bond yield', format: 'pct' },
  netCash: { label: 'Net cash', format: 'money' },
  shares: { label: 'Diluted shares', format: 'count' },
  low: { label: 'Value per share, low', format: 'money' },
  mid: { label: 'Value per share, middle', format: 'money' },
  high: { label: 'Value per share, high', format: 'money' },
};
export function formatMetric({ value, format, currency = '' }: { value: number | null; format: MetricFormat; currency?: string }) {
  if (value === null) return 'Not reported';
  if (format === 'yesno') return value > 0 ? 'Yes' : 'No';
  if (format === 'pct') return `${(value * 100).toFixed(1)}%`;
  if (format === 'pp') return `${(value * 100).toFixed(1)} pp`;
  if (format === 'x') return `${value.toFixed(2)}×`;
  if (format === 'years') return `${value} years`;
  const number = new Intl.NumberFormat('en-US', { notation: 'compact', minimumFractionDigits: Math.abs(value) >= 1000 ? 1 : 0, maximumFractionDigits: 1 }).format(value);
  return format === 'money' ? `${currency} ${number}`.trim() : number;
}
export const perShareMoney = (value: number, currency: string) => `${currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
