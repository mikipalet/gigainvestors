import { cachedInterimDocuments, applyCachedEdinetInterim } from "../../../lib/value/japan/cached-interim";
import { reconcileEdinetShares } from "../../../lib/value/japan/shares";
import { existsSync, readdirSync } from "node:fs";
import { annualReportDocuments, csvFilesFromZip, type DocumentDay, type EdinetDocument } from "../../../lib/value/japan/edinet";
import { mergeYears, parseEdinetCsv, yearsFromEdinet } from "../../../lib/value/japan/xbrl-csv";
import { corpusPath, readCorpusJson, readJsonl, writeCorpusJson } from "../../../lib/value/corpus";
import { checkIntegrity } from "../../../lib/value/integrity";
import { readPriceHistory } from "../../../lib/value/price-history";
import type { Company, Fundamentals, Year } from "../../../lib/value/types";

/** Reparse every cached filing offline; keep original years before split/integrity adjustments. */
export default async function renormalizeEdinet({ only, limit }: { only?: string[]; limit?: number }): Promise<void> {
  const companies = readJsonl<Company>("universe.jsonl")
    .filter(company => company.source === "edinet" && (!only || only.includes(company.id))).slice(0, limit);
  const ids = new Set(companies.map(c => c.id));
  const documents = new Map<string, Map<string, EdinetDocument>>();
  const days = corpusPath("raw/edinet/days");
  for (const file of existsSync(days) ? readdirSync(days).sort() : []) {
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(file)) continue;
    const day = readCorpusJson<DocumentDay>(`raw/edinet/days/${file}`);
    if (day?.metadata.status !== "200" || !Array.isArray(day.results)) continue;
    for (const doc of annualReportDocuments(day)) {
      const id = `${doc.secCode.slice(0, 4)}.JP`;
      if (!ids.has(id) || !existsSync(corpusPath(`raw/edinet/csv/${doc.docID}.zip`))) continue;
      if (!documents.has(id)) documents.set(id, new Map());
      documents.get(id)!.set(doc.docID, doc);
    }
  }
  const interimDocuments = cachedInterimDocuments();
  let written = 0;
  let missing = 0;
  const adjusted: string[] = [];
  for (const company of companies) {
    const raw = readCorpusJson<{ years?: Year[] }>(`raw/edinet/issuers/${company.id}.json`);
    const before = readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`);
    if (!before) { missing++; continue; }
    const docs = [...documents.get(company.id)?.values() ?? []]
      .sort((a, b) => a.submitDateTime.localeCompare(b.submitDateTime) || a.docID.localeCompare(b.docID));
    let years: Year[] = [];
    for (const doc of docs) {
      const rows = csvFilesFromZip(corpusPath(`raw/edinet/csv/${doc.docID}.zip`)).flatMap(parseEdinetCsv);
      years = mergeYears(years, yearsFromEdinet(rows));
    }
    // Older/offline corpus snapshots may contain issuer checkpoints only.
    if (!docs.length) years = raw?.years ?? [];
    if (!years.length) { missing++; continue; }
    if (docs.length) writeCorpusJson(`raw/edinet/issuers/${company.id}.json`, { ...raw, years });
    const prices = readPriceHistory(company.id);
    years = years.map(year => reconcileEdinetShares(year, prices));
    const f: Fundamentals = { ...before, years: years.map(y => ({ ...y })), integrity: { ok: true, reasons: [] } };
    applyCachedEdinetInterim(f, interimDocuments.get(company.id) ?? [], prices);
    f.integrity = checkIntegrity(f, { source: company.source, priceHistory: prices });
    writeCorpusJson(`fundamentals/${company.id}.json`, f);
    if (++written % 100 === 0) console.log(`renormalize-edinet: ${written}/${companies.length} issuers`);
    if (f.integrity.notes?.some(note => note.startsWith("split ") && note.endsWith(" adjusted"))) adjusted.push(company.id);
  }
  console.log(`renormalize-edinet: ${written} written, ${missing} missing cached issuer years or fundamentals`);
  console.log(`split-adjusted: ${adjusted.length} companies ${JSON.stringify(adjusted)}`);
}
