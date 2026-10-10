import {readCorpusJson, writeCorpusJson} from '../../lib/value/corpus';
import {validCompanyId} from '../../lib/value/companies';

/**
 * Per-company analysis failures are tolerated up to this share of the companies
 * that needed a fresh analysis in the run (written + failed). Observed nightly
 * per-company failures are 10-25 of 6,000-10,000 fresh analyses (0.1-0.4%); a
 * provider outage, missing key or broken input fails nearly every fresh reading.
 * 2% is several times the worst observed per-company night yet far below any
 * outage, so above it the stage still fails and the runner publishes nothing new.
 * Deliberately not in T: T is part of every analysis fingerprint.
 */
export const MAX_ANALYSIS_FAILURE_SHARE = 0.02;
const FILE = 'staging/analysis-retained.json';

export interface AnalysisRetained {version: 1; updatedAt: string; ids: string[]; reasons: Record<string, string>}

export function systemicAnalysisFailure(failed: number, fresh: number, share = MAX_ANALYSIS_FAILURE_SHARE): boolean {
  return failed > Math.floor(share * fresh);
}

/** Companies whose latest analysis attempt failed; publication keeps their released records. */
export function readAnalysisRetained(): AnalysisRetained {
  const file = readCorpusJson<AnalysisRetained>(FILE);
  if (!file) return {version: 1, updatedAt: '', ids: [], reasons: {}};
  if (file.version !== 1 || !Array.isArray(file.ids) || file.ids.some(id => typeof id !== 'string' || !validCompanyId(id, 'analysis retained'))
    || typeof file.reasons !== 'object' || file.reasons === null) throw Error(`Invalid ${FILE}`);
  return file;
}

/** Attempted companies leave the list on success and join it on failure; others keep their state. */
export function recordAnalysisRetained(attempted: Iterable<string>, failures: Record<string, string>): AnalysisRetained {
  const previous = readAnalysisRetained(), seen = new Set(attempted);
  const ids = [...new Set([...previous.ids.filter(id => !seen.has(id)), ...Object.keys(failures)])].sort();
  const reasons = Object.fromEntries(ids.map(id => [id, failures[id] ?? previous.reasons[id] ?? 'analysis failed']));
  const next: AnalysisRetained = {version: 1, updatedAt: new Date().toISOString(), ids, reasons};
  writeCorpusJson(FILE, next);
  return next;
}
