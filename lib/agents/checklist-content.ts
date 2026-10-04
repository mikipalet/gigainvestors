import type {BrowserRow} from '@/lib/value/browser-view';
import type {StoreMeta} from '@/lib/value/types';
import {matchesView} from '@/lib/value/view-filter';
import {quarterEnd} from '@/lib/value/time-travel';
import {companyUrl,siteUrl} from './urls';
import {cell,number,percent} from './format';
export function checklistMarkdown(rows: BrowserRow[],meta:StoreMeta|null,frame?:string,filter:Record<string,string>={}) {
 const url=frame?siteUrl('value',`/?q=${frame}`):siteUrl('value');
 const shown=rows.filter(r=>matchesView(r,filter));
 return [`# Buffett checklist${frame?` — ${frame}`:''}`,`Canonical: ${url}`,`Published as of: ${meta?.asOf??'see each company'}. ${frame?`Quarter end: ${quarterEnd(frame)}.`:''}`,
 'Quality code order: understandable, moat, economics, management, accounting. P = pass; F = fail; C/U = unresolved; N = not applicable. Five passes alone do not establish a Buy now verdict.',
 ...(frame?['Historical reconstruction uses current restatements and today’s surviving index universe (survivorship bias). Subsequent price changes exclude dividends and are not annualized; overlapping cohorts are not an investable portfolio.']:[]),
 `Market scope: ${filter.markets==='all'?'all covered markets':'Western-accessible listings'}. ${shown.length} matching companies.`,
 ['| Company | Quality code | Buy qualified | Price per share | Price as of | Expected return per year | Subsequent price change |',
 '|---|---|---|---|---|---|---|',
 ...shown.map(r=>`| [${cell(r.nameEn??r.n)} (${cell(r.id)})](${companyUrl(r.id)}) | ${r.t} | ${r.b===true?'yes':'no'} | ${r.quote?`${r.cur} ${number(r.quote[0])}`:r.historicalPrice?.price!=null?`${r.cur} ${number(r.historicalPrice.price)}`:''} | ${r.quote?.[1]??(frame?quarterEnd(frame):'')} | ${r.expected!=null?percent(r.expected):''} | ${r.gain!=null?`${percent(r.gain)}${r.outcome?` to ${r.outcome.date}`:''}`:''} |`)].join('\n'),
 `Method: ${siteUrl('value','/method')}`].join('\n\n');
}
