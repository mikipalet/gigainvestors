import { CALIBRATION } from "../../../lib/value/calibration";
import { readCorpusJson } from "../../../lib/value/corpus";
import type { Analysis } from "../../../lib/value/types";
import analyze, { type Options } from "./analyze";

export function calibrationSummary({ entries, analyses }: { entries: typeof CALIBRATION; analyses: Map<string, Analysis> }) {
  const counts = { truePositive: 0, trueNegative: 0, falsePositive: 0, falseNegative: 0, unclear: 0, missing: 0, exception: 0 };
  const rows = entries.map(entry => {
    const analysis = analyses.get(entry.id);
    const results = analysis ? Object.fromEntries(Object.entries(analysis.tests).map(([key, test]) => [key, test.result])) : {};
    let verdict: string;
    if (!analysis || analysis.status !== "scored") { counts.missing++; verdict = "missing or insufficient data"; }
    else if (entry.expect === "exception") { counts.exception++; verdict = "exception"; }
    else {
      const failed = Object.keys(results).filter(key => results[key] === "fail");
      const allPass = Object.values(results).length === 5 && Object.values(results).every(result => result === "pass");
      if (entry.expect === "quality" && failed.length) { counts.falseNegative++; verdict = `FAIL: ${failed.join(", ")}`; }
      else if (entry.expect === "not_quality" && allPass) { counts.falsePositive++; verdict = "FAIL: all five quality tests pass"; }
      else if (entry.expect === "quality" && allPass) { counts.truePositive++; verdict = "correct"; }
      else if (entry.expect === "not_quality" && failed.length) { counts.trueNegative++; verdict = `correct: ${failed.join(", ")}`; }
      else { counts.unclear++; verdict = "unclear"; }
    }
    return { id: entry.id, expect: entry.expect, ...results, verdict };
  });
  return { rows, counts, failed: counts.falseNegative + counts.falsePositive + counts.missing > 0 };
}

export default async function calibrate(options: Options): Promise<void> {
  const entries = CALIBRATION.filter(entry => !options.only || options.only.includes(entry.id)).slice(0, options.limit);
  if (!entries.length) throw new Error("No calibration companies selected");
  await analyze({ ...options, only: entries.map(entry => entry.id), limit: undefined });
  const analyses = new Map<string, Analysis>();
  for (const { id } of entries) {
    const analysis = readCorpusJson<Analysis>(`analysis/${id}.json`);
    if (analysis) analyses.set(id, analysis);
  }
  const summary = calibrationSummary({ entries, analyses });
  console.table(summary.rows);
  console.log(`Confusion counts: ${JSON.stringify(summary.counts)}`);
  if (summary.failed) process.exitCode = 1;
}
