import { QUALITY_TESTS, type Result } from '@/lib/value/types';
import { testLabels } from '@/components/value/TestChips';
const results: Record<string, Result> = { P: 'pass', F: 'fail', U: 'unclear', N: 'na' };
const styles = { pass: 'bg-buy border-buy', fail: 'bg-sell border-sell', unclear: 'border-ink bg-transparent', na: 'bg-ink/20 border-transparent' };
function Dot({ result, title }: { result: Result; title: string }) {
  return <span title={title} aria-label={title} className={`inline-block h-2 w-2 shrink-0 rounded-full border ${styles[result]}`} />;
}
export function QualityDots({ tests }: { tests: string }) {
  return <div className="flex gap-2">{QUALITY_TESTS.map((key, i) => { const result = results[tests[i]] ?? 'unclear'; return <Dot key={key} result={result} title={`${testLabels[key]}: ${result}`} />; })}</div>;
}
export function QualityLegend() {
  return <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink/60"><span>Quality tests</span>{(['pass', 'fail', 'unclear', 'na'] as const).map(result => <span key={result} className="flex items-center gap-1.5"><Dot result={result} title={result} />{result === 'na' ? 'n/a' : result}</span>)}</div>;
}
