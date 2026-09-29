import { readdirSync, statSync } from "node:fs";
import { corpusPath, readCorpusJson, writeCorpusJson } from "../../../lib/value/corpus";
import { normalizeEodhd } from "../../../lib/value/normalize-eodhd";
import type { Fundamentals } from "../../../lib/value/types";

interface Options { only?: string[]; limit?: number }

/** Discovered by cli.ts alongside the other stages; deliberately imports no API client. */
export default async function renormalize(options: Options): Promise<void> {
  let files: string[];
  try { files = readdirSync(corpusPath("raw/eodhd")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    files = [];
  }
  const ids = files.filter(file => file.endsWith(".json")).map(file => file.slice(0, -5))
    .filter(id => !options.only || options.only.includes(id)).sort().slice(0, options.limit);
  let written = 0;
  let skipped = 0;
  let failed = 0;
  const splitAdjusted: string[] = [];
  const breakdown: Record<string, number> = {};
  for (const id of ids) {
    const rawPath = corpusPath(`raw/eodhd/${id}.json`);
    const before = statSync(rawPath);
    if (Date.now() - before.mtimeMs < 10_000) { skipped++; continue; }
    const raw = readCorpusJson<unknown>(`raw/eodhd/${id}.json`);
    const existing = readCorpusJson<Fundamentals>(`fundamentals/${id}.json`);
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
  console.log(`renormalize: ${written} written, ${skipped} skipped (recent or changed raw); ${failed} failed (${written ? (failed / written * 100).toFixed(2) : "0.00"}%)`);
  console.log(`integrity failure breakdown (companies; reasons may overlap): ${JSON.stringify(breakdown)}`);
  console.log(`split-adjusted: ${splitAdjusted.length} companies ${JSON.stringify(splitAdjusted)}`);
}
