import { existsSync, readdirSync } from 'node:fs';
import { corpusPath, readCorpusJson } from '../corpus';
import { corroboratingSplitPrice } from '../integrity';
import type { Fundamentals, PriceHistory } from '../types';
import { csvFilesFromZip, semiAnnualReportDocuments, type DocumentDay, type EdinetDocument } from './edinet';
import { halfYearsFromEdinet, trailingFromEdinet } from './interim';
import { parseEdinetCsv, type EdinetRow } from './xbrl-csv';
import { filedShareChange, reconcileEdinetShares } from './shares';

export function cachedInterimDocuments(): Map<string, EdinetDocument[]> {
  const result=new Map<string,EdinetDocument[]>(), dir=corpusPath('raw/edinet/days');
  for(const file of existsSync(dir)?readdirSync(dir).sort():[]) {
    if(!/^\d{4}-\d{2}-\d{2}\.json$/.test(file))continue;
    const day=readCorpusJson<DocumentDay>(`raw/edinet/days/${file}`);
    if(day?.metadata.status!=='200'||!Array.isArray(day.results))continue;
    for(const doc of semiAnnualReportDocuments(day)) {
      const id=`${doc.secCode.slice(0,4)}.JP`;result.set(id,[...result.get(id)??[],doc]);
    }
  }
  return result;
}
export function latestInterim(f: Fundamentals, docs: EdinetDocument[], now=new Date()): EdinetDocument | null {
  const latest=f.years.at(-1);if(!latest)return null;
  const sixMonths=new Date(`${latest.end}T00:00:00Z`);sixMonths.setUTCMonth(sixMonths.getUTCMonth()+6);
  if(now<=sixMonths)return null;
  return docs.filter(d=>d.periodEnd>latest.end && d.periodEnd<=now.toISOString().slice(0,10))
    .sort((a,b)=>a.periodEnd.localeCompare(b.periodEnd)||a.submitDateTime.localeCompare(b.submitDateTime)||a.docID.localeCompare(b.docID)).at(-1)??null;
}
export function applyEdinetInterim(f: Fundamentals, doc: EdinetDocument, rows: EdinetRow[], prices?: PriceHistory | null): void {
  const latest=f.years.at(-1);if(!latest)return;
  f.ttm=trailingFromEdinet(rows,latest,doc);
  const interim=halfYearsFromEdinet(rows,doc).at(-1);
  if(!interim?.edinetShares || !latest.dilutedShares || interim.end<=latest.end)return;
  const reconciled=reconcileEdinetShares(interim,prices);
  const shares=reconciled.dilutedShares;
  if(!reconciled.edinetShares?.reconciled || !shares)return;
  const ratio=shares/latest.dilutedShares;
  if(Math.abs(ratio-1)>.1) {
    const filed=filedShareChange(rows.filter(r=>/TextBlock$/.test(r.element)).map(r=>r.value),latest.end,doc.submitDateTime.slice(0,10),ratio);
    const confirmed=filed||corroboratingSplitPrice(prices,latest.end,doc.submitDateTime.slice(0,10),ratio);
    // Newer filing disagreement must be held even when no split is provable.
    latest.edinetShares={...reconciled.edinetShares,reconciled:Boolean(confirmed),reason:confirmed
      ? 'EDINET share count reconciled to newer half-year filing after confirmed share change'
      : 'Unverified JP share count unreconciled: newer half-year share basis differs without confirmed share change'};
    if(confirmed)latest.dilutedShares=shares;
  }
}
export function applyCachedEdinetInterim(f: Fundamentals, docs: EdinetDocument[], prices?: PriceHistory | null): void {
  f.ttm=null;
  const doc=latestInterim(f,docs);if(!doc)return;
  const path=corpusPath(`raw/edinet/csv/${doc.docID}.zip`);if(!existsSync(path))return;
  applyEdinetInterim(f,doc,csvFilesFromZip(path).flatMap(parseEdinetCsv),prices);
}
