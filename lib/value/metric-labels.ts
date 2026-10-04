import {sharePrice} from './listing-details';
import { compactMoney, formatRate } from '@/lib/format';
import { T } from './config';
export type MetricFormat = 'pct' | 'pp' | 'x' | 'money' | 'count' | 'years' | 'yesno' | 'year' | 'number';
export const metricLabels: Record<string, { label: string; format: MetricFormat; threshold?: number; better?: 'higher' | 'lower'; strict?: boolean; nonNegative?: boolean }> = {
  returnFloorMedian:{label:'Conservative return floor, median',format:'pct',threshold:T.moat.roicMedian,better:'higher'},
  returnFloorSecondLowest:{label:'Conservative return floor, second lowest',format:'pct',threshold:T.moat.roicSecondLowest,better:'higher'},
  consolidatedCashConversion:{label:'Cash conversion uses consolidated totals',format:'yesno'},
  bookReturnYears:{label:'Book return interval',format:'years'},
  returnThreshold: {label:'Required median return',format:'pct'},
  tangibleReturn: {label:'Return uses tangible common equity',format:'yesno'},
  loanCagr: {label:'Loans, annualized growth',format:'pct'},
  depositCagr: {label:'Deposits, annualized growth',format:'pct'},
  positiveIncomeYears: { label: 'Profitable years in the last ten', format: 'count' },
  requiredPositiveYears: { label: 'Required profitable years', format: 'count' },
  roeCv: { label: 'Return on common equity variation (informational)', format: 'x' },
  efficiencyMedian: { label: 'Cost / income, median', format: 'pct' },
  combinedProfitableYears: { label: 'Years with combined ratio below 100%', format: 'count' },
  combinedReportedYears: { label: 'Years with reported combined ratio', format: 'count' },
  floatGrowth: { label: 'Insurance float, annualized growth', format: 'pct' },
  bookReturnCagr: { label: 'Book value per share + reinvested dividends, annualized return', format: 'pct', threshold:.07,better:'higher' },
  bookStartPerShare: { label: 'Starting book value per share', format: 'money' },
  bookEndPerShare: { label: 'Ending book value per share', format: 'money' },
  shareCagrExCrisis: { label: 'Share growth excluding flagged crisis recapitalisations', format: 'pct',threshold:.02,better:'lower' },
  crisisRecapitalizations: { label: 'Flagged crisis recapitalisations', format: 'count' },
  retainedBookRatio: { label: 'Book created / earnings retained after dividends and buybacks', format: 'x' },
  retainedBookGain: { label: 'Book value created per share', format: 'money' },
  retainedPerShare: { label: 'Earnings retained per share after dividends and buybacks', format: 'money' },
  financialRedFlags: { label: 'Financial accounting warning count', format: 'count' },
  restatementYears: { label: 'Known restatement years', format: 'count' },
  loanGrowthExcessYears: { label: 'Years loan growth exceeded twice deposit growth', format: 'count' },
  peerLossExcessYears: { label: 'Years credit losses exceeded peer median', format: 'count' },
  adverseReserveYears: { label: 'Adverse reserve development years', format: 'count' },
  ownerEarningsTotal: {label:'Owner earnings, five-year total',format:'money'},
  netIncomeTotal: {label:'Net income, five-year total',format:'money'},
  capitalFallbackYears: {label:'Years with nonpositive capital',format:'count'},
  perShareStart: {label:'Per-share value, starting three-year median',format:'money'},
  perShareEnd: {label:'Per-share value, ending three-year median',format:'money'},
  perShareValueGrowth: {label:'Per-share value growth',format:'pct',threshold:0,better:'higher'},
  perShareValueChange: {label:'Per-share value change',format:'money',threshold:0,better:'higher'},
  ocfToNi: {label:'Operating cash / earnings',format:'x'},
  cashBacked: {label:'Earnings backed by cash',format:'yesno'},
  historyYears: { nonNegative: true, label: 'Financial history', format: 'years', threshold: T.minYears, better: 'higher' },
  revenueDeclines: { nonNegative: true, label: 'Years with declining revenue', format: 'count', threshold: T.understandable.maxRevenueDeclines, better: 'lower' },
  lossYears: { nonNegative: true, label: 'Years with a net loss', format: 'count', threshold: T.understandable.maxLossYears, better: 'lower' },
  opMarginCv: { nonNegative: true, label: 'Operating margin variation', format: 'x', threshold: T.understandable.maxOpMarginCv, better: 'lower' },
  roicMedian: { label: 'ROIC, median of available years', format: 'pct', threshold: T.moat.roicMedian, better: 'higher' },
  roicSecondLowest: { label: 'ROIC, second-lowest year', format: 'pct', threshold: T.moat.roicSecondLowest, better: 'higher' },
  roeMedian: { label: 'Bank / P&C ROTE, median of available years', format: 'pct', threshold: T.moat.roeMedianFin, better: 'higher' },
  roeSecondLowest: { label: 'Bank ROTE, second-lowest year', format: 'pct', threshold: .05, better: 'higher' },
  grossMarginDrop: { label: 'Gross margin decline, FY2023 vs mean(FY2019, FY2020)', format: 'pp', threshold: T.moat.gmDropPp, better: 'lower' },
  unlimitedYears: { label: 'Years with nonpositive tangible capital', format: 'count' },
  capexToRevenue: { label: 'Capital spending / revenue', format: 'pct' },
  oeToNi: { label: 'Owner earnings / net income, 5-yr', format: 'x', threshold: T.economics.oeToNi, better: 'higher' },
  roiic: { label: 'Return on incremental invested capital', format: 'pct', threshold: T.economics.roiic, better: 'higher' },
  nwcToRevenueChange: { label: 'Working capital / revenue, change between three-year averages', format: 'pp' },
  nwcToRevenueEnd: { label: 'Working capital / revenue, final three-year average', format: 'pct' },
  nwcToRevenueTrend: { label: 'Working capital / revenue, annual change', format: 'pp' },
  marketCapGain: { label: 'Market cap gain', format: 'money' },
  retainedEarnings: { label: 'Cumulative retained earnings', format: 'money' },
  shareCagr: { label: 'Diluted shares, 10-year annual growth', format: 'pct', threshold: T.management.maxShareCagr, better: 'lower' },
  nonAcquisitionShareCagr: { label: 'Ordinary dilution, 10-year annual growth', format: 'pct', threshold: T.management.maxShareCagr, better: 'lower' },
  nonAcquisitionShareCagr5: { label: 'Ordinary dilution, 5-year annual growth', format: 'pct', threshold: T.management.maxShareCagr, better: 'lower' },
  shareCagr5: { label: 'Diluted shares, 5-year annual growth', format: 'pct' },
  retainedStartFy: { label: '$1 test, starting fiscal year', format: 'year' },
  retainedEndFy: { label: '$1 test, ending fiscal year', format: 'year' },
  buybackYieldSpearman: { label: 'Buybacks concentrated in cheaper years (correlation)', format: 'number' },
  averageBuybackYield: { label: 'Average buyback yield', format: 'pct' },
  buybackYears: { label: 'Buyback history', format: 'years' },
  cumulativeNetIncome: { label: 'Cumulative net income, 10 years', format: 'money' },
  roicFirst3Median: { label: 'ROIC, first three-year median', format: 'pct' },
  roicLast3Median: { label: 'ROIC, last three-year median', format: 'pct' },
  buybackYieldCovariance: { label: 'Buybacks larger when the stock was cheap', format: 'yesno' },
  debtFundedBuybacks: { label: 'Debt-funded buybacks', format: 'yesno' },
  acquisitionSpend: { label: 'Acquisition spending', format: 'money' },
  roicTrend: { label: 'ROIC, annual change', format: 'pp' },
  accruals: { label: 'Sloan accruals', format: 'pct', threshold: T.accounting.maxAccruals, better: 'lower' },
  receivablesGrowthGap: { label: 'Receivables growth above revenue growth', format: 'pp', better: 'lower' },
  dsri: { label: 'Receivables to sales index (DSRI)', format: 'x', threshold: T.accounting.maxDsri, better: 'lower' },
  redFlags: { label: 'Accounting red flags', format: 'count', threshold: T.accounting.minRedFlags, better: 'lower', strict: true },
  restructuringYears: { nonNegative: true, label: 'Restructuring years, last five', format: 'count', threshold: T.accounting.maxRestructYears, better: 'lower' },
  sbcToOcf: { label: 'Stock compensation / operating cash flow', format: 'pct', threshold: T.accounting.maxSbcToOcf, better: 'lower' },
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
export function formatMetric({ value, format, currency = '', returnRatio = false }: { value: number | null; format: MetricFormat; currency?: string; returnRatio?: boolean }) {
  if (value === null) return '';
  if (format === 'year') return `FY${value}`;
  if (format === 'number') return value.toFixed(2);
  if (format === 'yesno') return value > 0 ? 'Yes' : 'No';
  if (format === 'pct' && (returnRatio && value > 1 || value === 1.000001)) return '>100%';
  if (format === 'pct') return formatRate(value);
  if (format === 'pp') return `${(value * 100).toFixed(1)} pp`;
  if (format === 'x') return `${value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}×`;
  if (format === 'count' && Math.abs(value)<1000) return value.toLocaleString('en-US',{maximumFractionDigits:0});
  if (format === 'years') return `${value} years`;
  return compactMoney(value,format === 'money'?currency:'');
}
export const perShareMoney = (value: number, currency: string) => currency === 'GBX' ? `${value.toLocaleString('en-US', {maximumFractionDigits:0})}p` : sharePrice(value,currency);

export const marginVariation = (value:number|null) => value===null?'':value>1?'>100%':`${Math.round(value*100)}%`;

/** Plain reading for the ratios used in evidence panels. */
export function ratioReading(id:string, value:number|null) {
 if(value===null||!Number.isFinite(value))return '';
 const dollars=value.toFixed(2),percent=Math.round(value*100);
 switch(id){
  case 'opMarginCv':return value>1?'Margin variation >100%.':`Margins vary by ${marginVariation(value)} of their average.`;
  case 'retainedDollar':return `$${dollars} of value per $1 kept.`;
  case 'oeToNi':return `$${dollars} of cash for owners per $1 of profit.`;
  case 'dsri':return `Receivables relative to sales are ${percent}% of their prior-year level.`;
  case 'goodwillIntangiblesToEquity':return `$${dollars} of goodwill and intangibles per $1 of equity.`;
  default:return '';
 }
}

/** Capital-return percentages are capped in presentation, never in the underlying data. */
export const isCapitalReturn = (label:string) => /roic|roe|rote|return on.*(?:capital|equity)/i.test(label);

/** Published return notes use the same cap as numerical summaries. */
export function displayReturnText(text:string) {
 return text.replace(/(?:\bROIC\b|\bROE\b|\bROTE\b|return on [\w -]*(?:capital|equity))[^;\n]*/gi,clause=>clause.replace(/-?\d+(?:\.\d+)?%/g,value=>parseFloat(value)>100?'>100%':value));
}
