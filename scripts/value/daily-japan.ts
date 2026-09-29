import { rmSync } from "node:fs";
import { T } from "../../lib/value/config";
import { corpusPath, readCorpusJson, writeCorpusJson } from "../../lib/value/corpus";

// The runner lock serializes this cursor with Japan's resumable issuer checkpoints.
interface Range { from: string; to: string }
interface Summary extends Range { errors: unknown[] }
const stateFile = "raw/edinet/daily-range.json";
const [action, today] = process.argv.slice(2);
function validate(range: Range): void {
  for (const day of [range.from, range.to]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day)
      throw new Error("Invalid daily Japan filing date");
  }
  if (range.from > range.to || range.to > today) throw new Error("Invalid daily Japan filing range");
}

const pending = readCorpusJson<Range>(stateFile);
const summary = readCorpusJson<Summary>("raw/edinet/summary.json");
if (action === "prepare") {
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCFullYear(start.getUTCFullYear() - T.edinet.filingYears);
  const previous = pending ?? (summary ? {
    from: Array.isArray(summary.errors) && !summary.errors.length ? summary.to : summary.from,
    to: summary.to,
  } : { from: start.toISOString().slice(0, 10), to: today });
  validate(previous);
  // The previous run may have cached its last day before all filings arrived.
  // Invalidate before persisting the new range, so interruption cannot lose this refresh.
  rmSync(corpusPath(`raw/edinet/days/${previous.to}.json`), { force: true });
  writeCorpusJson(stateFile, { from: previous.from, to: today });
  console.log(previous.from);
} else if (action === "complete") {
  if (!pending) throw new Error("Missing daily Japan filing range");
  validate(pending);
  // Missing credentials is a successful CLI skip, not a completed import.
  if (summary?.from !== pending.from || summary.to !== pending.to || !Array.isArray(summary.errors) || summary.errors.length)
    throw new Error("Japan import not completed; retaining daily filing range for retry");
  writeCorpusJson(stateFile, { from: pending.to, to: pending.to });
} else {
  throw new Error("Usage: daily-japan.ts prepare|complete YYYY-MM-DD");
}
