/** New rule changes get a new entry; published forward observations are never restated. */
export const METHOD_CHANGES = [
  { version: '3.3.0', date: '2026-10-04', changelog: 'Quarterly LTM; two-quarter confirmation.' },
  { version: '3.2.0', date: '2026-10-01', changelog: 'Expected return solves the same valuation cash flows; applied quality rules are explicit; capex flags require lagging earnings and goodwill uses assets.' },
  { version: '3.1.0', date: '2026-10-01', changelog: 'Evidence-backed judgement (e.g. growth capex), business section, materiality-sized red and green flags.' },
  { version: '3.0.0', date: '2026-10-01', changelog: 'Live index universe, valuation v2, financial tests, completeness requirements and thesis check.' },
] as const;
export const METHOD_VERSION = METHOD_CHANGES[0].version;
