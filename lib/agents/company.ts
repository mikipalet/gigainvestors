import type {Dossier,PriceMap} from '@/lib/value/types';
import {QUALITY_TESTS} from '@/lib/value/types';
import {MEMO_QUESTIONS} from '@/lib/value/owner-memo';
import {humanVerdict} from '@/lib/value/judgement/apply';
import {comparableValuation} from '@/lib/value/site-valuation';
import {priceValue,companyName} from '@/lib/value/presentation';
import {ownerReturn,expectedReturnCopy,requiredReturnCopy} from '@/lib/value/owner-return';
import {primaryTileMetric} from '@/lib/value/tile-metric';
import {metricLabels,formatMetric} from '@/lib/value/metric-labels';
import {T} from '@/lib/value/config';
import {companyUrl,investorUrl} from './urls';
import {number,percent} from './format';
export {cell,number,percent} from './format';
const money = (n: number,currency: string) => `${currency} ${number(n)} per share`;
export function companyMarkdown(d: Dossier, quote: PriceMap[string]|null, summary=false): string {
 const range=comparableValuation(d.valuation,d.company.currency), ratio=priceValue({price:quote?.[0]??null,mid:range?.perShare.mid??null});
 const owner=ownerReturn(d.valuation,d.company.currency,d.company.marketCapUsd,quote?.[0]??null);
 const verdict=d.historyCoverage&&d.historyCoverage.years<T.minYears?'Not enough history yet':humanVerdict(d,Boolean(d.b),Boolean(range&&quote),ratio);
 const fiscal=Object.values(d.tests).flatMap(t=>Object.values(t.series).flatMap(s=>s.map(p=>p[0])));
 const lines=[`# ${companyName(d.company)} (${d.id})`,`Canonical: ${companyUrl(d.id)}`,`Analysis as of: ${d.asOf}. ${fiscal.length?`Financial observations: FY${Math.min(...fiscal)}–FY${Math.max(...fiscal)}.`:''}`,`Listing currency: ${d.company.currency}. Reporting currency: ${d.reportingCurrency??d.valuation?.currency??d.company.currency}.`,
 `## Verdict`,verdict,
 `${QUALITY_TESTS.filter(k=>d.tests[k]?.result==='pass').length} of 5 business quality tests pass. Published buy qualification: ${d.b===true?'yes':'no'}.`,
 ...(quote?[`Share price: ${money(quote[0],d.company.currency)}; ${quote[2]==='seed'?'derived reference':'close'} as of ${quote[1]}.`]:[]),
 ...(range?[`Estimated value: low ${money(range.perShare.low,d.company.currency)}, central ${money(range.perShare.mid,d.company.currency)}, high ${money(range.perShare.high,d.company.currency)}. Buy below ${money(range.perShare.mid*(1-(d.requiredMos??T.price.requiredMos.stable)),d.company.currency)}. Valuation as of ${d.asOf}; scenarios are not confidence intervals.`]:[]),
 ...(owner?[`Expected annual return: ${percent(owner.expected)} at the stated quote. ${expectedReturnCopy(owner,d.valuation,d.company.country)}. ${requiredReturnCopy(d.valuation,d.company.country)}.`]:[]),
 `## Checklist`,...QUALITY_TESTS.flatMap(k=>{
  const test=d.tests[k]!,metric=primaryTileMetric(test,d.company.kind,d.tests.understandable.series.netIncome??d.series.netIncome);
  return [`### ${k}: ${test.result}`, ...test.reasons.map(r=>`- ${r}`),
   ...(!summary?Object.entries(test.metrics).flatMap(([id,v])=>{const label=metricLabels[id];return v!==null&&Number.isFinite(v)&&label?[`- ${label.label}: ${formatMetric({value:v,format:label.format,currency:d.reportingCurrency??d.company.currency})}`]:[];}):[]),
   ...(!summary&&metric.series.length?[`Chart: ${metric.chart}; fiscal year observations.`,...metric.series.flatMap(([fy,v])=>v!==null&&Number.isFinite(v)?[`- FY${fy}: ${formatMetric({value:v,format:metric.chartFormat==='index'?'count':metric.chartFormat==='ratio'?'x':metric.chartFormat??metric.format,currency:d.reportingCurrency??d.company.currency})}`]:[])]:[])];
 }),
 `## Holders`,...d.holders.map(h=>`- [${h.name}](${investorUrl(h.code)}): tracked 13F investor; follow the investor page for holding quarter and amounts.`),
 `## Price story`,...(d.priceStory?[d.priceStory.line,`Story as of ${d.priceStory.asOf}; price observation ${d.priceStory.priceDate??d.priceStory.asOf}.`,...(d.priceStory.needs?[d.priceStory.needs]:[]),...d.priceStory.events.map(e=>`- ${e.date}: ${e.text} ([${e.source}](${e.url}))`),...(!summary?d.priceStory.facts?.flatMap(f=>[`### ${f.label}`,`${f.text}; source ${f.url}; observed ${f.date}.`,...f.points.flatMap(([fy,v])=>v===null?[]:[`- FY${fy}: ${f.unit==='percent'?percent(v):`${d.reportingCurrency??d.company.currency} ${number(v)}`} `])])??[]:[])]:[]),
 `## Owner memo`,...(d.ownerMemo?[`Memo as of ${d.ownerMemo.asOf}.`,...d.ownerMemo.lines.flatMap(l=>[`### ${MEMO_QUESTIONS[l.question-1]}`,l.answer,...(!summary?l.evidence.map(e=>`- Source: ${e.url} (filed ${e.filed}); ${e.quote}`):[])])]:[]),
 ...(!summary?[`## Monthly share-price history (${d.company.currency} per share)`,...(d.priceHistory??[]).map(([date,price])=>`- ${date}: ${money(price,d.company.currency)}`),
 `## Annual estimated value (${d.company.currency} per share)`,...(d.valueHistory??[]).map(([fy,low,mid,high])=>`- FY${fy}: low ${number(low)}, central ${number(mid)}, high ${number(high)} ${d.company.currency} per share`),...(d.historyAssumptions??[])]:[]),
 `## Sources`,...(d.report.url?[`[Original ${d.report.kind} filing](${d.report.url}); period ${d.report.period??'see filing'}, filed ${d.report.filed??'see filing'}.`]:[]),
 'Estimates depend on assumptions and are not guarantees or investment advice. Underlying data remains subject to its source licenses; public reading does not grant bulk redistribution rights.',
 ];
 return lines.join('\n\n');
}
