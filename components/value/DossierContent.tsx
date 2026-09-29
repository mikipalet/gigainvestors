"use client";
import type { ReactNode } from 'react';
import { T } from '@/lib/value/config';
import { PriceHistory } from './viz/PriceHistory';
import { FootballField } from './viz/FootballField';
import { StatusGlyph } from './viz/StatusGlyph';
import { priceTest } from '@/lib/value/price-test';
import { QUALITY_TESTS, type Dossier, type TestOutcome } from '@/lib/value/types';
import { Bridge } from './Bridge';
import { comparableValuation } from '@/lib/value/site-valuation';
import { testLabels } from './TestChips';
import { TestSection } from './TestSection';
import { SectionNav } from './SectionNav';
import { ValueLink } from './ValueLink';
import { useQuote } from './use-quote';
import { dateLabel, priceValue, earningsYieldAtMid } from '@/lib/value/presentation';
import { compactMoney } from '@/lib/value/viz/layout';
import { formatMetric } from '@/lib/value/metric-labels';
export function DossierContent({ dossier, children }: { dossier: Dossier; children?: ReactNode }) {
  const { company, valuation, report } = dossier;
  const reportUrl = report.url?.startsWith('https://') ? report.url : null;
  const window = valuation?.assumptions.find(a => /normalized over \d+ years/.test(a))?.match(/\d+/)?.[0] ?? '5';
  const quote = useQuote(company.id, company.country);
  const comparable = comparableValuation(valuation, company.currency);
  const displayValue = comparable ?? valuation;
  const mismatch = valuation && !comparable ? `Price is in ${company.currency}, value in ${valuation.currency}, not compared` : null;
  const requiredMos = dossier.requiredMos ?? T.price.requiredMos.stable;
  const result = priceTest({ valuation: comparable, price: quote?.[0] ?? null, requiredMos });
  const ratio = priceValue({ price: quote?.[0] ?? null, mid: comparable?.perShare.mid ?? null });
  const price: TestOutcome = { key: 'price', result: result.result, numeric: result.result, reasons: [], metrics: {}, series: {}, jev: [] };
  const tests = [...QUALITY_TESTS.flatMap(key => key === 'price' ? [] : [dossier.tests[key]]), price];
  const years = Object.values(dossier.tests).flatMap(test => Object.values(test.series).flat().map(p => p[0]));
  const lastFiscalYear = years.length ? Math.max(...years) : undefined;
  const failed = tests.filter(t => t.result === 'fail'), passed = tests.filter(t => t.result === 'pass');
  const summary = failed.length > 1 ? `Fails ${failed.length} of 6: ${failed.map(t => testLabels[t.key]).join(', ')}.` : `Passes ${passed.length} of 6.${failed.length ? ` Fails on ${failed.map(t => testLabels[t.key].toLowerCase()).join(', ')}.` : passed.length === 6 ? ' Clears every test at this price.' : ' See the remaining tests below.'}`;
  const pct = (n: number | null | undefined) => n == null ? 'Not reported' : `${(n * 100).toFixed(1)}%`;
  const figures: Record<string, string> = {
    understandable: `${dossier.tests.understandable.metrics.historyYears ?? '—'} years of financials`,
    moat: `${company.kind === 'operating' ? 'ROIC' : 'ROE'} ${pct(dossier.tests.moat.metrics[company.kind === 'operating' ? 'roicMedian' : 'roeMedian'])}`,
    economics: company.kind === 'operating' && valuation ? `${compactMoney(valuation.normalized, valuation.currency)} normalised` : company.kind !== 'operating' ? 'Book-value model' : 'Not valued',
    management: `${pct(dossier.tests.management.metrics.shareCagr)} shares / yr`,
    accounting: company.kind === 'operating' ? `${pct(dossier.tests.accounting.metrics.accruals)} accruals` : 'Financial-sector tests',
    price: ratio === null ? quote ? 'Not valued' : 'No price yet' : `${ratio.toFixed(2)}× mid value`,
  };
  const keys = [
    ['Price', quote ? `${company.currency} ${quote[0].toFixed(2)}` : 'No price yet'],
    ['Mid estimate', displayValue ? `${displayValue.currency} ${displayValue.perShare.mid.toFixed(2)}` : 'Not valued'],
    ['Buy below', comparable ? `${comparable.currency} ${(comparable.perShare.mid * (1-requiredMos)).toFixed(2)}` : 'Not available'],
    [company.kind === 'operating' ? `Normalised earnings · ${window}yr` : 'Book value per share', valuation ? compactMoney(valuation.normalized, valuation.currency) : 'Not valued'],
    [company.kind === 'operating' ? 'ROIC · 10-year median' : 'ROE · 10-year median', pct(dossier.tests.moat.metrics[company.kind === 'operating' ? 'roicMedian' : 'roeMedian'])],
    [company.kind === 'operating' ? 'Shares · 10yr annual change' : 'Combined ratio', company.kind === 'operating' ? pct(dossier.tests.management.metrics.shareCagr) : pct(dossier.tests.understandable.metrics.combinedRatio)],
    [company.kind === 'operating' ? 'Discount rate' : 'Float growth', company.kind === 'operating' ? pct(valuation?.discountRate) : 'Not reported'], ['Growth assumption', pct(valuation?.growth)],
  ];
  return <>
    <div className="dossier-identity"><div><ValueLink href="/" className="back-link">← All companies</ValueLink><p className="eyebrow">{company.code} · {company.exchange} · {company.sector} · {compactMoney(company.marketCapUsd ?? 0, 'USD')}{company.kind !== 'operating' && <strong> · {company.kind === 'insurer' ? 'Insurer' : 'Bank'} · bank-style tests · book-value model</strong>}</p><h1>{company.name}</h1><p className="source-line">{report.url?.startsWith('https://') ? <a href={report.url}>{report.kind} {report.period ? `FY${report.period.slice(0,4)}` : ''}{report.filed ? ` · filed ${dateLabel(report.filed)}` : ''}</a> : 'Report not read, description only'} · {quote?.[2] === 'seed' ? 'Price derived from market cap' : 'Price close'} {dateLabel(quote?.[1])} · Financials FY{lastFiscalYear} · <ValueLink href="/method">Method →</ValueLink></p></div><div className="holder-header">{children}</div></div>
    <div data-testid="verdict" className="verdict"><p className={failed.length > 1 ? 'text-sell' : ''}>{summary}</p>{dossier.status === 'insufficient_data' && <p>Insufficient data</p>}<div className="verdict-grid">{tests.map(test => <a key={test.key} href={`#test-${test.key}`} className={`verdict-cell ${test.result}`}><span>{testLabels[test.key]}</span><strong><StatusGlyph result={test.result} label={`${testLabels[test.key]}: ${test.result}`} />{test.result === 'na' ? 'N/A' : test.result.charAt(0).toUpperCase() + test.result.slice(1)}</strong><small>{figures[test.key]}</small></a>)}</div></div>
    <section id="test-price" data-test="price" className="valuation-hero"><div>{displayValue ? <FootballField uncertainty={company.kind !== 'operating' && result.result === 'unclear' ? `Valuation uncertain for ${company.kind === 'insurer' ? 'insurers' : 'banks'}` : undefined} valuation={displayValue} price={quote?.[0] ?? null} mismatch={mismatch} requiredMos={requiredMos} volatility={dossier.volatility} date={quote?.[1]} fy={lastFiscalYear} /> : <h2>{dossier.valuationReason ?? 'Not valued'}</h2>}{company.kind !== 'operating' && result.result === 'unclear' && <p className="source-line">Valuation uncertain for {company.kind === 'insurer' ? 'insurers' : 'banks'}: price is below mid value but above the required buy line.</p>}<span className="sr-only">Price test: {result.result}</span><details className="bridge-disclosure"><summary>{valuation?.method === 'book_value' ? 'How the book-value estimate works' : `How we got ${displayValue ? `${displayValue.currency} ${displayValue.perShare.mid.toFixed(2)}` : 'the estimate'}`}</summary>{valuation && <Bridge valuation={valuation} />}</details></div><div className="key-figures"><h2>Value at a glance</h2><dl>{keys.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><a href="#assumptions">Assumptions →</a></div></section>
    <PriceHistory dossier={dossier} date={quote?.[1]} />
    <p className="chart-help">Explore charts with hover, tap or arrow keys. Escape dismisses. Tables contain the underlying figures.</p>
    <div className="dossier-body"><SectionNav tests={tests} /><div>{QUALITY_TESTS.filter(key => key !== 'price').map(key => <TestSection key={key} test={dossier.tests[key as Exclude<typeof key, 'price'>]} kind={company.kind} events={dossier.events} perShare={dossier.series} lastFiscalYear={lastFiscalYear} requiredMos={requiredMos} priceDate={quote?.[1]} netIncome={dossier.tests.understandable.series.netIncome ?? dossier.series.netIncome} currency={valuation?.currency ?? company.currency} reportUrl={reportUrl} valuation={valuation} />)}
    <section id="assumptions" className="assumptions"><h2>Assumptions & sources</h2><p>{valuation ? `A ${pct(valuation.discountRate)} discount rate represents the required annual return, with a floor above government bond yields. Growth is capped to keep the estimate conservative.` : 'Valuation assumptions are unavailable until there is enough financial history to estimate value.'} <ValueLink href="/method">Read the method →</ValueLink></p>{valuation && <dl>{(['growth', 'discountRate', 'terminalGrowth', 'bondYield', 'equityBondYield'] as const).map(key => <div key={key}><dt>{{growth:'Growth',discountRate:'Required return',terminalGrowth:'Terminal growth',bondYield:'Government bond yield',equityBondYield:valuation.method === 'owner_earnings' ? 'Earnings yield at mid value' : 'Earnings / market cap'}[key]}</dt><dd>{formatMetric({value:key === 'equityBondYield' && valuation.method === 'owner_earnings' ? earningsYieldAtMid(valuation) : valuation[key],format:'pct'})}</dd></div>)}</dl>}<p className="source-line">Financial statements: SEC / EODHD · Analysed {dateLabel(dossier.asOf)}{reportUrl && <> · <a href={reportUrl}>Original filing ↗</a></>}</p></section></div></div>
  </>;
}
