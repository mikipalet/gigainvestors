# Nightly 2 — full replay measured; KEEP HOLD

Completed the October 3 resume in isolated worktree `value-zp-nightly`, starting from `9f56d93`. **KEEP HOLD. The normal pipeline does not reproduce live releases on unchanged inputs.** Analyze coverage, the normal business-backfill batch, local publication, and exact comparisons are now complete; this supersedes the earlier disk-stop checkpoints. The required commit title is a task label, not an equality claim.

The starting live baseline was `bb039ca1` (today’s price update, following `ec02595c`). Another job published `634f80f3` at **12:10:37 UTC** during this replay. The primary comparison is against that current live release; a second comparison against the starting baseline separates its external history/price changes from the original nightly mismatch.

## Execution and changes

- Kept **PIPELINE_VERSION 23** and ran the unfiltered analyzer against the isolated corpus. Its completed pass reported **3,946 written, 34,109 unchanged, one failed**, covering all **38,056 jobs**. The failure was a transient `1775.JP` Jev timeout. A targeted retry wrote it successfully; a final normal analyzer check of `1775.JP,CIB.US` reported **0 written, 2 unchanged, 0 failed**. `CIB.US` had failed in an earlier interrupted attempt and recovered in the full pass. Coverage verification found **38,056 pipeline-23 analyses, zero missing analyses/fingerprints, and zero missing or stale member memo snapshots**. This is completed coverage with recovered retries, not a claim that the unfiltered process itself exited zero.
- Ran normal **business-backfill**, with the normal **100-company** research limit and cached source text: exit 0, **100 processed / 100 texts read**, five companies producing risk-answer proposals. Normal queue work remains (2,698 companies not marked complete); no all-research-complete claim is made.
- Ran **publish --out** into `.fix5c/nightly-2/after-publish`: exit 0, 2,714 selected analyses, **2,706 emitted dossiers**. No commit, push, or revalidation was performed by publication.
- The previous commits’ shared analysis/memo statement basis is exercised end to end: final split-normalized rows remain in member `analysis/inputs/<id>.json`, and computed memo lines remain in `analysis/<id>.json`. Toyota management and Sompo economics/management remain **pass** in the final publication.
- Fixed analyzer memory retention: statements load per worker instead of retaining the whole universe. Measured process RSS fell from several GiB in the initial attempt to roughly 0.6 GiB during the finishing run.
- Preserved unchanged **nonmember evidence-input caches** across execution-clock changes. The cache’s sections, reporting currency and derived values must match exactly; published member snapshots still bind to the exact analysis timestamp. Relinking 20,085 equivalent nonmember cache files reclaimed **319,889,408 bytes**. No analysis record was removed.
- Fixed **publish --out** to carry existing immutable forward-history records, matching the normal publisher. A regression test first reproduced the missing history before this change.
- Fresh targeted verification: **7 files, 127 tests passed**. New regressions failed before the memory/cache and staging-history fixes. Quote-guard fixtures also reject tiny financial changes, changed company identities, historical decisions, and valuation exceptions.

Jev remained enabled; this resume logged **4,777 dispatched Jev requests**, including failed attempts/retries. **Zero EODHD requests** and zero requests to other hosts were dispatched by this replay. `VALUE_NO_EODHD=1` used the cached FX/yield/share observations. No new filing/quote fetch was substituted into the replay by this task.

## Exact diff table

Every numeric comparison is exact; there is no tolerance. The quote counterfactual fixes the live financial model and varies quotes. The historical-price exceptions admit only exact dated return/date changes independently observed between the two live releases, with company identity protected. Other financial/memo changes stay in the gate.

| Check | Result | Assessment |
|---|---:|---|
| Current live `634f80f3` → staged output, all JSON-path differences | 1,127,372 | Raw count includes metadata and array-position shifts |
| Proved price-driven differences excluded and separately listed | **107,906** | 2,887 memo/price-model fields; 105,019 dated historical return/date fields |
| **Remaining exact differences against current live** | **1,019,466** | **FAIL** |
| Starting live `bb039ca1` → stage, after 3,212 price exclusions | **951,176** | **FAIL independently of the intervening live release** |
| Protected non-share scope audit | **67,377 differences / 2,306 companies** | 215,606 protected comparisons; FAIL |
| Dossier population | **2,708 → 2,706** | Removed `BCP.LS`, `LULU.US`; no additions |
| Quality-test flips | **153 across 109 companies** | 105 flips in the unchanged inventoried financial/report-source cohort; 48 in the refreshed-cache cohort |
| Price-test result flips | **129** | Not cleared by quote-only reproduction; remain in the gate |
| Existing memo answer changes | **2,529 raw; 1,213 quote-only; 1,316 not cleared** | Not approved as source arrivals |
| Memo chart / capital-allocation changes | **1,524 / 968** | Raw memo-object counts |
| Added / removed memo lines | **84 / 4** | Removed Q2 lines: `4DX.AU`, `601618.SHG`, `IAG.AU`, `PDI.AU` |
| Original check-1 Q2 removals | `TRMB.US` and `WSE.US` now retained; `4DX.AU` still removed | Gate remains failed |

The one-million-path count is not a count of independent economic changes: dropping companies shifts array positions in indexes/history/search/views. The protected scope audit and quality flips establish the substantive non-price failure without relying on those positional effects.

`BCP.LS` becomes undecided on tangible common book/dividend history and parent/common-equity proxies. `LULU.US` becomes undecided on the $1/per-share test, Sloan accruals and operating-cash-flow coverage. Both had refreshed vendor caches, but a refresh timestamp does not establish a new filing or justify their disappearance.

## Source and cause adjudication

**3,525 inventoried files across 1,179 companies** changed between the earlier October 3 inventory and the frozen replay inputs: 1,179 fundamentals, 1,162 company records, 1,178 EODHD records and six SEC fact caches. No report-text/metadata change was observed in that inventory. **No new filing has been proved or blanket-approved.** All **26,801 inventoried published-company inputs** then remained hash-identical through the completed replay.

The five named Japanese companies have no arrivals in that source inventory. Their final quality results match live, but their old-source numerical differences remain:

| Company / observation | Live → normal output | Cause / decision |
|---|---|---|
| Toyota `7203.JP` | Management stays pass; 66 test-field and 98 series-leaf differences | Normal completed/split-normalized recomputation versus frozen release inputs; not a new arrival |
| Sompo `8630.JP` | Economics/management stay pass; retained-share metrics still differ | Completed cached buybacks versus the release’s retained-share inputs; not a new arrival |
| ITOCHU `8001.JP`, Q4 FY2023 | **0 → 0.3892926497205674** reinvestment; dividends **0 → JPY188,372,000,000** | Cached Yahoo cash acquisitions/dividends complete EDINET missing-field defaults; caches predate the release |
| Mitsui `8031.JP`, Q4 FY2024 | **0 → 0.2624870764044989** reinvestment | Cached Yahoo acquisitions replace the excluded EDINET goodwill/intangible proxy; not newly arrived data |
| Mitsubishi `8058.JP` | Quality results unchanged; total-ROIC and memo differences remain | Completed statement basis versus frozen release observations |

The per-company/path records assign known causes and explicitly mark unproven attribution **UNEXPLAINED**. Of the residual dossier paths, **143,002** belong to the unchanged inventoried-source cohort and **94,101** to the refreshed-cache cohort. A cache arrival does not automatically explain every output field for that company. Copying live zeros into the source rows or weakening the guard would not resolve this discrepancy.

The intervening `634f80f3` release changed history returns/date metadata, views, metadata and 11 quote files while leaving all 2,708 dossiers/memos unchanged. Its exact differences are retained separately. Matching price-only effects were excluded; remaining external-release reversions are labelled explicitly rather than attributed to new filings. Staged direct quote files match the current live quote files.

## Evidence and resource limits

Committed beside this report:

- `nightly-2-diff-table.csv`: complete per-company summary and source-arrival/cause labels.
- `nightly-2-residuals.jsonl.gz`: **all 1,019,466 residual paths**, before/after values, causes and unproved-attribution labels.
- `nightly-2-price-diffs.jsonl.gz`: all **107,906 excluded price-driven paths** and reasons.
- `nightly-2-scope.json.gz`: complete protected financial/memo audit.
- `nightly-2-final-evidence.json`: stage exits, recovery evidence, both exact summaries, all test flips, focused comparisons, source integrity and resource evidence.
- `nightly-2-source-inventory.json.gz` and `nightly-2-source-arrivals.json.gz`: source hashes and observed arrivals.

Reproduction tools are `scripts/value/nightly-exact-diff.py`, `nightly-price-expectations.ts`, and `nightly-price-history-expectations.py`. Full staging, logs and both live snapshots remain under `.fix5c/nightly-2`. Nonmember report **input snapshots** were pruned only after complete analysis coverage, freeing 144,207,872 bytes; original corpus sources and every analysis output remain. Restore those source hardlinks before another unfiltered replay of this overlay.

The stop floor was **4 GiB**. It was never reached. Two early analyzer attempts received SIGTERM without a disk stop; their sender was not established. A later old watchdog stopped at its conservative total-private-file cap, with 12.48 GB free. It was superseded by accounting for **new** allocation, including directory blocks and the **347,152,384 bytes retained from the prior checkpoint**. Measured new allocation before commit is **1,902,671,872 bytes**; including a conservative git-object allowance it is **1,934,557,760 bytes**, below the 2 GB budget. Free space at that check was **11,471,552,512 bytes**. Full accounting is recorded in the evidence. Unchanged files use hardlinks and writes break links/replace atomically. An external in-place change to the starting snapshot’s `meta.json` was detected and restored from the exact `bb039ca1` git blob; all 5,083 starting-baseline file hashes then matched again. The current comparison snapshot matches clean live `634f80f3` byte for byte.

No subagents, web builds, dependency installation, UI changes, API keys printed, pushes, deployment or remote publication. This task did not write `publish-repo` or `publish.hold`, or change the runner (`cc8d76c`). The hold still exists.

## Recommendation

**KEEP HOLD.** The full replay is now measured, and the named split pass outcomes survive, but the required zero-unexplained-difference condition is not met. Reconcile the released financial/memo basis with the completed cached statements, investigate the 105 unchanged-source quality flips and four Q2 removals, and resolve the two dropped dossiers. A later release gate must pass the same exact financial/memo checks; price exclusions do not authorize these older-source changes.
