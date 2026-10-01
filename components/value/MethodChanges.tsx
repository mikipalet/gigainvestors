import { METHOD_CHANGES } from '@/lib/value/method-version';
import { ValueLink } from './ValueLink';
export function MethodChanges() {
  return <section><h2>Method changes</h2><p>Rule changes are versioned and dated, with a reason recorded before their next publication. We change rules to correct errors or improve the economic reasoning, never to improve past returns. Earlier forward snapshots keep their original decisions and method version.</p><ul>{METHOD_CHANGES.map(change=><li key={change.version}><b>{change.version}</b> · {change.date} — {change.changelog}</li>)}</ul><p>The rules were not tuned to backtest returns, but several were shaped by in-sample cases. The honest test is the <ValueLink href="/forward">forward record</ValueLink>.</p></section>;
}
