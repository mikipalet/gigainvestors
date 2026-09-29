import type { Series } from './types';
export const dateLabel = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)).replace('Sept', 'Sep') : 'Unavailable';
export const humanLabel = (value: string) => { const copy = value.replaceAll('_', ' '); return copy.charAt(0).toUpperCase() + copy.slice(1); };
export function priceValue({ price, mid }: { price: number | null; mid: number | null }) {
  return price !== null && mid !== null && price > 0 && mid > 0 && Number.isFinite(price / mid) ? price / mid : null;
}
export function seriesDomain(series: Series): [number, number] {
  const years = series.filter(p => p[1] !== null && Number.isFinite(p[1])).map(p => p[0]);
  return years.length ? [Math.min(...years), Math.max(...years)] : [0, 1];
}
export function shouldUseLogScale(series: Series) {
  const values = series.flatMap(p => p[1] === null ? [] : [p[1]]);
  return values.length > 1 && Math.min(...values) > 0 && Math.min(...values) / Math.max(...values) > .05;
}

export function validValueRange({ low, mid, high }: { low: number; mid: number; high: number }) {
  return [low, mid, high].every(Number.isFinite) && low <= mid && mid <= high;
}

export function earningsYieldAtMid(value: import('./types').Valuation) {
  return value.method === 'owner_earnings' && value.perShare.mid > 0 && value.shares > 0 ? value.normalized / (value.perShare.mid * value.shares) : null;
}

export function priceState({ price, mid, b }: { price: number | null; mid: number | null; b?: boolean }) {
  const ratio = priceValue({price, mid});
  const state = b === true ? 'pass' : ratio === null ? 'unclear' : ratio <= 1 ? 'wait' : 'fail';
  return { state, label: {pass:'Pass',wait:'Wait',fail:'Fail',unclear:'Unclear'}[state], description: {pass:'At or below the buy line',wait:'Not qualified at a buy price in the published snapshot',fail:'Above mid value',unclear:'Comparable price or valuation unavailable'}[state], ratio } as const;
}
export function returnDisplay({value, years, unlimited = false, financial = false}: {value: number | null; years: number; unlimited?: boolean; financial?: boolean}) {
  if (unlimited) return {label:'Positive earnings, nonpositive capital', note:financial?'Tangible equity (equity − goodwill − intangibles) is nonpositive with positive net income; ROE has no finite denominator':'Tangible invested capital (equity + debt − cash − goodwill − intangibles) is nonpositive with positive operating earnings; ROIC has no finite denominator', sort:Infinity};
  if (value === null || !Number.isFinite(value)) return {label:years < 5 ? years ? `${years} years on file` : 'Data arriving' : 'Not reported', note:'Available annual return observations', sort:-Infinity};
  if (value > 1 && !financial) return {label:'> 100% †', note:`Exact return ${(value*100).toFixed(1)}%; a small tangible-capital denominator makes this percentage sensitive`, sort:value};
  return {label:`${financial ? 'ROE ' : ''}${(value*100).toFixed(1)}%`,note:financial ? 'Return on tangible equity, the denominator used by the published model' : 'Median annual return on tangible invested capital',sort:value};
}
export const displayName = (name: string) => name.normalize("NFKC").replace(/^The (.+) (?:Company|Co\.?)$/i, "$1").replace(/\s+S\.A\.B\. de C\.V\.?$/i, "").replace(/[\u2010-\u2015\u2212]/g, '-').replace(/Moodys/g, "Moody’s").replace(/ Natl /g, ' National ').replace(/\s+(Company|Co\.?|Inc\.?|Incorporated|Corporation|Corp\.?|Limited|Ltd\.?|plc|S\.?\s?A\.?|AB \(publ\))(?=\s*$| Class [A-Z])/gi, '').replace(/ Class [A-Z]$/,'').replace(/\s+(?:Co\.?|Ltd\.?|Inc\.?)$/i,'').replace(/[,\s]+$/, '');
export function testReturn(test: import('./types').TestOutcome, kind: import('./types').Kind) {
 const financial=kind!=='operating', key=financial?'roe':'roic';
 const series=test.series[key]??[];
 const info = returnDisplay({value:test.metrics[`${key}Median`]??null,years:series.filter(p=>p[1]!==null).length,unlimited:test.metrics[`${key}Median`]==null&&test.reasons.some(r=>/effectively unlimited/.test(r)),financial});
 if(info.label==='Positive earnings, nonpositive capital'&&test.metrics.unlimitedYears!=null) return {...info,note:`${info.note}. Nonpositive capital in ${test.metrics.unlimitedYears} of ${series.length} years; this labels the ten-year median, not necessarily the latest year.`};
 return info;
}
export function dossierReturn(dossier: import('./types').Analysis) {
 return testReturn(dossier.tests.moat,dossier.company.kind);
}

export const monthLabel = (value:string) => dateLabel(value).replace(/^\d+ /, '');
