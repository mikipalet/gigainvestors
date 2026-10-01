import { readdirSync, statSync } from "node:fs";
import { corpusPath, readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { normalizeEodhd } from "../../../lib/value/normalize-eodhd";
import { checkIntegrity } from "../../../lib/value/integrity";
import { readPriceHistory } from "../../../lib/value/price-history";
import type { Fundamentals, Year } from "../../../lib/value/types";

interface Options { only?: string[]; limit?: number }

/** Discovered by cli.ts alongside the other stages; deliberately imports no API client. */
export default async function renormalize(options: Options): Promise<void> {
  let files: string[];
  try { files = readdirSync(corpusPath("raw/eodhd")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    files = [];
  }
  let edinetFiles: string[] = [];
  try { edinetFiles = readdirSync(corpusPath("raw/edinet/issuers")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const edinetIds = new Set(edinetFiles.filter(file => file.endsWith(".JP.json")).map(file=>file.slice(0,-5)));
  const ids = [...new Set([...files.filter(file => file.endsWith(".json")).map(file => file.slice(0, -5)), ...edinetIds])]
    .filter(id => !options.only || options.only.includes(id)).sort().slice(0, options.limit);
  let written = 0;
  let skipped = 0;
  let failed = 0;
  const splitAdjusted: string[] = [];
  const breakdown: Record<string, number> = {};
  for (const id of ids) {
    if (edinetIds.has(id)) {
      const raw = readCorpusJson<{years?: Year[]; fetchedAt?: string}>(`raw/edinet/issuers/${id}.json`);
      const existing = readCorpusJson<Fundamentals>(`fundamentals/${id}.json`);
      if (!raw?.years && !existing) { skipped++; continue; }
      // Older issuer checkpoints predate raw-year retention; recheck their
      // available history until japan next rebuilds them from cached ZIPs.
      const fundamentals: Fundamentals = {id,currency:"JPY",years:raw?.years ?? existing!.years,
        integrity:{ok:false,reasons:[],...(!raw?.years && existing?.integrity.notes ? {notes:existing.integrity.notes} : {})},
        fetchedAt:raw?.fetchedAt ?? existing!.fetchedAt,
        ...(existing?.splits ? {splits:existing.splits} : {})};
      fundamentals.integrity = checkIntegrity(fundamentals, { source: "edinet", priceHistory: readPriceHistory(id) });
      if (JSON.stringify(fundamentals) === JSON.stringify(existing)) skipped++;
      else { writeCorpusJson(`fundamentals/${id}.json`, fundamentals); written++; }
      if (fundamentals.integrity.notes?.some(note => note.startsWith("split ") && note.endsWith(" adjusted"))) splitAdjusted.push(id);
      if (!fundamentals.integrity.ok) failed++;
      for (const reason of new Set(fundamentals.integrity.reasons.map(reason=>reason.startsWith("balance sheet off") ? "balance sheet off" : reason)))
        breakdown[reason] = (breakdown[reason] ?? 0) + 1;
      continue;
    }
    const rawPath = corpusPath(`raw/eodhd/${id}.json`);
    const before = statSync(rawPath);
    if (Date.now() - before.mtimeMs < 10_000) { skipped++; continue; }
    const raw = readCorpusJson<unknown>(`raw/eodhd/${id}.json`);
    const existing = readCorpusJson<Fundamentals>(`fundamentals/${id}.json`);
    // A 404 fallback is newer source evidence, not an invitation to replay old EODHD data.
    if (existing?.years?.some(year => Object.values(year.provenance ?? {}).some(p => p.source.startsWith('raw/yahoo-fundamentals/')))) {
      skipped++; continue;
    }
    const { fundamentals } = normalizeEodhd(raw, id);
    fundamentals.fetchedAt = existing?.fetchedAt ?? before.mtime.toISOString();
    const after = statSync(rawPath);
    if (before.ino !== after.ino || before.mtimeMs !== after.mtimeMs || before.size !== after.size || Date.now() - after.mtimeMs < 10_000) {
      skipped++; continue;
    }
    writeCorpusJson(`fundamentals/${id}.json`, fundamentals);
    written++;
    if (fundamentals.integrity.notes?.some(note => note.startsWith("split ") && note.endsWith(" adjusted"))) splitAdjusted.push(id);
    if (!fundamentals.integrity.ok) failed++;
    // Count companies per reason family, not individual bad years.
    const reasons = new Set(fundamentals.integrity.reasons.map(reason =>
      reason.startsWith("balance sheet off") ? "balance sheet off" : reason.startsWith("gap year") ? "gap year" : reason));
    for (const reason of reasons) breakdown[reason] = (breakdown[reason] ?? 0) + 1;
  }
  console.log(`renormalize: ${written} written, ${skipped} skipped (unchanged, recent or changed raw); ${failed} failed integrity`);
  console.log(`integrity failure breakdown (companies; reasons may overlap): ${JSON.stringify(breakdown)}`);
  console.log(`split-adjusted: ${splitAdjusted.length} companies ${JSON.stringify(splitAdjusted)}`);
}
