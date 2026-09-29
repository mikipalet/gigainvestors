export type MetricFormat = 'pct' | 'pp' | 'x' | 'money' | 'count' | 'years';
export const metricLabels: Record<string, { label: string; format: MetricFormat }> = {
  historyYears: { label: 'Financial history', format: 'years' },
  revenueDeclines: { label: 'Years with declining revenue', format: 'count' },
  lossYears: { label: 'Years with a net loss', format: 'count' },
  opMarginCv: { label: 'Operating margin variation', format: 'x' },
  roicMedian: { label: 'ROIC, 10-year median', format: 'pct' },
  roicWorst3: { label: 'ROIC, second-lowest year', format: 'pct' },
  roeMedian: { label: 'ROE, 10-year median', format: 'pct' },
  roeWorst3: { label: 'ROE, second-lowest year', format: 'pct' },
  grossMarginDrop: { label: 'Gross margin decline, 2020 to 2023', format: 'pp' },
  capexToRevenue: { label: 'Capital spending / revenue', format: 'pct' },
  oeToNi: { label: 'Owner earnings / net income', format: 'x' },
  roiic: { label: 'Return on incremental invested capital', format: 'pct' },
  nwcToRevenueTrend: { label: 'Working capital / revenue, annual change', format: 'pp' },
  marketCapGain: { label: 'Market cap gain', format: 'money' },
  retainedEarnings: { label: 'Cumulative retained earnings', format: 'money' },
  shareCagr: { label: 'Diluted shares, 10-year annual growth', format: 'pct' },
  buybackYieldCovariance: { label: 'Buyback spending / earnings yield covariance', format: 'money' },
  debtFundedBuybacks: { label: 'Debt-funded buybacks flag (1 = yes)', format: 'count' },
  acquisitionSpend: { label: 'Acquisition spending', format: 'money' },
  roicTrend: { label: 'ROIC, annual change', format: 'pp' },
  accruals: { label: 'Sloan accruals', format: 'pct' },
  receivablesGrowthGap: { label: 'Receivables growth above revenue growth', format: 'pp' },
  restructuringYears: { label: 'Restructuring years, last five', format: 'count' },
  sbcToOcf: { label: 'Stock compensation / operating cash flow', format: 'pct' },
  goodwillIntangiblesToEquity: { label: 'Goodwill and intangibles / equity', format: 'x' },
  marginOfSafety: { label: 'Margin of safety', format: 'pct' },
  mos: { label: 'Margin of safety', format: 'pct' },
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
  if (format === 'pct') return `${(value * 100).toFixed(1)}%`;
  if (format === 'pp') return `${(value * 100).toFixed(1)} pp`;
  if (format === 'x') return `${value.toFixed(2)}×`;
  if (format === 'years') return `${value} years`;
  const number = new Intl.NumberFormat('en-US', { notation: 'compact', minimumFractionDigits: Math.abs(value) >= 1000 ? 1 : 0, maximumFractionDigits: 1 }).format(value);
  return format === 'money' ? `${currency} ${number}`.trim() : number;
}
export const perShareMoney = (value: number, currency: string) => `${currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
