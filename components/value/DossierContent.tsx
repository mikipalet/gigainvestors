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
import { dateLabel, priceValue, earningsYieldAtMid, priceState, dossierReturn, displayName } from '@/lib/value/presentation';
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
  const state=priceState({price:quote?.[0]??null,mid:comparable?.perShare.mid??null,requiredMos});
  const returnInfo=dossierReturn(dossier);
  const price: TestOutcome = { key: 'price', result: result.result, numeric: result.result, reasons: [], metrics: {}, series: {}, jev: [] };
  const tests = [...QUALITY_TESTS.flatMap(key => key === 'price' ? [] : [dossier.tests[key]]), price];
  const years = Object.values(dossier.tests).flatMap(test => Object.values(test.series).flat().map(p => p[0]));
  const lastFiscalYear = years.length ? Math.max(...years) : undefined;
  const failed = tests.filter(t => t.result === 'fail'), passed = tests.filter(t => t.result === 'pass');
  const priceSentence = ratio===null ? state.description : `Price ${ratio.toFixed(2)}× our mid value; buy below ${comparable!.currency} ${(comparable!.perShare.mid*(1-requiredMos)).toFixed(2)}.`;
  const summary = failed.length > 1 ? `Fails ${failed.length} of 6: ${failed.map(t=>testLabels[t.key]).join(', ')}. ${priceSentence}` : `Passes ${passed.length} of 6. ${priceSentence}`;
  const pct = (n: number | null | undefined) => formatMetric({value:n??null,format:'pct'});
  const figures: Record<string, string> = {
    understandable: `${dossier.tests.understandable.metrics.historyYears ?? '—'} years of financials`,
    moat: returnInfo.label,
    economics: company.kind === 'operating' && valuation ? `${compactMoney(valuation.normalized, valuation.currency)} normalised` : company.kind !== 'operating' ? 'Book-value model' : 'Not valued',
    management: `${pct(dossier.tests.management.metrics.shareCagr)} shares / yr`,
    accounting: company.kind === 'operating' ? `${pct(dossier.tests.accounting.metrics.accruals)} accruals` : 'Financial-sector tests',
    price: state.state==='wait'?state.description:ratio === null ? state.description : `${ratio.toFixed(2)}× mid value`,
  };
  if (dossier.tests.understandable.result==='fail') figures.understandable=(dossier.tests.understandable.metrics.lossYears??0)>T.understandable.maxLossYears ? `${dossier.tests.understandable.metrics.lossYears} loss years (max ${T.understandable.maxLossYears})` : `Margin variation ${dossier.tests.understandable.metrics.opMarginCv?.toFixed(2)??'unavailable'}×`;
  if (dossier.tests.management.result==='fail') figures.management=dossier.tests.management.reasons.some(r=>r.includes('market cap gain below')) ? 'Value created < retained earnings' : dossier.tests.management.reasons.some(r=>r.includes('share growth both')) ? 'Share dilution above the limit' : 'Capital allocation fails a test';
  if (dossier.tests.economics.result==='fail') figures.economics=`Owner earnings ${(dossier.tests.economics.metrics.oeToNi??0).toFixed(2)}× net income`;
  const keys = [
    ['Price', quote ? `${company.currency} ${quote[0].toFixed(2)}` : 'No price yet'],
    ['Mid estimate', displayValue ? `${displayValue.currency} ${displayValue.perShare.mid.toFixed(2)}` : 'Not valued'],
    ['Buy below', comparable ? `${comparable.currency} ${(comparable.perShare.mid * (1-requiredMos)).toFixed(2)}` : 'Not available'],
    [company.kind === 'operating' ? `Normalised earnings · ${window}yr` : 'Tangible book value / share', valuation ? compactMoney(valuation.normalized, valuation.currency) : 'Not valued'],
    [company.kind === 'operating' ? 'ROIC · 10-year median' : 'Return on tangible equity · 10yr', returnInfo.label],
    [company.kind === 'operating' ? `Shares · FY${(lastFiscalYear??0)-10}-${lastFiscalYear}` : 'Combined ratio', company.kind === 'operating' ? pct(dossier.tests.management.metrics.shareCagr) : pct(dossier.tests.understandable.metrics.combinedRatio)],
    [company.kind === 'operating' ? 'Discount rate' : 'Float growth', company.kind === 'operating' ? pct(valuation?.discountRate) : 'Not reported'], ['Growth assumption', valuation ? `${pct(valuation.growth)} for 10 yrs, then ${pct(valuation.terminalGrowth)}` : 'Not reported'],
  ];
  return <>
    <div className="dossier-identity"><div><ValueLink href="/" className="back-link">← All companies</ValueLink><p className="eyebrow">{company.code} · {company.exchange} · {company.sector} · {compactMoney(company.marketCapUsd ?? 0, 'USD')}{company.kind !== 'operating' && <strong> · {company.kind === 'insurer' ? 'Insurer' : 'Bank'} · bank-style tests · book-value model</strong>}</p><h1>{displayName(company.name)}</h1><p className="source-line">{report.url?.startsWith('https://') ? <a href={report.url}>{report.kind} {report.period ? `FY${report.period.slice(0,4)}` : ''}{report.filed ? ` · filed ${dateLabel(report.filed)}` : ''}</a> : 'Report not read, description only'} · Price: {quote?.[2] === 'seed' ? 'estimate' : 'close'} {dateLabel(quote?.[1])} (latest available) · Financials FY{lastFiscalYear} · <ValueLink href="/method">Method →</ValueLink></p></div><div className="holder-header">{children}</div></div>
    <div data-testid="verdict" className="verdict"><p className={failed.length > 1 ? 'text-sell' : ''}>{summary}</p>{dossier.status === 'insufficient_data' && <p>Insufficient data</p>}<div className="verdict-grid">{tests.map(test => <a key={test.key} href={`#test-${test.key}`} className={`verdict-cell ${test.result}`}><span>{testLabels[test.key]}</span><strong><StatusGlyph result={test.key==='price'?state.state:test.result} label={`${testLabels[test.key]}: ${test.key==='price'?state.label:test.result}`} />{test.key==='price'?state.label:test.result === 'na' ? 'N/A' : test.result.charAt(0).toUpperCase() + test.result.slice(1)}</strong><small>{figures[test.key]}</small></a>)}</div></div>
    <section id="test-price" data-test="price" className="valuation-hero"><div>{displayValue ? <FootballField valuation={displayValue} price={quote?.[0] ?? null} mismatch={mismatch} requiredMos={requiredMos} volatility={dossier.volatility} date={quote?.[1]} fy={lastFiscalYear} /> : <h2>{dossier.valuationReason ?? 'Not valued'}</h2>}{valuation?.method==='book_value'&&<p className="source-line">Mid = {(valuation.perShare.mid/valuation.normalized).toFixed(2)}× tangible book value. Return on tangible equity {returnInfo.label.replace('ROE ','')}; required return {pct(valuation.discountRate)}. The model uses tangible equity, excluding goodwill and intangibles.</p>}<span className="sr-only">Price test: {result.result}</span><details className="bridge-disclosure"><summary>{valuation?.method === 'book_value' ? 'How the book-value estimate works' : `How we got ${displayValue ? `${displayValue.currency} ${displayValue.perShare.mid.toFixed(2)}` : 'the estimate'}`}</summary>{valuation && <Bridge valuation={valuation} />}</details></div><div className="key-figures"><h2>Value at a glance</h2><dl>{keys.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><a href="#assumptions">Assumptions →</a></div></section>
    <PriceHistory dossier={dossier} date={quote?.[1]} />
    <p className="chart-help">Explore charts with hover, tap or arrow keys. Escape dismisses. Tables contain the underlying figures.</p>
    <div className="dossier-body"><SectionNav tests={tests} /><div>{QUALITY_TESTS.filter(key => key !== 'price').map(key => <TestSection key={key} test={dossier.tests[key as Exclude<typeof key, 'price'>]} kind={company.kind} events={dossier.events} perShare={dossier.series} lastFiscalYear={lastFiscalYear} requiredMos={requiredMos} priceDate={quote?.[1]} netIncome={dossier.tests.understandable.series.netIncome ?? dossier.series.netIncome} currency={valuation?.currency ?? company.currency} reportUrl={reportUrl} valuation={valuation} />)}
    <section id="assumptions" className="assumptions"><h2>Assumptions & sources</h2><p>{valuation ? `A ${pct(valuation.discountRate)} discount rate represents the required annual return, with a floor above government bond yields. Growth is capped to keep the estimate conservative.` : 'Valuation assumptions are unavailable until there is enough financial history to estimate value.'} <ValueLink href="/method">Read the method →</ValueLink></p>{valuation && <dl>{(['growth', 'discountRate', 'terminalGrowth', 'bondYield', 'equityBondYield'] as const).map(key => <div key={key}><dt>{{growth:'Growth',discountRate:'Required return',terminalGrowth:'Terminal growth',bondYield:'Government bond yield',equityBondYield:valuation.method === 'owner_earnings' ? 'Earnings yield at mid value' : 'Earnings / market cap'}[key]}</dt><dd>{formatMetric({value:key === 'equityBondYield' && valuation.method === 'owner_earnings' ? earningsYieldAtMid(valuation) : valuation[key],format:'pct'})}</dd></div>)}</dl>}<p className="source-line">Financial statements: SEC / EODHD · Analysed {dateLabel(dossier.asOf)}{reportUrl && <> · <a href={reportUrl}>Original filing ↗</a></>}</p></section></div></div>
  </>;
}
