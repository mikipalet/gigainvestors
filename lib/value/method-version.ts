/** New rule changes get a new entry; published forward observations are never restated. */
export const METHOD_CHANGES = [
  { version: '3.0.0', date: '2026-10-01', changelog: 'Live index universe, valuation v2, financial tests, completeness requirements and thesis check.' },
] as const;
export const METHOD_VERSION = METHOD_CHANGES[0].version;
