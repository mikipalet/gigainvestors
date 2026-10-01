# Jev thesis check implementation plan

User specification: thesis check for broken businesses, 2026-10-01.

Keep the ten-year quality tests intact. Add a separately versioned, filing-grounded thesis stage and apply its trusted decisions when producing a snapshot. No analysis writes, web builds, remote publication, or subagents. Stop below 5 GB free on /. Store small per-company results in ~/value-corpus/thesis; preview with publish --out ~/value-corpus/staging/thesis-1.

- [x] Test and implement typed questions, source-bound evidence, calibrated trust and decisions. Require exact quotes, source URLs, matching question versions, and >=0.90 labelled accuracy. Preserve unclear/no answers without public uncertainty text.
- [x] Select all buy and eligible next-closest candidates, quality passes with >40% two-year drawdowns, and financial businesses with >10% equity provisions/legal charges in either recent year.
- [x] Read held annual sections and fetch official annual/interim supplements (SEC/IR/EDINET/ESEF). Record coverage gaps privately; never treat a failed fetch as a clean answer.
- [x] Label requested calibration filings before calling Jev, record raw responses and per-question accuracy in jev-trust.json. Do not bless a question without both positive and negative examples.
- [x] Integrate thesis exclusion into publication, quote refresh, browser selection, and dossier verdict. Show guided owner-earnings adjustments with the filing quote; preserve cash separately in valuation.
- [x] Run recorded-response and integration tests without a web build. Run the thesis stage, manually check Close Brothers/Zoetis/Lululemon/Copart, stage the snapshot, and report every selected company's answers/evidence and resulting buys.
- [x] Review the diff, commit `value: Jev thesis check for broken businesses`, and write the requested report under ../value/.superpowers/sdd/2026-09-29-value/jev-thesis-1-report.md.

Validation outcome: 137 tests pass; targeted TypeScript and shell checks pass. Local staged buys: 22 → 18. Liability/guidance calibrated at 10/10; structural/distress remain disabled at 8/10 and 7/10. All 356 candidates have a private result, but 106 have no readable official filing and remain unchanged. See the requested private report for full coverage notes and spot checks. No build, analyze, remote publish or subagents.
