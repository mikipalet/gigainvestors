# Story 2c — disk-stop checkpoint, not release-ready

Stopped on 2026-10-03 at approximately 11:28 UTC. The news worker logged **DISK STOP: below configured free-space floor**; a concurrent `df -h .` showed **3.7 GiB free**, below the newly authorized 4 GiB floor. Outstanding news and selection workers were explicitly terminated. Free space subsequently recovered to about 14.8 GiB during reporting, but the observed stop condition was honored. No source or selection work resumed after the crossing.

No subagents, push, deployment, remote publication, text-generation model calls, API-key output or build. News remains gzip-compressed. Shared chrome and all UI components are byte-identical to the resume base `f3dbb81` (and unchanged in this run).

## News collection and budget

| Measure | Result |
|---|---:|
| Published universe | 2,708 |
| News caches checked today | 1,315 / 2,708 (48.6%) |
| Added since story-2b | 611 |
| Caches with articles | 1,181 |
| Retained title/first-paragraph rows | 490,827 |
| Ranges exhausted by a short response | 1,058 |
| Caches still requiring pagination | 257 |
| Cumulative reserved requests | 1,418 / 4,000 |
| Cumulative reserved EODHD calls | 7,090 / 20,000 |
| Calls reserved in this resume | 3,315 |
| Remaining call allowance | 12,910 |

The existing dated budget ledger was preserved, never reset. Interrupted and failed requests remain charged. Fetches continued Buy now, Next closest, index members, then the rest; first-page coverage precedes pagination. The cumulative error cache has 28 HTTP 404 and 3 HTTP 500 records; these are attempt records, not necessarily still-missing companies. No retries were enabled. Cache presence does not establish complete 18-month coverage.

Durable state is under `~/value-corpus/price-story/`: `news/*.json.gz`, `news-budget-2026-10-03-story-2b.json`, `news-priority-story-2b.json`, and per-company error records. The budget cap also remains subject to the shared provider budget used by nightly work.

## Calibration and fixes

**The >=90% price-driver and risk-heading calibration targets remain unmet.** No fresh score is claimed and neither publication trust gate was opened. No score threshold was lowered; abstentions receive no correctness credit.

The forty-company rerun started with cached news and the prior selection version. Only Toyota and Close Brothers completed, both without a selected price, risk or pricing source; Close Brothers still lacked a news cache when processed. The run was terminated before changing selection behavior. These two records are not final-code calibration.

Three defects were reproduced with failing regression tests, then fixed:

- Risk extraction could continue from Item 1A into Item 1C cybersecurity content. It now stops at Item 1C as well as Item 1B/2; lowercase body fragments are rejected.
- Toyota's retained Japanese annual filing contains numbered business-risk headings, but the extractor did not recognize their layout. Circled-number headings now retain exact text and offsets, with their supporting paragraphs as context. No translation or generated prose is introduced.
- Within a single choice batch, one candidate failing the score gate discarded all remaining candidates. The selector now asks Jev to choose from the remaining eligible sources while keeping the same 1.7/2 score gate.

Selection version is now `literal-4`, invalidating prior readings and grades for publication. Literal first-clause trimming from story-2b is retained unchanged. The final-code forty-company rerun, manual label review, and grading have **not run**.

The patch and its test command were applied in the same tool batch that returned the disk-stop observation. The already-started selected-source suite completed **19/19 passing**. No further fetch, model pass, build or broader verification was started after the stop was observed.

## Coverage, examples and screenshots

No local publication was regenerated, so this run produces no new published coverage measurements, thirty-line samples or eight-company screenshots. The previous report's snapshot counts were 2,708 computed price lines, 590 computed Q3 lines, six literal Q3 lines, zero quoted price lines and zero Q6 lines; those are historical figures, not reverified results for `literal-4`.

ADBE, NVDA, KO, LULU, GOOGL, 7203.JP, JPM and CBG still require final-code selected lines and drawer captures at 1728×970 and 2056×1180. The old `.story-2/` screenshot/snapshot directory referenced by earlier reports is absent in this worktree at this resume; its existence must not be assumed. No screenshot was fabricated or substituted.

Partial two-company selection rejection counts from this resume:

| Type | Reason | Count |
|---|---|---:|
| price | long-or-broken-excerpt | 5 |
| price | no-supported-choice | 1 |
| risk | generic-risk | 3 |
| risk | no-supported-choice | 1 |
| pricing | score-below-gate | 1 |

These counts precede the final fixes and are not a universe-wide rejection histogram.

## Verification, disk and scope

- Three new regressions failed before their fixes; the complete selected-source suite then passed **19 tests**, including literal attribution, clause boundaries, bounded choice/score calls, publication version gating, tournament fallback and Japanese offsets.
- `git diff --check` passed; the full changed-code diff was reviewed.
- No new TypeScript check, whole-store consistency audit, browser consistency run or four-viewport release gate completed. **Zero cut/overlap failures are not established.** Accepted fixed-width whitespace exceptions do not stand in for those checks.
- No UI files changed; SidePanel.tsx, side-panel.css, search, bottom bar, time slider and filters remain byte-identical to the resume base.
- Final measured task allocation increase before report/commit: **12,361,728 bytes**, below 1.5 GB. The guard ceiling was 1.4 GB, reserving report/commit headroom. No build output was created. The host's free-space fall was much larger than this task's allocation increase.
- Temporary failing-test output was deleted. Compressed news, the durable budget ledger and small checkpoint/test logs are retained. No files belonging to other jobs were deleted.

## Every changed file

- `lib/value/price-story/selection.ts` — Fix risk-section boundaries/Japanese heading extraction and retry remaining candidates after scoring rejection; bump the selection version.
- `tests/unit/value/selected-sources.test.ts` — Add three regression cases and update publication fixtures to the new version.
- `.superpowers/sdd/2026-09-29-value/story-2c-report.md` — Record this disk-stop checkpoint, measured fetch progress and unmet acceptance gates.
- `/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/story-2c-report.md` — Identical report at the owner's requested sibling location; no application code there was touched.

## Resume state

Continue the **same** 1,418-request budget ledger; do not reset it. Finish collection and bounded pagination, then rerun all forty with final code and `--force --cached-news`, hand-review candidate-hash-bound labels and measure both >=90% gates. Only after passing should publication consume selected price/risk records. Then regenerate the local snapshot through the normal publisher, samples, screenshots, consistency audit and release gate at all four viewports. Builds, if authorized by available disk, must remain in `.next`. No push/deploy/remote publish is authorized.
