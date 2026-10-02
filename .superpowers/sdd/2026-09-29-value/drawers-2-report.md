# Drawer density round 2 — disk-stop checkpoint

Updated 2026-10-02. Worktree: `value-zi-drawers`; base: `dc5dd86`.

## Acceptance: FAIL / incomplete

The requested zero-failure release gate was not achieved. This is an unfinished checkpoint, not a release-approved change. No push, deployment, remote publication, or subagents.

The production-build guard stopped work when free space reached **6,422,286,336 bytes (5.98 GiB)**, below the required 6 GiB floor. Build process group terminated with exit 143 during static generation (last logged progress: 6,164 / 8,219 pages). Compilation and the build's TypeScript phase passed before termination. The incomplete `.next` output (1.63 GiB) was removed as cleanup; work was not resumed after the stop. Free space after cleanup: approximately 7.61 GiB.

Peak retained task artifacts measured approximately 1.66 GiB (`.next` plus screenshots), below the 3 GB new-disk budget. No new dependency installation or corpus copy. Builds wrote only to `.next`; the existing business-3 staging store was read in place.

## Implemented in this checkpoint

- Method drawer: published All/Western analysis, quality and buy-zone funnel; current five-test results for reference companies with published dossiers; dated Berkshire purchase-check snapshot; versioned changelog; source register; condensed rule and time-travel explanations.
- Berkshire counts explicitly describe the **30 September research snapshot**, sourced from committed `docs/reports/buffett-1-report.md`. They are not a rerun of method 3.2.0. Universe is the shared published universe; a separate Western-universe count was not fabricated.
- Investors: main-site quarterly holdings supply weight, shares, USD value, first observed quarter, and latest actual change, sorted by weight. Added quarter-by-quarter weight history. A holding absent from the latest investor quarter is not shown as a current numeric position. First held means first observed in the tracked history.
- Business drawer: render existing memo answers directly instead of reserving empty topic columns; provide source quotes on pointer hover and click; use the existing gross-margin series for the inflation answer when it has no chart; annual tables include prior-year changes on applicable desktop layouts.
- Filters: denser country/sector grids retaining counts and existing controls. Evidence and search: responsive sizing and annual comparative values.
- No memo-generation, stored memo-content, valuation, judgment, or release-gate changes. Existing short-list business context and sparklines were retained.

## Visual gate evidence

The unchanged gate was run repeatedly against the local development server. All recorded drawer states still failed density; pages passed. These runs are **not a final gate on a complete production build**.

| Run | Viewports | States | Failed |
| --- | --- | ---: | ---: |
| baseline | 1728×970, Adobe | 12 | 11 |
| iteration | 1728×970, Adobe | 12 | 11 |
| iteration2 | 1728×970, 2056×1180, Adobe | 24 | 22 |
| iteration3 | all four requested sizes, Adobe | 48 | 44 |
| iteration4 | three desktop sizes, Adobe | 36 | 33 |

Method empty raster area: baseline 39.0% at 1728; latest captured 31.0% at 1728, 29.6% at 2056, 34.6% at 1440. Phone iteration3: 41.1%. All exceed the unchanged 15% gate and stricter design contract.

Screenshots and JSON reports: `/tmp/claude-1000/value-shots/drawers-2/`, with subdirectories named above. Three captures were viewed at native resolution during iteration: `iteration/1728x970-_adbe_us-3-Open_Predictable_profits_evidence.png`, `iteration2/1728x970-_adbe_us-9-Method.png`, and `iteration2/1728x970-_adbe_us-2-In_depth__.png`. Their inspection exposed whitespace and clipping. The complete requested drawer/corpus screenshot set and exhaustive image review were **not completed**. Final CSS adjustments after iteration4 have not received visual acceptance.

## Verification performed

- Full Vitest before final holdings helper: **155 files, 1,709 passed, 1 skipped**. Log: `/tmp/drawers-2-vitest.log`.
- New holdings regression tests: **3 passed**, covering unsorted quarters, last actual change, exited positions and zero-weight quarters. Log: `/tmp/drawers-2-holder-tests.log`.
- Earlier standalone `tsc --noEmit --incremental false` and Knip passed. Later standalone tsc caught optional-series access; it was corrected, and the production build's complete TypeScript phase then passed. Latest standalone tsc log contains that earlier error and must not be cited as a final pass.
- Production webpack compilation **passed**, TypeScript **passed**; full build **stopped**, not passed. Log: `/tmp/drawers-2-build.log`. Stop marker: `/tmp/drawers-2-disk-stop`.
- Release gate uses Playwright and ran as above; the separately requested Playwright test suite was **not run** before the disk stop. Knip was not repeated after the final helper addition.
- `git diff --check` passed before the disk stop.

## Required before acceptance

1. Resolve the remaining density failures without filler or smaller type; remove any clipping/overlaps across sparse and rich companies. Consolidate the iterative density CSS after the layout is settled.
2. Complete the seven-question evidence-chart layout, including supplied reinvestment/ROIIC, buybacks-versus-value, and implied-versus-actual-growth evidence. This checkpoint only renders existing charts plus the inflation series; it does not supply all requested comparisons. Memo-content work remains owned by the other job.
3. Check current-holder identity matches for alternate listings/share classes and sparse cases; missing matches remain without invented numbers.
4. Finish a production build with enough disk headroom, then run standalone tsc, full Vitest, Playwright and Knip against the final code.
5. Run all 480 release states at the four viewports until zero failures, capture every drawer at both owner sizes, and inspect every capture.

Checkpoint commit intentionally uses `value: dense drawers (disk-stop checkpoint)`, not the requested successful-gate title, because the gate did not pass.
