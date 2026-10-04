READY

All format fixes and final full-suite verification passed. This report covers the unify-2 format/test task, not the separate visual release gates in unify-1.

## Corrections

- Financial rates use one decimal consistently (`13.0%`, `15.3%`, `70.7%`). Reusing the adaptive portfolio-weight formatter discarded meaningful tenths above 10%. The original portfolio weight formatter remains adaptive; weights and financial threshold rates have different semantics. Raw calculations and verdicts are unchanged.
- USD totals retain the intended `$` and compact precision. Per-share prices retain two decimals and explicit non-USD currencies. Updated stale expectations for the accounting context (`$10.00`), valuation bridge (`$36.78`), and owner-earnings waterfall (`$80.00`).
- The acquisition-capital, design-round-4, and polish failures were real precision regressions; their original assertions remain intact. The two moat cross-surface failures were fixed by restoring financial precision, not by weakening the audit.
- Updated unify-1 assertions for forward returns, generic financial rates and the exact 100% cap boundary to the corrected financial-rate policy.
- Markdown company/checklist prices and annual value ranges now use the page share-price formatter. Filing facts use the same compact amounts and rate precision as the story drawer. Added the missing acquisition-inclusive ROIC label and applied the existing >100% capital-return display cap to markdown metrics/charts.
- The surface audit keeps exact formatted-value comparisons and source-series/currency/year checks. It now checks all valuation summary fields, including safety discount and price/value, instead of only the first five. A mutation test proved the old audit missed an incorrect 99.0% safety discount.

## Surface evidence

`tests/unit/value-format-surfaces.test.ts` captures actual React-rendered markup, then exercises the production surface audit. It checks:

- Dossier moat tile versus evidence drawer: identical 45.0% / 33.0% / 33.0% summaries and annual observations. Precision, missing-value, currency and underlying-series mutations must fail.
- Shelf tile, company list, acquisition-inclusive drawer column and markdown: the same 0.153 source reads 15.3%, in USD and EUR cases. The moat's primary series deliberately excludes acquisitions; the shelf/list use the separately labelled inclusive metric. The test does not substitute one denominator for the other.
- Small share price 0.2049: `$0.20` / `EUR 0.20` in list and markdown; expected return 0.126: 12.6% in shelf, list and markdown.
- Price page/tile/drawer: quote, buy price, estimated values and expected return, including the corresponding paid API projection. Wrong price precision, rounded return, missing buy price and wrong discount are rejected.
- Filing total 483700000: 484M in a drawer table labelled USD, and $484M in standalone markdown; the adjacent financial rate is 15.3% in both.
- Capital return 1.29: >100% in markdown display, with the API retaining 1.29.

## Markdown and paid API contract

Production webpack server, using the local published store:

| URL | HTTP | Matching page values |
| --- | --- | --- |
| /value/ko.us.md | 200 text/markdown | Share price $85.65; buy below $30.21; expected return 6.8% |
| /value/plx.pa.md | 200 text/markdown | Share price EUR 13.98; no valuation/expected return published |

Both corresponding HTML URLs returned 200. Public `.md` rewrite coverage includes `/value/ko.us.md` explicitly.

The paid API intentionally returns full-precision JSON numbers, not presentation strings: e.g. a rate of 0.153 instead of `15.3%`, and uncapped capital returns instead of `>100%`. Currency fields identify monetary units. Rounding/capping the API would lose research data and break its numeric schema. Tests exercise the real projection and verify that formatting these values produces the page/drawer/markdown values. The full suite also covers endpoint schemas, derived-data restrictions and payment handling.

An unpaid local HTTP request to `/api/v1/companies/KO.US` returned 503 `payments_unconfigured`; local payment credentials are absent. No live paid transaction was attempted, and this is not a claim of payment settlement verification.

Intentional representation differences: prose may omit a trailing zero or expose more precision near a threshold to avoid suggesting equality; signs can use a typographic minus. Annual tables can place currency in their header instead of every cell. Dated source text and exact reported holder observations retain their citation/source precision rather than being rewritten as compact UI summaries. The raw paid API retains all computed numeric precision. These differences do not change the numeric basis or calculations.

## Validation

- Final full unit suite: **214 test files passed; 2,171 tests passed; 1 pre-existing skip; zero failures**. Exact command: `npx vitest run --testTimeout=15000`; exit 0, duration 249.99 seconds, started 2026-10-04 21:52:39 UTC.
- Production build: passed, `VALUE_STORE_DIR=/Users/miki/value-corpus/publish-repo npm run build -- --webpack`.
- Final TypeScript check: passed, `npx tsc --noEmit`.
- Actual-renderer surface tests: 6 passed. Original cross-surface suite: 17 passed, including drift rejection checks.
- `bottom-bar-hydration.test.ts`: 10 passed; `BottomBarShell` and its `useSelectedLayoutSegments` classification were not changed.
- `git diff --check`: passed.
- No subagents, no push, no secrets printed. node_modules remains a symlink. Observed free space remained above 4 GB (about 13 GB).

Commit subject: `gigainvestors: unified formats pass every surface check`. Controller ships.

The earlier unify-1 report's protected investor ellipses / literal pixel-comparison conditions were outside this format-fix task and were not re-audited here.

Evidence: [full unit suite](unify-2-evidence/full-unit-suite.log), [webpack build](unify-2-evidence/webpack-build.log), [typecheck](unify-2-evidence/typecheck.log), [HTTP comparison](unify-2-evidence/http-comparison.json). The versioned report copy is `docs/value/unify-2-report.md`; evidence files reside beside the controller report. Final free disk space before commit: 13,374,812 KiB (12.8 GiB), above the 4 GB stop threshold.
