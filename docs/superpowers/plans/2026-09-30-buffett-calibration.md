# Buffett purchase calibration implementation plan

Goal: reproduce Berkshire purchase-quarter screening under live valuation and an isolated durable-growth proposal, without changing production defaults.

Architecture: new `lib/value/buffett-calibration.ts` contains pure date, price, holding-delta, valuation and scoring functions. New `scripts/value/buffett-*` scripts fetch public SEC evidence and run read-only corpus comparisons. Unit tests cover time boundaries, missing data, amendments, split-neutral comparisons and proposal eligibility. All generated data goes to `/Users/miki/value-corpus/staging/buffett-1/`; the requested report is also copied to the designated value worktree.

Constraints: no subagents, builds, publish, push, production-default changes or writes outside corpus staging. Stop below 5 GB free. Existing worktree is isolated. Commit once with the requested message. Execute inline as authorized in the brief.

- [x] Fetch 2004 baseline and 2005–2025 SEC 13F filings, including amendments. Preserve accession, filing/report dates and source URLs. Derive first observed positions only across consecutive quarters; distinguish preexisting and corporate actions.
- [x] Add named special/foreign/earlier purchases with primary-source evidence and manager attribution. Missing history remains unavailable.
- [x] Test and implement fiscal filing cutoff before purchase-quarter start, complete quarter monthly-close proxy, strict missing denominators and isolated stable-grower valuation. Never call monthly closes VWAP.
- [x] Run current numeric quality tests and valuation on historical prefixes. Record missing dates, restatement caveat, share/FX basis, expected return and every blocker. Do not reuse current report interpretation historically.
- [x] Compare proposal across all existing analysis records, preserving quality, integrity, quote, FX and expected-return gates. Capture input hashes to expose concurrent corpus changes.
- [x] Run existing calibration command against a small staged calibration corpus, never live corpus. Run focused unit tests and self-review.
- [x] Write report with before/after scores, ablations, exact corpus names, source/coverage limits and recommendation. Commit module, tests, scripts and report.

Execution note: the strict as-filed point-in-time claim remains unavailable. The report distinguishes restated fiscal-prefix replay, filing-date sensitivity, specials, manager attribution and missing-history cases. No missing case was converted into a pass or rejection.
