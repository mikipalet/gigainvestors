import { statSync } from "node:fs";
import { corpusPath, readCorpusJson, readJsonl, writeCorpusJson } from "../../../lib/value/corpus";
import { callsUsedToday, getFundamentals } from "../../../lib/value/eodhd";
import { normalizeEodhd } from "../../../lib/value/normalize-eodhd";
import type { Company } from "../../../lib/value/types";

interface Options { only?: string[]; limit?: number; force?: boolean }

function fresh(rel: string): boolean {
  try {
    return Date.now() - statSync(corpusPath(rel)).mtimeMs < 80 * 86400000;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export default async function fundamentals(options: Options): Promise<void> {
  const universe = readJsonl<Company>("universe.jsonl");
  if (!universe.length) throw new Error("Run the universe stage before fundamentals");
  const selected = universe.filter((company) => (!options.only || options.only.includes(company.id)) && company.source !== "edinet")
    .slice(0, options.limit);
  let written = 0;
  let skipped = 0;
  for (const company of selected) {
    const destination = `fundamentals/${company.id}.json`;
    if (!options.force && fresh(destination)) { skipped++; continue; }
    if (await callsUsedToday() > 99_000) {
      console.log("daily EODHD budget reached, resume tomorrow");
      break;
    }
    const raw = await getFundamentals(company.id);
    const { fundamentals: normalized, patch } = normalizeEodhd(raw, company.id);
    const existing = readCorpusJson<Partial<Company>>(`companies/${company.id}.json`);
    writeCorpusJson(`raw/eodhd/${company.id}.json`, raw);
    writeCorpusJson(`companies/${company.id}.json`, { ...company, ...existing, ...patch });
    writeCorpusJson(destination, normalized);
    written++;
    console.log(`${company.id}: ${normalized.years.length} annual periods, integrity ${normalized.integrity.ok ? "ok" : normalized.integrity.reasons.join("; ")}`);
  }
  console.log(`fundamentals: ${written} written, ${skipped} fresh`);
}
