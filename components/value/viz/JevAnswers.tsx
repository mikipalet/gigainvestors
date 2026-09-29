import type { JevAnswer } from '@/lib/value/types';
import { DataTable } from './DataTable';
export function JevAnswers({ answers }: { answers: JevAnswer[] }) {
  return <ul className="value-viz space-y-4">{answers.map(answer => <li key={answer.q} className="text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><p>{answer.label}{answer.kind !== 'noul' && answer.value !== null ? `: ${answer.value}` : ''}</p>
      <figure className="flex items-center gap-2">{answer.probability !== null ? <><svg width="64" height="12" aria-hidden="true"><title>{`${Math.round(answer.probability * 10)} in 10`}</title><rect y="3" width="64" height="6" fill="var(--viz-ink)" opacity=".1" /><rect y="3" width={Math.max(0, Math.min(1, answer.probability)) * 64} height="6" fill="var(--viz-ink)" /></svg><figcaption className="text-xs">{Math.round(answer.probability * 10)} in 10<span className="sr-only"> estimated likelihood for {answer.label}</span></figcaption></> : <figcaption>Not available</figcaption>}</figure>
    </div>
    {!answer.trusted && <p className="mt-1 text-xs text-ink/55">Not yet verified · Informational only</p>}
    {answer.evidence && <blockquote className="mt-2 border-l border-ink/20 pl-3 text-ink/75">{answer.evidence}</blockquote>}
    <p className="mt-1 text-xs text-ink/55">Source: {answer.section}</p>
    <DataTable caption={answer.label} headers={['Answer', 'Probability']} rows={[[answer.kind === 'noul' ? answer.label : answer.value ?? 'Not available', answer.probability === null ? 'Not available' : `${Math.round(answer.probability * 10)} in 10`]]} />
  </li>)}</ul>;
}
