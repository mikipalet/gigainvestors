import reviewed from './reviewed-input-errors.json';

/** Companies whose vendor inputs were checked against primary filings and found
 * wrong in a way no general rule corrects yet (for example statements in one
 * currency labelled as another, or a lender valued as an operating company).
 * The valuation is withheld and the company cannot be a Buy until the input is
 * corrected. Every entry names the filing that contradicts the vendor input. */
export interface ReviewedInputError { reviewed: string; reason: string; source: string }
const entries = reviewed as Record<string, ReviewedInputError>;

export function reviewedInputError(id: string | undefined): ReviewedInputError | null {
  return id ? entries[id] ?? null : null;
}
export function reviewedInputFlags(id: string | undefined): string[] {
  const entry = reviewedInputError(id);
  return entry ? [`Reviewed input error (${entry.reviewed}): ${entry.reason} Source: ${entry.source}`] : [];
}
export const REVIEWED_INPUT_ERROR_IDS = Object.keys(entries).sort();
