# integrate-2 report

STATUS: PASS

Worktree: `/Users/miki/GitHub/superinvestors-wt/value`, branch `value`.
Starting HEAD: `772fac0`. Verified implementation HEAD: `68c54b540e48088b198ecedb28946a27e59d1bb4`.
Completed 2026-09-29 UTC, without subagents. This report is committed separately after the implementation commits below.

## Commits by step

1. `64ee05f` merges `value-e-site` through `0893bf5`, including site and visualization rounds 1–3. Resolves the types conflict against the Task 14 contracts. Removes the temporary price adapter; every site caller uses `priceTest({ valuation, price, requiredMos })`, with the configured stable discount for legacy snapshots.
2. `44e58b4` merges `value-k-ops` through `fa061a1`. Preserves the site reader helpers, ops quote validation and fetch timeout, both price tuple formats, and seed provenance on dossiers and index rows. Combines enriched-listing dedupe with the existing fundamentals-evidence audit, keeping unmatched secondary rows. Preserves the Yahoo history fallback at the shared EODHD budget and the persisted monthly-history quota.
3. `5b21852` makes CHTR.US an exception with the exact requested explanation. Calibration fails only for false positives or negatives among scored rows; missing/insufficient and unclear rows remain reported.
4. `c994abd` sets configured analysis concurrency to 64 and report concurrency to six SEC jobs and three ESEF jobs. Jev stays at 18 requests/sec. SEC's 8 requests/sec limiter now covers retries as well as initial requests; ESEF's existing request limiter is preserved. ESEF-to-SEC fallbacks use the SEC pool.
5. `dda5606` resolves the deferred operations and site issues, plus integration gaps exposed by the tests.
6. `68c54b5` fixes seed provenance wrapping on phones and verifies it in Playwright.

Both requested branch tips are ancestors of the final implementation HEAD.

## Deferred issues resolved

- Deleted unused `dailyBudgetSplit` and its tests; production uses the persisted ledger and actual remaining budget.
- Screener requests reserve five calls, configured in `T.budget`.
- Typed budget errors preserve `daily EODHD budget reached; resume after 00:00 UTC`; unrelated transport failures still redact request details.
- Runner locks check PID liveness. Dead owners can be reclaimed, competing reclaimers are excluded, and live/unverifiable owners are preserved.
- Dedupe prunes only timestamped input backups older than seven days, retaining the exact seven-day boundary and unrelated files.
- Publish and status share the single `readPrices` helper.
- Ops integration, price-history and dedupe test directories use `os.tmpdir()`.
- History disclosures now say `Show value data` and `Show price data`.
- Gross-margin label reads `FY2023 vs mean(FY2019, FY2020)` and uses the current configured 4 pp ceiling.
- Renamed moat metrics/configuration to `roicSecondLowest`, `roeSecondLowest` and the corresponding financial threshold. Updated consumers and recorded site fixtures.
- Added labels for all current backend metrics, including DSRI, buyback rank correlation, working-capital changes and retained-earnings years. Matched inclusive thresholds to the backend.
- Headline uses analysed coverage, with total universe coverage stated separately.
- Seeded quotes display `price derived from market cap on {date}`, wrap on phones, and are not called a latest close in the price explanation.

Task 14 history, events, per-share series, required margin and volatility fields are retained. The index uses `m` for its required margin and `r` for its ROIC sparkline. Ops reader tolerance is retained.

## Verification

All checks below passed on the final implementation:

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Exit 0 |
| `npx vitest run tests/unit` | 45 files, 712 tests passed |
| `npx playwright test` | 20 tests passed, including existing main-site tests |
| `VALUE_STORE_DIR=tests/fixtures/value/store npx next build --webpack` | Exit 0; 6,197 static pages generated |
| `bash -n scripts/value/run-daily.sh` | Exit 0 |
| `git diff --check` | Clean |
| `npm run knip` | Skipped: no knip script or dependency in this repository |

The production build and browser suite use the recorded fixture store. No deployment or publish was performed. Tests reproduced the missing-data gate, screener undercount, swallowed budget message, dead-PID lock, expired backup retention, and phone overflow before their fixes. The full site contract test also exposed missing backend metric labels, which are now covered.

Read-only calibration of the existing local corpus through the final `calibrationSummary` returned `failed: false`: TP 8, TN 12, FP 0, FN 0, unclear 1, missing 13, exceptions 2. This reused saved analyses and listing aliases; it did not rerun paid analysis or refresh missing data.

Missing rows: DPZ.US, 8058.JP, 8031.JP, 8001.JP, 8002.JP, 8053.JP, NCLH.US, VALE.US, AMC.US, LCID.US, RIVN.US, CCL.US, OXY.US. These remain visible in calibration reporting and do not fail the gate.

Validation logs: `/tmp/value-integrate-unit.log`, `/tmp/value-integrate-playwright.log`, `/tmp/value-integrate-build.log`. Generated `tsconfig.tsbuildinfo` changes were discarded; the worktree is left clean after committing this report.
