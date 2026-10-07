/** New rule changes get a new entry; published forward observations are never restated. */
export const METHOD_CHANGES = [
  { version: '3.6.0', date: '2026-10-07', changelog: 'Owner-authorized correctness override: charge stock compensation once, and value every operating business at its five-year median owner-earnings margin times current annual or complete TTM revenue. Keep loss years, revenue-decline override and cyclical discounts; financial and NAV methods remain separate. TTM maintenance uses annual capacity context. Historical returns are reported per correction, not a release veto; unapproved Buy flips retain complete published records. Cash-conversion presentation remains based on five-year totals.' },
  { version: '3.5.0', date: '2026-10-06', changelog: 'Judge the record, not one bad year: one fully recovered positive operating-margin dip can meet the existing variation bar; gross-margin resilience compares recent and typical margins instead of permanently anchoring to FY2023. Raw variability, capital-return thresholds, financial tests, valuation and price gates remain unchanged.' },
  { version: '3.4.0', date: '2026-10-05', changelog: 'Understandable margins may improve steadily: positive, loss-free histories can pass with a monotone rise or a dominant upward trend. Other quality and price thresholds, financial tests, verdict freezes and LTM confirmation are unchanged.' },
  { version: '3.3.0', date: '2026-10-04', changelog: 'Quarterly LTM; two-quarter confirmation.' },
  { version: '3.2.0', date: '2026-10-01', changelog: 'Expected return solves the same valuation cash flows; applied quality rules are explicit; capex flags require lagging earnings and goodwill uses assets.' },
  { version: '3.1.0', date: '2026-10-01', changelog: 'Evidence-backed judgement (e.g. growth capex), business section, materiality-sized red and green flags.' },
  { version: '3.0.0', date: '2026-10-01', changelog: 'Live index universe, valuation v2, financial tests, completeness requirements and thesis check.' },
] as const;
export const METHOD_VERSION = METHOD_CHANGES[0].version;
