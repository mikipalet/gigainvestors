import { forwardHeadline, type ForwardSummary, type ForwardScope } from '@/lib/value/forward';
import { ValueLink } from './ValueLink';
export function ForwardLine({record,scope}:{record?:ForwardSummary;scope:ForwardScope}) {
  const line=forwardHeadline(record,scope);
  return line ? <p className="simulation-line"><ValueLink href="/forward">{line} ↗</ValueLink></p> : null;
}
