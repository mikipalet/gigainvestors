import type { Result } from '@/lib/value/types';
export function StatusGlyph({ result, label }: { result: Result | 'wait' | 'checking'; label: string }) {
  return <span className="value-viz inline-flex shrink-0 align-middle" title={label.replace(/checking|unclear/gi,'wait')}><svg width="12" height="12" viewBox="0 0 12 12" role="img" aria-label={label.replace(/checking|unclear/gi,'wait')}>
    {result === 'checking' ? <circle cx="6" cy="6" r="4" fill="none" stroke="var(--viz-muted)" strokeWidth="1.5" strokeDasharray="1 2"/> : result === 'wait' ? <g><circle cx="6" cy="6" r="4" fill="none" stroke="var(--viz-wait, #946b21)"/><path d="M6 2a4 4 0 0 0 0 8Z" fill="var(--viz-wait, #946b21)"/></g> : result === 'pass' ? <circle cx="6" cy="6" r="4" fill="var(--viz-buy)" /> : result === 'fail' ? <path d="M2 2L10 10M10 2L2 10" stroke="var(--viz-sell)" strokeWidth="2" /> : result === 'unclear' ? <circle cx="6" cy="6" r="4" fill="none" stroke="var(--viz-muted)" strokeWidth="1.5" /> : <path d="M2 6H10" stroke="var(--viz-ink)" opacity=".3" strokeWidth="2" />}
  </svg></span>;
}
