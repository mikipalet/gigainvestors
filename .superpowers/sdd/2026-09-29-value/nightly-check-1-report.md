# Nightly check 1 — blocked, not verified

Checked 2 October 2026, starting 14:17 UTC, in isolated worktree `value-zk-fix5` at `66ae64f`. Live data baseline: `ec02595c`, 2,708 published dossiers. The next relevant deadline is **3 October 2026 at 02:00 UTC**, before the 03:00 runner.

**Decision: do not regard tonight’s re-analysis as verified.** The full normal analyze stage reached a paid Jev request and was terminated before transmission, honoring: “if a stage would spend paid budget, stop and report.” No paid request was sent. No fix, version rollback, or runner preservation mode was installed after that stop. **The `value-daily` runner remains at `66ae64f`, with pipeline 23, and remains exposed to the failures below.** This is an explicit blocked checkpoint, not a safety approval. The requested commit message does not imply that the full replay passed.

## Isolation and execution

Staging root: `/Users/miki/GitHub/superinvestors-wt/value-zk-fix5/.fix5c/nightly-check-1`.

The staging corpus uses hardlinks for the existing `analysis`, `bonds`, `jev`, and `raw/esef/shares` files. Their production writers use temporary files and atomic rename, so replacements become private to staging. Other inputs use read-only symlinks. A preload guard refuses mutation through a directory symlink outside staging and blocks every `fetch` before transmission. `VALUE_CORPUS_DIR` points at staging. `VALUE_NO_EODHD=1` enables existing cached FX/yield behavior and prevents EODHD calls. `TSX_DISABLE_CACHE=1` avoids external transpiler-cache writes. No live corpus file or `publish-repo` file was written. The first publication attempt stopped at an external transpiler-cache write; the guarded retry disabled that cache.

1. Ran the real `publish --out=<staging>/before-analyze` stage against existing cached analyses, before re-analysis. It completed successfully, reporting 2,714 selected analyses and producing 2,708 dossiers.
2. Ran `scripts/value/fix-5-scope-audit.ts` against live and this baseline. It exited 1: protected memo differences exist.
3. Ran the real, unfiltered `analyze` stage with two workers, retaining the normal pipeline-23 invalidation logic. No fake Jev answers or substituted calculations were supplied. It wrote 49 staging analyses, then attempted `api.typesafe.ai/v1/systemone`. The preload guard exited 86 before any request was transmitted. There is no successful full-analysis summary and **no post-analysis publication**. The paid call’s company and whether it was question scoring or evidence extraction were not captured; no claim is made about them.

The 49 partial analyses are diagnostic artifacts, not a publishable result. The normal stage cannot finish from the available cache under this run’s no-spend constraint. Cached analysis versions also span 16–22 (35,421 at 16; 1,717 at 19; 912 at 20; 98 at 22; one at 18; four at 21). Merely changing the version constant to 22 would not guarantee every company skips re-analysis.

## Diff table

These are **publish-only baseline versus live** results over all 2,708 dossiers. Full nightly output could not be measured because analyze stopped.

| Guard / payload | Baseline differences | Assessment |
|---|---:|---|
| Dossier additions / removals | 0 / 0 | Same published population |
| Protected financial series, test metrics/raw metrics, valuation and basis metadata | 0 | Existing cached analyses preserve these protected fields before replay |
| Protected non-per-share memo chart payloads | 953 | Fail |
| Protected memo capital-allocation payloads | 712 | Fail |
| **All protected differences** | **1,665 across 742 companies** | **Fail; 215,606 protected comparisons** |
| Quality-test result flips | 3 across 2 companies | Reverses released split corrections; fail |
| Changed existing memo answer strings | 834 | Not individually justified; cannot certify memo preservation |
| Added / removed memo lines | 81 / 3 | Removals include published Q2 answers |
| All changed memo-line objects | 5,657 | Includes charts, evidence and other line metadata |
| Quarterly history frames | 0 / 87 | All 87 byte-identical |
| Global and western quarter summaries | 0 | Exact equality |
| All history JSON files | 2 / 111 | `2026.json` and `companies.json` differ |
| Full pipeline-23 analyze + publish | Not available | Stopped at paid cache miss |

The non-per-share audit intentionally permits split-dependent per-share metrics and does not check test outcomes or full memo prose. The additional checks above catch those gaps. The machine-readable sidecar contains the complete 1,665-entry per-company/path diff table and all result flips.

| Company / test | Live → baseline publish | Cause |
|---|---|---|
| Toyota `7203.JP`, management | pass → fail | Normal publish consumes the cached pre-release analysis, losing the release-script split correction |
| Sompo `8630.JP`, economics | pass → fail | Same: the released split-adjusted book/dividend compounding is not in the cached analysis consumed by normal publish |
| Sompo `8630.JP`, management | pass → fail | Same: cached dilution/retention result reverts the released split correction |

Removed memo lines: `4DX.AU` Q2, `TRMB.US` Q2, `WSE.US` Q2. These and the 834 changed existing answers are not accepted as justified research updates in this check.

## Cause and remaining work

The specialized fix-5 release script starts from live dossiers and applies narrowly bounded per-share changes. Normal publication instead starts from `analysis/<id>.json`, merges current backfill and published memo fallbacks, recomputes selected numerical content, and applies publication consistency filters. Consequently, successful release-script verification did not establish nightly preservation. The three known split-correction reversions already occur without re-analysis.

Memo drift also already exists before analyze. For example, ITOCHU’s Q4 chart changes FY2023 from zero to 0.3892926497205674, and its capital-allocation dividend total changes from zero to JPY188,372,000,000. Mitsui Q4 FY2024 reinvestment changes from zero to 0.2624870764044989. The normal publisher uses current memo/source material while the release script preserves the live memo observations. These examples establish the publication-path mismatch; all 742 affected companies have not been individually adjudicated.

Mitsubishi has zero protected baseline differences. This does **not** prove the full pipeline-23 replay preserves its margins: the paid stop prevented completing that check. The existing deriveYears regression remains distinct from full-nightly verification.

No production code was changed, so no new regression test or code-fix success is claimed. The known failures need a preservation fix with regression coverage and a complete cache-only replay, or an explicit runner containment decision, before the next run. **No containment has been applied by this task.** The user’s immediate paid-budget stop takes precedence over continuing to the later 02:00 fallback deadline.

## Resource and verification evidence

- No subagents, dependency installation, web builds, pushes, deployment, or remote publication.
- No API keys printed; network diagnostics contain only hostname/path.
- Monitored peak new private file blocks: 165,347,328 bytes (about 158 MiB), plus staging directory metadata and small evidence files; comfortably below 1.5 GB.
- Disk began at 8.5 GB free and finished around 8.3 GB; the 6 GB floor was not reached.
- `value-daily` remains clean at `66ae64f`; live `publish-repo` remains clean at `ec02595c`.
- Evidence retained under staging: `before-scope.json`, `before-preservation.json`, `stop-summary.json`, `run-result.json`, `before-publish.log`, `analyze.log`, `stops.jsonl`, `offline.cjs`, `run-monitored.py`.
- Committed evidence: `nightly-check-1-evidence.json` beside this report. The requested report path in the `value` worktree receives an identical copy; the commit is made only in `value-zk-fix5`.
