# Nightly 2 — KEEP HOLD; October 3 resume stopped at disk floor

Resumed from `7270b27` on 3 October 2026 at 10:51 UTC in `value-zp-nightly`. Starting live baseline was `ec02595c`. An external price writer advanced live to `bb039ca1` during this run (details below). **Full replay and equality verification are still incomplete. KEEP HOLD.** This section supersedes the completion status below; the October 2 findings remain relevant.

## Mandatory stop and execution evidence

At **11:09:52 UTC**, the watchdog observed **6,125,563,904 bytes free (5.70 GiB)** and terminated the analyzer. This crossed the conservative 6 GiB guard used in the previous checkpoint. No replay, backfill, publication, or additional test run was started after that stop. Only checkpoint evidence, this report, and the requested commit were prepared.

- Started with approximately 7.8 GiB free. Removed obsolete intermediate staging trees before running, then pruned completed nonmember outputs as disk pressure increased. All 2,716 current index-member/live-dossier IDs were protected from pruning.
- Ran the **unfiltered** normal pipeline-23 analyze with two workers, `VALUE_NO_EODHD=1`, cached source inputs, and Jev enabled. Observed **24,671 newly written analysis records**, plus five retained from October 2. This is a count of records observed, **not a successful stage completion**. There is no normal completion summary.
- Retained 1,967 private analysis records, including the five earlier records. Pruned 22,709 completed nonmember outputs after recording IDs, timestamps, pipeline versions, fingerprints, and SHA-256 hashes in `nonmember-analysis-manifest.jsonl`. Their regeneration will be required for a later complete replay.
- Logged **1,611 Jev requests** dispatched by the normal analyzer. **Zero EODHD requests**. The network preload blocked 34 attempted Yahoo requests before transmission. No fresh filing, quote, or yield was fetched by this task.
- Peak sampled private staging allocation was **800,677,888 bytes (0.746 GiB)**; the final sample was **347,152,384 bytes (0.323 GiB)**. Pruning kept this task below the 2 GB budget. Filesystem free space fell much farther than this task's private allocation explains; no claim is made about which external job consumed it.
- The first Python monitor exited on a vanished atomic temporary file. A replacement watchdog attached to the still-running analyzer. The Node write/request guard remained installed; at the eventual floor its stop logger recursed and emitted `Maximum call stack size exceeded`. The replacement watchdog terminated the process. **Repair that diagnostic logger before another resume.** The original analyzer's process exit code was not recoverable after its parent monitor exited; the attached watchdog records the disk stop explicitly.

## Additional pipeline fixes

Two failures were reproduced with tests before changing code:

1. `esefShareInputs` discarded valid cached share observations merely because their date was older than today, attempted a Yahoo refresh during the cache-only replay, and overwrote the staging cache with an error. Under `VALUE_NO_EODHD=1`, it now reuses cached observations (or the existing verified market-cap input), performs the normal share-basis validation, returns missing when no cached input exists, and preserves the original cache bytes/date.
2. `bondObservation` ignored cached null yields in offline mode, rebuilding an unavailable observation with today's date and different flags. It now preserves valid-version cached null observations as well as plausible cached numeric yields.

The new tests first failed on the lost share count and changed bond date/flags, then passed. Fresh final verification: **7 files, 125 tests passed** (`analyze`, `memo-inputs`, `publish`, `split-scope`, `price-history-splits`, `esef-share-fallback`, `bond-fallback`). No web build or dependency installation.

**The running analyzer had already imported the old helper implementations.** Its partial results therefore do not constitute an end-to-end verification of these two fixes. Before resuming, restore the staging ESEF-share/bond cache files that the old run replaced from their unchanged originals, invalidate affected analysis fingerprints, and rerun analysis. No production cache was changed.

## Diff and source-arrival table

| Check | October 3 result | Decision |
|---|---|---|
| Full unfiltered analyze | 24,671 fresh records observed; interrupted before completion | Incomplete |
| Business-backfill | Not run | Unverified |
| `publish --out` | Not run | No post-analysis output |
| Full exact-diff guard against live | Not run | No residual diff count or passing claim |
| Source inventory | 26,801 source files hashed across all 2,708 live dossiers | Evidence retained |
| Inventoried source files modified after live release at 2026-10-02 14:15:50 UTC | 0 | No newly arrived source established from this inventory |
| Effective report metadata versus live | 354 differences, including older/missing report selections | Requires reconciliation; not certified as new filings |
| Local quote seeds versus live | 2,290 differences; 270 have later dates | Not accepted price changes: normal publication retains existing real closes; no final publication comparison available |
| Toyota/Sompo split outcomes, ITOCHU/Mitsui old-cache differences | Earlier five-company evidence below remains the only completed comparison | Still not an exact publication pass |
| 742-company memo drift / 834 answer changes / 3 removed Q2 lines from check 1 | Not remeasured after full analysis | Unresolved release gate |

No remaining change has been approved as a new filing or new price. Source hashes and timestamps establish the available cache, not a reconstructed historical input snapshot. The exact comparison script prepared in staging has no ignored paths or numeric tolerance, but **it was not executed against a post-analysis publication because no such publication exists**. An exhaustive final diff table cannot honestly be supplied at this stop.

## Recommendation and next resume

**KEEP HOLD.** Do not interpret the required commit title as a successful equality result. The original mismatch between frozen live observations and richer, already-cached inputs remains unresolved. Do not silently accept those old-source corrections as new arrivals or copy live zeros into completed statements to make the comparator pass.

Next resume requires disk headroom that remains available through analysis and local publication. Repair the diagnostic stop logger; restore the affected overlay cache observations; finish full cache-only analysis using the new helper code; run business-backfill against cached source text (normal 100-company research budget, Jev allowed); publish only into staging; execute the full exact gate and the existing split-scope audit; adjudicate every residual. Pruned nonmember outputs must be regenerated if claiming a complete full-analysis artifact.

This task did not write `publish-repo`, `publish.hold`, or the runner. Final read-only checks found external changes: live is now **`bb039ca19cd5947dccc9da0859f30217e965920f`**, commit **`prices 2026-10-03` at 11:04:59 UTC**, and the runner checkout advanced from `3e5e49a` to **`cc8d76c`**. The live repository is clean and the hold still exists. The source inventory and quote-candidate counts above were captured before that price commit. A future replay must explicitly record/freeze its comparison baseline; the assumption that all other jobs were paused did not hold throughout this run. No UI files, subagents, push, deployment, or remote publication by this task. Staging evidence is in `.fix5c/nightly-2`; committed `nightly-2-evidence.json` contains both checkpoints. The requested report and evidence copies are also written to the `value` worktree.

---

## October 2 checkpoint (retained detail)


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
