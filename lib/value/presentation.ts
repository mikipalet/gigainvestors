import type { Series } from './types';
export const dateLabel = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)).replace('Sept', 'Sep') : '';
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
  return { state, label: {pass:'Pass',wait:'Wait',fail:'Fail',unclear:'Wait'}[state], description: {pass:'At or below the buy line',wait:'Not qualified at a buy price in the published snapshot',fail:'Above mid value',unclear:''}[state], ratio } as const;
}
export function returnDisplay({value, years, unlimited = false, financial = false}: {value: number | null; years: number; unlimited?: boolean; financial?: boolean}) {
  if (unlimited) return {label:'Positive earnings, nonpositive capital', note:financial?'Tangible equity (equity − goodwill − intangibles) is nonpositive with positive net income; ROE has no finite denominator':'Invested capital (equity + debt + leases − cash − goodwill) is nonpositive with positive operating earnings; ROIC has no finite denominator', sort:Infinity};
  if (value === null || !Number.isFinite(value)) return {label:years < 5 ? years ? `${years} years on file` : '' : '', note:'Available annual return observations', sort:-Infinity};
  if (value === 1.000001) return {label:financial?'ROE > 100%':'> 100%',note:'Positive earnings with no positive capital denominator; the return rule passes',sort:value};
  if (value > 1 && !financial) return {label:'> 100% †', note:`Exact return ${(value*100).toFixed(1)}%; a small capital denominator makes this percentage sensitive`, sort:value};
  return {label:`${financial ? 'ROE ' : ''}${(value*100).toFixed(1)}%`,note:financial ? 'Return on tangible equity, the denominator used by the published model' : 'Median annual return on invested capital',sort:value};
}
function decodeEntities(value: string) {
 const entities: Record<string,string> = {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',ndash:'–',mdash:'—',rsquo:'’',lsquo:'‘',eacute:'é',uuml:'ü',ouml:'ö',auml:'ä',trade:'™',reg:'®'};
 for(let pass=0;pass<3;pass++){
  const next=value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(match,key:string)=>{
   if(key[0]!=='#')return entities[key.toLowerCase()]??match;
   const code=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));
   return code>0&&code<=0x10ffff?String.fromCodePoint(code):match;
  });
  if(next===value)break;value=next;
 }
 return value;
}
export const displayName = (name: string) => decodeEntities(name).normalize("NFKC").replace(/^The (.+) (?:Company|Co\.?)$/i, "$1").replace(/\s+S\.A\.B\. de C\.V\.?$/i, "").replace(/[\u2010-\u2015\u2212]/g, '-').replace(/Moodys/g, "Moody’s").replace(/ Natl /g, ' National ').replace(/\s+(Company|Co\.?|Inc\.?|Incorporated|Corporation|Corp\.?|Limited|Ltd\.?|plc|S\.?\s?A\.?|AB \(publ\))(?=\s*$| Class [A-Z])/gi, '').replace(/ Class [A-Z]$/,'').replace(/\s+(?:Co\.?|Ltd\.?|Inc\.?)$/i,'').replace(/[,\s]+$/, '');
export function testReturn(test: import('./types').TestOutcome, kind: import('./types').Kind) {
 const financial=kind!=='operating', key=financial?'roe':'roic';
 const series=test.series[key]??[];
 const info = returnDisplay({value:test.metrics[`${key}Median`]??null,years:series.filter(p=>p[1]!==null).length,unlimited:test.metrics[`${key}Median`]==null&&test.reasons.some(r=>/effectively unlimited/.test(r)),financial});
 if(info.label==='Positive earnings, nonpositive capital'&&test.metrics.unlimitedYears!=null) return {...info,note:`${info.note}. Nonpositive capital in ${test.metrics.unlimitedYears} of ${series.length} years; this labels the ten-year median, not necessarily the latest year.`};
 if((test.metrics.capitalFallbackYears??0)>0)return {...info,note:`${info.note}. ${test.metrics.capitalFallbackYears} years use ${financial?'reported equity':'equity plus debt and leases'}.`};
 return info;
}
export function dossierReturn(dossier: import('./types').Analysis) {
 return testReturn(dossier.tests.moat,dossier.company.kind);
}

/** Optional-safe English identity for old and new publication snapshots. */
export function companyName(company: {nameEn?: string; name?: string; n?: string; id: string}) {
 const name = company.nameEn || company.name || company.n || '';
 const clean=displayName(name.replace(/\s+(?:ADR|ADS)$/i,'')).replace(/(?:[\s,]+(?:co|ltd|inc|corporation|corp|limited)\.?)+[,.\s]*$/i,'');
 const acronyms=new Set(['IBM','IT','AI','ID','JP','JFE','JGC','JSR','JVC','NEC','NTT','TDK','THK','SMC','SMK','SBI','SCSK','NOK','DIC','DNP','DOWA','AGC','ADEKA','EIZO','TSMC','USA','US','UK','LVMH','HDFC','ICICI','HCL','SAP','AT&T','3M','BHP','BP','UBS','ABB','KLA','ASML']);
 const display=clean===clean.toUpperCase()?clean.replace(/[A-Z][A-Z&0-9-]*/g,word=>acronyms.has(word)||word.includes('&')||!/[AEIOUY]/.test(word)?word:word[0]+word.slice(1).toLowerCase()):clean;
 return /[a-zA-Z]{2}/.test(name) ? display : `Company ${company.id}`;
}

// Single green hue, sequential lightness. Text contrast is validated in round-seven.test.ts.
const BUY_RAMP = ['#b8d0b8','#c6d8bf','#d3e1cb','#e0e8d7','#ebeee1','#f6f5ec'];
export function buyColour(priceToBuy: number | null) {
 if(priceToBuy===null || !Number.isFinite(priceToBuy)) return {background:'#eeede8',color:'#202820',unknown:true};
 const index = priceToBuy <= 1 ? 0 : priceToBuy <= 2 ? 1 : priceToBuy <= 3 ? 2 : priceToBuy <= 4 ? 3 : priceToBuy <= 6 ? 4 : 5;
 return {background:BUY_RAMP[index],color:'#14251a',unknown:false};
}

/** Price/value everywhere; the fall is a percentage of today's price, not value. */
export function priceFraming(ratio:number|null,discount=.25) {
 if(ratio===null||!Number.isFinite(ratio)||ratio<=0)return {headline:'',fall:'',drop:null};
 const drop=Math.max(0,Math.round((1-(1-discount)/ratio)*100));
 return {headline:ratio<1?`${Math.round((1-ratio)*100)}% below its estimated value`:`Costs ${ratio.toFixed(1)}× its estimated value`,fall:ratio<=1-discount?'At or below the buy price':`Price would need to drop ${drop||'<1'}% to reach the buy price`,drop};
}
