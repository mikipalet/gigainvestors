import { readCorpusJson, readJsonl, writeCorpusJson } from "../../../lib/value/corpus";
import { checkIntegrity } from "../../../lib/value/integrity";
import { readPriceHistory } from "../../../lib/value/price-history";
import type { Company, Fundamentals, Year } from "../../../lib/value/types";

/** Rebuild cached issuer years offline; never reuse previously inferred adjustments. */
export default async function renormalizeEdinet({ only, limit }: { only?: string[]; limit?: number }): Promise<void> {
  const companies = readJsonl<Company>("universe.jsonl")
    .filter(company => company.source === "edinet" && (!only || only.includes(company.id))).slice(0, limit);
  let written = 0;
  let missing = 0;
  const adjusted: string[] = [];
  for (const company of companies) {
    const raw = readCorpusJson<{ years?: Year[] }>(`raw/edinet/issuers/${company.id}.json`);
    const before = readCorpusJson<Fundamentals>(`fundamentals/${company.id}.json`);
    if (!Array.isArray(raw?.years) || !before) { missing++; continue; }
    const f: Fundamentals = { ...before, years: raw.years, integrity: { ok: true, reasons: [] } };
    f.integrity = checkIntegrity(f, { source: company.source, priceHistory: readPriceHistory(company.id) });
    writeCorpusJson(`fundamentals/${company.id}.json`, f);
    written++;
    if (f.integrity.notes?.some(note => note.startsWith("split ") && note.endsWith(" adjusted"))) adjusted.push(company.id);
  }
  console.log(`renormalize-edinet: ${written} written, ${missing} missing cached issuer years or fundamentals`);
  console.log(`split-adjusted: ${adjusted.length} companies ${JSON.stringify(adjusted)}`);
}
