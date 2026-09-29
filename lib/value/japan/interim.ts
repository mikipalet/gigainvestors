import type { Year } from '../types';
import type { EdinetDocument } from './edinet';
import { edinetFact, yearsFromEdinet, type EdinetRow } from './xbrl-csv';

const date = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s));
const shiftYear = (s: string) => `${Number(s.slice(0,4))-1}${s.slice(4)}`;

/** Keep H1 flows out of annual history. Reuse the annual mapper with only H1 contexts. */
export function halfYearsFromEdinet(rows: EdinetRow[], doc: Pick<EdinetDocument, 'periodStart' | 'periodEnd'>): Year[] {
  if (!date(doc.periodStart) || !date(doc.periodEnd)) return [];
  const days = (Date.parse(doc.periodEnd) - Date.parse(doc.periodStart)) / 86400000;
  if (days < 170 || days > 190) return [];
  const input = rows.filter(r => /^(?:Interim|CurrentInterim|Prior1Interim)(?:Duration|Instant)(?:_|$)/.test(r.context) || r.context.startsWith('FilingDateInstant'))
    .map(r => ({ ...r, context: r.context.replace(/^(?:Current)?Interim/, 'CurrentYear').replace(/^Prior1Interim/, 'Prior1Year'),
      value: r.element.endsWith(':CurrentFiscalYearEndDateDEI') ? doc.periodEnd
        : r.element.endsWith(':PreviousFiscalYearEndDateDEI') ? shiftYear(doc.periodEnd) : r.value }));
  return yearsFromEdinet(input);
}

export function trailingFromEdinet(rows: EdinetRow[], annual: Year, doc: Pick<EdinetDocument, 'periodStart' | 'periodEnd'>): Year | null {
  const nextDay = new Date(Date.parse(annual.end) + 86400000).toISOString().slice(0,10);
  if (doc.periodStart !== nextDay || edinetFact(rows,'CurrentFiscalYearStartDateDEI') !== nextDay) return null;
  const halves = halfYearsFromEdinet(rows, doc);
  const current = halves.find(y => y.end === doc.periodEnd), previous = halves.find(y => y.end === shiftYear(doc.periodEnd));
  if (!current || !previous) return null;
  const ttm: Year = { ...annual, end: doc.periodEnd };
  const keys = ['revenue','netIncome','totalNetIncome','da','capex','sbc','ocf','leaseCash'] as const;
  for (const key of keys) {
    const a=annual[key], c=current[key], p=previous[key];
    ttm[key] = a == null || c == null || p == null ? null : a+c-p;
  }
  // Missing SBC retains reported components, as in the quarterly W1 rule.
  if ([annual.sbc,current.sbc,previous.sbc].some(v=>v!==null)) {
    ttm.sbc=(annual.sbc??0)+(current.sbc??0)-(previous.sbc??0);
    ttm.sbcIncomplete=[annual.sbc,current.sbc,previous.sbc].some(v=>v===null);
  }
  ttm.leaseCashIncomplete = [annual.leaseCash,current.leaseCash,previous.leaseCash].some(v=>v!=null && v>0) && ttm.leaseCash===null;
  if (ttm.capex !== null && ttm.capex < 0) ttm.capex = null;
  if (ttm.leaseCash !== null && ttm.leaseCash! < 0) { ttm.leaseCash=null; ttm.leaseCashIncomplete=true; }
  return ttm;
}
