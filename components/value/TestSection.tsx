import type { TestOutcome } from "@/lib/value/types";
import { MiniSeries } from "./MiniSeries";
import { resultColors, testLabels } from "./TestChips";

export function TestSection({ test }: { test: TestOutcome }) {
  return <section data-test={test.key} className="border-t border-ink/20 py-6" aria-labelledby={`test-${test.key}`}>
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 id={`test-${test.key}`} className="text-xl font-semibold">{testLabels[test.key]}</h2>
      <span className={resultColors[test.result]}>{test.result}</span>
    </div>
    {test.reasons.map((reason, i) => <p key={i} className="mb-2 text-sm">{reason}</p>)}
    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">{Object.entries(test.metrics).map(([label, value]) => (
      <div key={label}><dt className="text-ink/60">{label}</dt><dd>{value === null ? "Not reported" : value.toLocaleString("en-US", { maximumFractionDigits: 4 })}</dd></div>
    ))}</dl>
    <div className="my-4 grid gap-4 sm:grid-cols-3">{Object.entries(test.series).map(([label, series]) => <MiniSeries key={label} label={label} series={series} />)}</div>
    <ul className="space-y-4">{test.jev.map((answer) => <li key={answer.q} className="text-sm">
      <p>{answer.label}: {answer.value ?? "Not available"}{answer.probability !== null && ` · ${(answer.probability * 100).toFixed(0)}% probability`}{!answer.trusted && " · Informational only"}</p>
      {answer.evidence && <blockquote className="mt-1 border-l border-ink/20 pl-3">{answer.evidence}</blockquote>}
      <p className="mt-1 text-xs text-ink/60">Source: {answer.section}</p>
    </li>)}</ul>
  </section>;
}
