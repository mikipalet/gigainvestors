import { metricLabels, formatMetric } from "@/lib/value/metric-labels";
import type { TestOutcome } from "@/lib/value/types";
import { MiniSeries } from "./MiniSeries";
import { resultColors, testLabels } from "./TestChips";

export function TestSection({ test, currency = "" }: { test: TestOutcome; currency?: string }) {
  const seriesKeys: Record<string, string[]> = { understandable: ["revenue", "operatingMargin"], moat: ["roic", "roe", "grossMargin"], economics: ["ownerEarnings"], management: ["shares"], accounting: ["accruals"], price: [] };
  return <section data-test={test.key} className="border-t border-ink/20 py-6" aria-labelledby={`test-${test.key}`}>
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 id={`test-${test.key}`} className="text-xl font-semibold">{testLabels[test.key]}</h2>
      <span className={resultColors[test.result]}>{test.result}</span>
    </div>
    {test.reasons.map((reason, i) => <p key={i} className="mb-2 text-sm">{reason}</p>)}
    <dl className="my-3 text-sm">{Object.entries(test.metrics).filter(([key]) => metricLabels[key]).map(([key, value]) => (
      <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-ink/15 py-2"><dt className="text-ink/60">{metricLabels[key].label}</dt><dd className="text-right">{formatMetric({ value, format: metricLabels[key].format, currency })}</dd></div>
    ))}</dl>
    <div className="my-4 flex flex-wrap gap-y-4">{seriesKeys[test.key].filter(key => test.series[key]).map(key => <MiniSeries key={key} label={key} series={test.series[key]} currency={currency} markedYears={test.key === "moat" ? [2020, 2023] : []} />)}</div>
    <ul className="space-y-4">{test.jev.map((answer) => <li key={answer.q} className="text-sm">
      <p>{answer.label}: {answer.value ?? "Not available"}{answer.probability !== null && ` · ${(answer.probability * 100).toFixed(0)}% probability`}{!answer.trusted && " · Informational only"}</p>
      {answer.evidence && <blockquote className="mt-1 border-l border-ink/20 pl-3">{answer.evidence}</blockquote>}
      <p className="mt-1 text-xs text-ink/60">Source: {answer.section}</p>
    </li>)}</ul>
  </section>;
}
