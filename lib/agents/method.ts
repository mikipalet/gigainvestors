import {HISTORY_POPULATION_COPY,HISTORY_RETURN_COPY} from '@/lib/value/history-copy';
import {VALUE_PRODUCT_NAME} from '@/lib/value/brand';
import {METHOD_COPY, METHOD_SECTIONS, METHOD_RULE_COPY} from '@/lib/value/method-content';
import {METHOD_CHANGES, METHOD_VERSION} from '@/lib/value/method-version';
import {metricLabels, formatMetric} from '@/lib/value/metric-labels';
import {metricHelp} from '@/lib/value/metric-help';
import {T} from '@/lib/value/config';
import {siteUrl} from './urls';
export const methodSummary = [
 `Read at least ${T.minYears} annual periods of financial statements.`,
 'Assess understandability: earnings stability and the business model.',
 'Assess moat: returns on the capital the business needs.',
 'Assess economics: cash owner earnings after upkeep and stock compensation.',
 'Assess management: capital allocation, retained earnings and dilution.',
 'Assess accounting: accruals and evidence-backed warnings.',
 'Keep each quality verdict separate; never blend failures into a score.',
 'Estimate value using the published operating, financial or NAV model.',
 'Require both the model buy-price discount and its annual return hurdle.',
 'Cite the analysis date, quote date, fiscal periods, currency and original filing.',
];
export const glossary = [
 ['Owner earnings','Net income plus depreciation and amortisation, less upkeep investment and stock compensation; the dossier states the normalization window.'],
 ['ROIC','Return on invested capital; capital basis and fiscal observation window must accompany the percentage.'],
 ['IRR / expected return','Annual internal rate of return solving the same modeled cash flows used to estimate value, at the stated share price. It is not a realized return.'],
 ['Buy price','Central estimated per-share value after the required margin-of-safety discount; a buy also requires the return hurdle and five quality passes.'],
 ['Margin of safety','Required discount from modeled central value, expressed as a percentage.'],
 ['13F','Quarter-end reported US securities holdings, generally filed up to 45 days later; excludes a complete view of cash, shorts and non-reportable positions.'],
 ['Time travel',HISTORY_POPULATION_COPY],
 ['Price return','Change in share price, excluding dividends; historical total change is not an annualized return.'],
 ['As of','The observation or publication date of a specific value; analysis, quote, filing and quarter dates can differ.'],
];
export function methodMarkdown() {
 return [`# ${VALUE_PRODUCT_NAME} method`, `Canonical: ${siteUrl('value','/method')}`, `Method version: ${METHOD_VERSION}`, METHOD_COPY[0],
 ...METHOD_SECTIONS.flatMap(([,title,copy])=>[`## ${title}`,copy]),
 '## Required discount',METHOD_COPY[1],'## Who sets the rules?',METHOD_COPY[2],
 '## Every numerical cutoff',METHOD_RULE_COPY[0],
 ...Object.entries(metricLabels).filter(([,m])=>m.threshold!==undefined&&m.better).map(([id,m])=>`- ${m.label}: ${m.better==='higher'?(m.strict?'>':'≥'):(m.strict?'<':'≤')} ${formatMetric({value:m.threshold!,format:m.format})}. ${metricHelp(id,m.label).why}`),
 METHOD_RULE_COPY[1], '## Sources and uncertainty',...METHOD_COPY.slice(3),HISTORY_POPULATION_COPY,HISTORY_RETURN_COPY,
 '## Method changes',...METHOD_CHANGES.map(c=>`- ${c.date} — ${c.version}: ${c.changelog}`),
 '## Glossary',...glossary.map(([name,copy])=>`- **${name}**: ${copy}`),
 ].join('\n\n')
 // Agent copy uses plain debt terms for the same financial conditions.
 .replaceAll('leverage flag', 'debt warning')
 .replaceAll('elevated leverage', 'high debt levels');
}
