import { metricLabels, formatMetric } from '@/lib/value/metric-labels';
import { T } from '@/lib/value/config';
import type { Dossier, Kind, Series, TestOutcome } from '@/lib/value/types';
import { testLabels } from './TestChips';
import { StatusGlyph } from './viz/StatusGlyph';
import { ThresholdSeries } from './viz/ThresholdSeries';
import { BulletRow } from './viz/BulletRow';
import { DollarTest } from './viz/DollarTest';
import { JevAnswers } from './viz/JevAnswers';
import { DataTable } from './viz/DataTable';
import { EventNotes } from './viz/Events';
import { humanLabel, shouldUseLogScale, testReturn } from '@/lib/value/presentation';
import { ValueLink } from './ValueLink';
import type { Valuation } from '@/lib/value/types';

export function TestSection({ test, currency = '', domain, netIncome, kind = 'operating', events, perShare, requiredMos, priceDate, lastFiscalYear, reportUrl, valuation }: { test: TestOutcome; currency?: string; domain?: [number, number]; netIncome?: Series; kind?: Kind; events?: Dossier["events"]; perShare?: Dossier["series"]; requiredMos?: number; priceDate?: string | null; lastFiscalYear?: number; reportUrl?: string | null; valuation?: Valuation | null }) {
  const fiscalYears = Object.values(test.series).flat().map(p => p[0]);
  const years: [number, number] = domain ?? (fiscalYears.length ? [Math.min(...fiscalYears), Math.max(...fiscalYears)] : [0, 1]);
  const seriesKeys: Record<string, string[]> = { understandable: kind === 'operating' ? ['revenue', 'operatingMargin'] : [], moat: kind === 'operating' ? ['roic', 'grossMargin'] : ['roe'], economics: kind === 'operating' ? ['ownerEarnings'] : [], management: ['shares'], accounting: ['accruals'], price: [] };
  const labels: Record<string, string> = { revenue: 'Revenue', operatingMargin: 'Operating margin', roic: 'ROIC', roe: 'Return on tangible equity', grossMargin: 'Gross margin', ownerEarnings: 'Owner earnings', shares: 'Diluted shares', accruals: 'Sloan accruals' };
  const thresholds: Record<string, number> = { roic: T.moat.roicMedian, roe: T.moat.roeMedianFin, accruals: T.accounting.maxAccruals };
  const metrics = Object.entries(test.metrics).filter(([key]) => metricLabels[key] && !['retainedStartFy', 'retainedEndFy', 'cumulativeNetIncome', 'marketCapGain', 'retainedEarnings'].includes(key));
  const verdict = test.pending && test.result==='unclear' ? 'Checking' : test.result === 'pass' ? 'Pass' : test.result === 'fail' ? 'Fail' : test.result === 'na' ? 'Not applicable' : 'Unclear';
  const metric = (key: string, format: 'pct' | 'count' | 'x' = 'pct') => formatMetric({value:test.metrics[key] ?? null,format});
  const summaries: Record<string,string> = {
    understandable: test.metrics.historyYears == null ? 'Financial history is incomplete; see the source notes below' : `${metric('historyYears','count')} years of financial history; ${metric('revenueDeclines','count')} revenue decline${test.metrics.revenueDeclines===1?'':'s'} and ${metric('lossYears','count')} loss year${test.metrics.lossYears===1?'':'s'}`,
    moat: `${kind === 'operating' ? 'ROIC' : 'ROE'} median ${metric(kind === 'operating' ? 'roicMedian' : 'roeMedian')} over the latest ten years`,
    economics: valuation?.method === 'owner_earnings' ? `Normalised owner earnings ${formatMetric({value:valuation.normalized,format:'money',currency})}; ${((valuation.normalized / (valuation.bridge.find(r => /^net income$/i.test(r.label))?.value ?? valuation.normalized))).toFixed(2)}× the matching net income observation` : kind !== 'operating' ? 'Financial-sector economics use book value and return on equity' : 'There is not enough data to estimate normalised owner earnings',
    management: test.metrics.shareCagr == null ? 'Share-count history is incomplete; a ten-year change cannot be estimated' : `Diluted shares changed ${metric('shareCagr')} a year over ten years`,
    accounting: kind === 'operating' ? test.metrics.accruals == null ? 'Accounting inputs are incomplete; see the source notes below' : `Sloan accruals ${metric('accruals')}; ${metric('redFlags','count')} accounting red flags` : 'Financial-sector accounting checks applied',
  };
  const normalizedWindow=valuation?.assumptions.find(a=>/normalized over \d+ years/.test(a))?.match(/\d+/)?.[0]??'5';
  const returnInfo=testReturn(test,kind);
  if(test.key==='moat') summaries.moat=`${kind==='operating'?'Return on tangible capital':'Return on tangible equity'}: ${returnInfo.label}; latest ten fiscal years`;
  if(test.key==='economics') summaries.economics=`Five-year cash conversion: ${metric('oeToNi','x')} net income (at least ${T.economics.oeToNi.toFixed(2)}×). Annual observations are shown below`;
  if(test.key==='management'&&lastFiscalYear) summaries.management=`Diluted shares changed ${metric('shareCagr')} a year, FY${lastFiscalYear-10}–FY${lastFiscalYear}`;
  const headline = test.pending ? 'We are fetching 10 years of monthly prices; this test updates automatically' : summaries[test.key];
  return <section id={`test-${test.key}`} data-test={test.key} className="test-section" aria-labelledby={`heading-${test.key}`}>
    <header><h2 id={`heading-${test.key}`}><StatusGlyph result={test.pending?'checking':test.result} label={`${testLabels[test.key]}: ${verdict}`} />{testLabels[test.key]}</h2><p>{verdict}.{headline ? ` ${humanLabel(headline).replace(/\.$/, '')}.` : ' Review the figures and filing evidence below.'}</p></header>
    {kind !== 'operating' && test.key === 'economics' && <p className="source-line">Book value and ROE drive this valuation. Combined ratio and insurance float history are not reported in this dataset.</p>}
    <div className="test-content">
    <div className="test-charts">{seriesKeys[test.key].filter(key => !(key==='roic'&&['Unlimited','n/m'].includes(returnInfo.label))).filter(key => test.series[key]?.some(p => p[1] !== null)).map(key => {
      const original = test.series[key];
      const matchedYears = key === 'ownerEarnings' && netIncome ? new Set(netIncome.filter(p => p[1] !== null && original.some(o => o[0] === p[0] && o[1] !== null)).map(p => p[0])) : null;
      const series = matchedYears?.size ? original.filter(p => matchedYears.has(p[0])) : original;
      const comparison = matchedYears?.size ? { label: 'Net income', series: netIncome!.filter(p => matchedYears.has(p[0])) } : undefined;
      const first = key === 'shares' ? series.find(p => p[1] !== null && p[1] > 0)?.[1] : null;
      const plotted: Series = key === 'shares' ? series.map(([fy, value]) => [fy, value === null || !first ? null : value / first * 100]) : series;
      return <ThresholdSeries events={events} returnMedian={key==='roic'||key==='roe'?returnInfo.label.replace('ROE ',''):undefined} key={key} label={labels[key]} series={plotted} domain={years} currency={currency} format={key === 'shares' ? 'index' : ['revenue', 'ownerEarnings'].includes(key) ? 'money' : 'pct'} threshold={thresholds[key]} better={key === 'accruals' ? 'lower' : 'higher'} inflation={key === 'grossMargin'} allowedBelow={key === 'roic' ? T.moat.roicSecondLowest : key === 'roe' ? T.moat.roeSecondLowestFin : undefined} comparison={comparison} caption={key === 'ownerEarnings' ? 'Annual owner earnings / net income for the same fiscal year.' : key === 'shares' ? `Chart: FY${series[0]?.[0]}–FY${series.at(-1)?.[0]}, indexed to 100. Ten-year metric: FY${(lastFiscalYear??0)-10}–FY${lastFiscalYear}.` : key === 'operatingMargin' ? (test.metrics.opMarginCv != null && test.metrics.opMarginCv > 1 ? 'Very volatile operating margins' : 'Operating profit as a share of revenue') : undefined} />;
    })}{test.key === 'management' && <DollarTest startFy={test.metrics.retainedStartFy??undefined} endFy={test.metrics.retainedEndFy??undefined} date={priceDate} fy={lastFiscalYear} retained={test.metrics.retainedEarnings ?? null} created={test.metrics.marketCapGain ?? null} currency={currency} />}{(test.key === 'understandable' ? kind === 'operating' ? ['revenuePerShare'] : ['tangibleBookValuePerShare'] : test.key === 'economics' ? kind === 'operating' ? ['ownerEarningsPerShare'] : [] : []).map(key => perShare?.[key]?.some(p => p[1] !== null) ? <ThresholdSeries key={key} label={{ revenuePerShare: 'Revenue per share', ownerEarningsPerShare: 'Owner earnings per share', tangibleBookValuePerShare: 'Tangible book value per share', bookValuePerShare: 'Book value per share' }[key]!} series={perShare[key]!} domain={years} currency={currency} format="money" logarithmic={key!=='ownerEarningsPerShare'&&shouldUseLogScale(perShare[key]!)} events={events} /> : null)}</div>
    <div className="test-metrics"><div className="metric-heading">Metric <span>Value / passing bar</span></div><dl className="text-sm">{test.key==='management'&&<BulletRow label="$1 retained earnings test: value created / retained" value={test.metrics.marketCapGain!=null&&test.metrics.retainedEarnings!=null&&test.metrics.retainedEarnings>0?test.metrics.marketCapGain/test.metrics.retainedEarnings:null} threshold={1} better="higher" format="x" currency={currency} resultOverride={test.pending?'checking':undefined}/>}{metrics.sort(([a],[b])=>{const first={understandable:test.result==='fail'&&(test.metrics.opMarginCv??0)>T.understandable.maxOpMarginCv?'opMarginCv':'historyYears',moat:kind==='operating'?'roicMedian':'roeMedian',economics:test.result==='fail'&&test.reasons.some(r=>/incremental/.test(r))?'roiic':'oeToNi',management:'shareCagr',accounting:'redFlags',price:'mos'}[test.key];return Number(b===first)-Number(a===first);}).map(([key, value]) => {
      const metadata = { ...metricLabels[key], ...(key === 'grossMarginDrop' ? { label: 'Gross margin change, FY2023 vs FY2019–20', threshold: -T.moat.gmDropPp, better: 'higher' as const } : {}), ...(test.key === "price" && requiredMos !== undefined ? { threshold: requiredMos } : {}) };
      if (kind !== 'operating' && ['roicFirst3Median','roicLast3Median'].includes(key)) return null;
      if (kind !== 'operating' && ['grossMarginDrop', 'capexToRevenue', 'accruals', 'receivablesGrowthGap', 'dsri'].includes(key)) return <div key={key} className="flex justify-between gap-4 border-t border-ink/15 py-2 text-ink/60"><dt>{metadata.label}<ValueLink className="metric-method" href={`/method#${test.key}`}>How computed</ValueLink></dt><dd className="flex items-center gap-2">Not applicable<StatusGlyph result="na" label={`${metadata.label}: n/a`} /></dd></div>;
      if (['roicMedian','roeMedian'].includes(key)&&test.result==='pass'&&returnInfo.label==='Unlimited') return <div key={key} className="info-metric"><dt>Return on tangible {kind==='operating'?'capital':'equity'}<small className="block">At least {((metadata.threshold??0)*100).toFixed(0)}%; nonpositive capital with positive earnings</small></dt><dd>{returnInfo.label} † <StatusGlyph result="pass" label="Return on tangible capital: pass"/></dd></div>;
      if ((key==='roiic' && value!==null&&value>1) || (/^roic/.test(key)&&(value!==null&&value>1&&test.result!=='pass'||value===null&&test.reasons.some(r=>/unlimited/.test(r))))) return <div key={key} className="info-metric"><dt>{metadata.label}</dt><dd title={key==='roiic'?'Capital barely changed; the ratio is not meaningful':returnInfo.note}>{key==='roiic'?'n/m (capital barely changed)':value!==null&&value>1?'n/m':returnInfo.label}</dd></div>;
      if (metadata.threshold !== undefined && metadata.better) return <BulletRow key={key} {...metadata} threshold={metadata.threshold} better={metadata.better} value={key === 'grossMarginDrop' && value !== null ? -value : value} currency={currency} resultOverride={test.key === 'price' ? test.result : undefined} />;
      const uncertainCapital = /roic(First|Last)/.test(key) && value !== null && Math.abs(value) >= .8;
      return <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-ink/15 py-2"><dt><ValueLink title="How computed" href={`/method#${test.key}`}>{metadata.label}</ValueLink></dt><dd className="flex items-center gap-2 text-right tabular-nums"><span title={uncertainCapital ? 'Sensitive to a small tangible-capital denominator. The published dossier does not include the denominator; inspect the source filing.' : undefined}>{formatMetric({ value, format: metadata.format, currency })}{uncertainCapital && ' †'}</span><small className="info-tag">info</small></dd></div>;
    })}</dl></div></div>
    {kind==='operating' && metrics.some(([key,value]) => /roic(First|Last)/.test(key) && value !== null && Math.abs(value) >= .8) && <p className="source-line">† High ROIC is sensitive to a small tangible-capital base. The denominator is not published; verify it in the filing before interpreting this return.</p>}
    <div className="section-details">{test.reasons.length > 0 && <details><summary>Notes ({test.reasons.length})</summary><ul>{test.reasons.filter(r => r !== headline).map((r, i) => <li key={i}>{humanLabel(r)}</li>)}</ul></details>}
    {test.jev.length > 0 && <details><summary title="Unverified means quoted from the filing but not yet matched to a line item">Report evidence ({test.jev.length}) · {test.jev.filter(a => a.trusted).length} verified</summary><JevAnswers answers={test.jev} source={reportUrl} /></details>}
    {test.key === 'accounting' && events?.length ? <details><summary>Accounting events ({events.length})</summary><EventNotes events={events} /></details> : null}</div>

  </section>;
}
