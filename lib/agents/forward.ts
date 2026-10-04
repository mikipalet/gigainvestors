import type {ForwardRecord} from '@/lib/value/forward';
import {percent} from './format';
import {companyUrl,siteUrl} from './urls';
export function forwardMarkdown(record:ForwardRecord) {
 return ['# Forward observation record',`Canonical: ${siteUrl('value','/forward')}`,
  `Observed from ${record.start??'the first published observation'} through ${record.asOf??'the latest published observation'}; ${record.days} calendar days and ${record.snapshots} immutable snapshots.`,
  'Price returns exclude dividends. Dividend-reinvested total returns are separately labeled when that series exists. All returns below are cumulative over the observation interval, not annualized.',
  ...(['western','all'] as const).flatMap(scope=>{
   const r=record[scope];
   return [`## ${scope==='western'?'Western-accessible listings':'All covered markets'}`,
    ...(r.priceReturn!==null?[`Portfolio price return: ${percent(r.priceReturn)}.`]:[]),
    ...(r.dividendReturn!==null?[`Portfolio dividend-reinvested total return: ${percent(r.dividendReturn)}.`]:[]),
    ...(r.benchmarkPriceReturn!==null?[`Covered-universe benchmark price return: ${percent(r.benchmarkPriceReturn)}.`]:[]),
    ...(r.benchmarkDividendReturn!==null?[`Covered-universe benchmark dividend-reinvested return: ${percent(r.benchmarkDividendReturn)}.`]:[])];
  }),
  '## Published picks',...record.picks.map(p=>`- [${p.name} (${p.id})](${companyUrl(p.id)}): first observed ${p.firstDate}; method ${p.methodVersion}${p.priceReturn!==null?`; price return ${percent(p.priceReturn)} through ${p.priceDate}`:''}${p.dividendReturn!==null?`; dividend-reinvested return ${percent(p.dividendReturn)}`:''}.`),
 ].join('\n\n');
}
