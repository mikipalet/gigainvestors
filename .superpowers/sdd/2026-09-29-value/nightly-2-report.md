# Nightly 2 — KEEP HOLD; disk-stop checkpoint

Checked 2 October 2026 in isolated worktree `value-zp-nightly`, starting from `3e5e49a`. Baseline: live release `ec02595c`. **The requested equality goal is not achieved. Do not lift the hold.** The requested commit title is a task label, not a claim of successful full-nightly verification.

## Hard stop

The user required “stop with a commit if df < 6 GB.” The staging monitor follows the runner's conservative 6 GiB threshold. It terminated the unfiltered analyze process with SIGTERM when available space reached **6,379,278,336 bytes (5.94 GiB)**. Full analyze did not complete. Business-backfill, post-analysis `publish --out`, and the full exact-diff guard were therefore **not run**. Work stopped at this checkpoint; no partial output was published.

Disk started around 7.4 GiB free and was below 6 GiB at stop. The monitored peak new private staging allocation was **18,505,728 bytes (17.65 MiB)**, including copied append logs. Existing source bytes are hardlinked or linked read-only. The much larger filesystem decline is not explained by this staging allocation; its external source was not investigated after the stop. The task stayed well below its 2 GB new-allocation budget.

## Changes made and verified

- Kept `PIPELINE_VERSION = "23"`. Added a memo-input revision to the analysis fingerprint, so older cached analyses cannot silently skip the new snapshot.
- Normal analysis already calls `alignHistoryShares` before price-derived calculations. The replay confirms this produces the released Toyota/Sompo pass outcomes; there was no missing call to transplant from the release script. The remaining exact numeric mismatches come from the different input bases used by release-only replay versus full analysis and remain unresolved.
- Analysis now records computed memo lines in `analysis/<id>.json`, and saves final split-normalized, price-derived, judgement-adjusted `memoYears` in private `analysis/inputs/<id>.json` for index members. These are the same rows used by the tests, including per-share corrections. The snapshot is tied to the analysis timestamp to reject stale rows.
- Business-backfill consumes that snapshot when present. Publication uses it for Q2 and keeps the capital-return metrics already calculated by analysis, avoiding a second reconstruction from mutable raw fundamentals. Legacy analyses still use the existing fallback.
- Research fingerprints no longer include the analysis execution timestamp or its previous composed memo. Actual analysis values, statement rows, facts, reviewed claims and prices still invalidate them. This fixes one source of needless research requeueing; complete memo/output determinism and equality to live are **not yet established**.

Regression: the new stage test failed on the missing final statement snapshot before implementation and passed afterward. Ran the complete targeted set: `analyze.test.ts`, `memo-inputs.test.ts`, `publish.test.ts`, `split-scope.test.ts`, and `price-history-splits.test.ts`: **5 files, 120 tests passed**. No web build, dependency installation, UI edits, subagents, push, deployment, or remote publication.

## Execution

Staging: `/Users/miki/GitHub/superinvestors-wt/value-zp-nightly/.fix5c/nightly-2`.

Writable analysis, Jev, bonds, backfill and staging caches use hardlinks with atomic replacements; direct writes/appends break hardlinks first. Other source directories are read-only symlinks. A Node preload rejects writes outside staging or through read-only file symlinks, checks disk before writes/requests, and records only request host/path, never headers or keys. The Python monitor checks free space and private blocks every three seconds.

1. Tried normal analysis for `7203.JP,8630.JP,8001.JP,8031.JP,8058.JP`. All five failed before analysis on the existing EODHD daily-budget ceiling. Paid authorization does not bypass the provider budget guard.
2. Retried those five with `VALUE_NO_EODHD=1` (cached yields/FX, as in nightly-check-1). **5 written, 0 unchanged, 0 failed**, all pipeline 23, all with final memo-input snapshots. Jev remained enabled; these five used cached answers.
3. Started the full, unfiltered analyze with two workers and cached yields/FX, Jev enabled, no force and no injected answers. Disk monitor terminated it. The sidecar lists every private analysis left in staging. None constitutes a completed full-nightly result.

## Diff table

These comparisons are **the five completed staged analysis records versus live dossier test payloads**, not a post-publish exact-diff result. Publication transformations can further change them. They are sufficient to show that the equality gate cannot be called passed.

| Company | Test-result differences across five quality tests | Remaining metric differences | Cause / acceptance |
|---|---:|---|---|
| Toyota `7203.JP` | 0; management remains pass | Moat: totalRoicMedian, roicMedian, roicSecondLowest. Management: ten metrics including share CAGR, per-share endpoints/growth, market-cap gain and ROIC | Normal source completion/recalculation versus frozen release inputs; not demonstrated to be new source arrivals; NOT accepted |
| Sompo `8630.JP` | 0; economics and management remain pass | retainedPerShare, retainedBookRatio | Completed buyback inputs versus the frozen release retained-share inputs; NOT accepted as new data |
| ITOCHU `8001.JP` | 0 | totalRoicMedian | Normal analysis and legacy publisher used different statement bases; NOT accepted |
| Mitsui `8031.JP` | 0 | totalRoicMedian, roicMedian | Different completed statement basis; NOT accepted |
| Mitsubishi `8058.JP` | 0 | totalRoicMedian | Different statement basis; no evidence of a new filing; NOT accepted |
| Full staged publication / exact-diff guard | Not available | Not measured | Disk stop before completion |
| 742-company memo drift, 834 changed answers and three removed Q2 lines from check 1 | Not fully replayed | Still unresolved as a release gate | Do not infer they are fixed from targeted tests |

The sidecar gives the exact per-company metric names; no tolerance, filtering, or comparator relaxation was introduced. A complete remaining-diff list cannot be supplied without the stopped stages. No remaining difference has been certified as a new filing or new price.

## Root cause of the named memo differences

The live release preserved pre-completion memo observations even though richer input data was already cached. These are not new filings/prices after the live release:

| Observation | Live | Backfill/cache basis | Trace |
|---|---:|---:|---|
| ITOCHU Q4 FY2023 investment ratio | 0 | 0.3892926497205674 | Same owner earnings 757,502,100,827.413 and zero growth capex; backfill adds cash acquisitions 294,890,000,000 from cached Yahoo `annualNetBusinessPurchaseAndSale` |
| ITOCHU FY2023 dividends | 0 | JPY188,372,000,000 | EDINET normalized row defaults to zero with `absent-in-complete-statement`; Yahoo `annualCashDividendsPaid` and the verified secondary-listing cache contain the positive total |
| Mitsui Q4 FY2024 investment ratio | 0 | 0.2624870764044989 | Same owner earnings 988,502,000,000 and zero growth capex; backfill adds Yahoo cash acquisitions 259,469,000,000. Original EDINET acquisitions were marked a goodwill/intangible proxy and excluded |
| Sompo FY2025/FY2026 buybacks | 0 / 0 in live memo cells | JPY186,125,000,000 / JPY229,290,000,000 | Completed Yahoo repurchases differ from the memo's original missing-field defaults |

Relevant sources: `fundamentals/<id>.json`, `raw/edinet/issuers/<id>.json`, `completeness/yahoo/<id>.json`, `completeness/verified/<id>.json`, `business-backfill/memos/<id>.json`, and `published-memos/<id>.json`. Yahoo/verified caches for the two trading-house examples predate the October 2 live memo; the live memo is timestamped 06:52 and the differing backfill about 09:11. Copying live zeros into the pipeline would mask this input discrepancy, not resolve it. A release decision must reconcile these older-source corrections explicitly; they do not qualify for the user's new-source-only allowance.

## Recommendation and remaining work

**KEEP HOLD.** The normal pipeline has a tested shared memo-input basis, and the named split pass results survive a real analysis, but exact financial/memo equality is not proven and known old-source differences remain. After disk capacity permits: finish the full replay, run business-backfill and isolated publication, execute the unmodified exact-diff gate, and adjudicate every residual against source arrival evidence. If the historical live source snapshot cannot be recovered, state that conflict rather than treating already-cached corrections as new filings.

The live `publish-repo` and `publish.hold` were not written or removed. The runner was not changed or advanced. Evidence: `nightly-2-evidence.json` beside this report; staging contains logs, resource monitor results, request metadata, tests and the five-company comparison. The requested report is copied to the `value` worktree; the commit is only in `value-zp-nightly`.
