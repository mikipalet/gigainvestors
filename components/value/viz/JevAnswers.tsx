import type { JevAnswer } from '@/lib/value/types';
import { humanLabel } from '@/lib/value/presentation';
const choices: Record<string,string> = { repeat_consumable: 'Repeat consumable purchases', per_share_value_or_returns: 'Pay tied to per-share returns' };
const sections: Record<string,string> = { business:'Item 1 · Business', risk:'Item 1A · Risks', mdna:'Item 7 · Management discussion', compensation:'Compensation', notes:'Financial statement notes', auditor:'Auditor report', capital:'Capital allocation', letter:'Shareholder letter', description:'Company description' };
export function JevAnswers({ answers, source }: { answers: JevAnswer[]; source?: string | null }) {
  return <table className="evidence-table"><thead><tr><th>Signal</th><th>Likelihood</th><th>Source</th></tr></thead><tbody>{answers.map(answer => {
    const probability = answer.kind === 'score' && typeof answer.value === 'number' ? answer.value : answer.probability;
    // Trust in a question is not a relevance label for its extracted paragraph.
    // Until the publisher supplies an explicit supporting flag, cite the filing only.
    return <tr key={answer.q}><td>{answer.label}{answer.kind === 'choice' && typeof answer.value === 'string' ? `: ${choices[answer.value] ?? humanLabel(answer.value)}` : ''}{!answer.trusted && <small>Informational only</small>}</td><td>{probability === null ? 'Unavailable' : `${Math.round(Math.max(0, Math.min(1, probability)) * 10)} in 10`}</td><td>{source ? <a href={source}>{sections[answer.section] ?? humanLabel(answer.section)} ↗</a> : sections[answer.section]}</td></tr>;
  })}</tbody></table>;
}
