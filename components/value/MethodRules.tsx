import {METHOD_RULE_COPY} from '@/lib/value/method-content';
import { metricLabels, formatMetric } from '@/lib/value/metric-labels';
import { metricHelp } from '@/lib/value/metric-help';
export function MethodRules() {
 return <section className="method-rules"><h3>Every numerical cutoff</h3><p>{METHOD_RULE_COPY[0]}</p><dl>{Object.entries(metricLabels).filter(([,m])=>m.threshold!==undefined&&m.better).map(([id,m])=>{const help=metricHelp(id,m.label);return <div key={id}><dt>{help.label}<small>{m.label}</small></dt><dd>{m.better==='higher'?m.strict?'>':'≥':m.strict?'<':'≤'} {formatMetric({value:m.threshold!,format:m.format})}</dd><p>{help.why}</p></div>;})}</dl><p>{METHOD_RULE_COPY[1]}</p></section>;
}
