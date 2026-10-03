# Since then — since-2b checkpoint

**Status: partial; disk stop honored; not release-ready.** Resumed from `b3383d3` in the existing `value-zn-since` worktree. No subagents, push, deployment, remote publication, or secret output. The requested merge of `origin/master` at `2713930` remains present through `42f42b5`; it was verified, not repeated.

## Disk stop

Both the screenshot runner and release gate threw `DISK STOP` with the run configured at **4 GiB** (4 × 1024³ bytes). The screenshot runner stopped before the phone cases; the gate stopped during the 2011Q4 states at 1728×970. The remaining consistency process and local server were stopped, and no further implementation or verification jobs were started. The exact available byte count at the instant of either exception was not logged. A later `df -k .` showed 4,765,240 KiB free. This was a conservative binary-unit interpretation of the requested 4 GB floor; recovery did not restart work.

Final allocations: `.next` 2,052,560 KiB versus 2,028,192 KiB at resume; isolated store 41,940 KiB versus 60 KiB; return cache 15,788 KiB versus 11,896 KiB; evidence approximately 22,536 KiB before copying small logs. Net new allocation approximately **95 MB**, within the 1.5 GB budget. The production build reused `.next`; no alternate build directory or dependency installation was created.

## GN.CO discrepancy resolved: no price-code correction required

Yahoo's daily chart response omits **2014-06-30**. The previous independent spot-check therefore chose Friday 2014-06-27 at **DKK 154.899994**, while the stored monthly series used **DKK 156.00**. EODHD independently returns the missing Monday 2014-06-30 close at **156.00**, agreeing exactly with the stored Yahoo monthly close. EODHD returns no later splits for this listing in the queried period. Latest close: DKK 105.400002 on 2026-10-02; stored latest: 105.40.

Correct arithmetic: `105.40 / 156.00 - 1 = -32.435897%`. The old `-31.956097%` daily comparison used the wrong trading day because the provider omitted a row. The cached return is correct. Raw Yahoo daily rows, EODHD rows, split response, original comparison and explanation are preserved in [spot-checks.json](since-2b-evidence/spot-checks.json). API credentials are absent. [EODHD's API documentation](https://eodhd.com/financial-apis/api-for-historical-data-and-volumes) distinguishes raw close from split-and-dividend-adjusted close; the check used ordinary close and confirmed no splits.

## Fifteen price checks

Same preselected random sample as since-2, seed `20261003`; no resampling after observing the discrepancy. Fourteen daily Yahoo comparisons are retained from that run on the same UTC day. The fifteenth now uses the independently confirmed EODHD quarter-end close. **All 15 agree within 0.001 percentage point.** These are split-adjusted price returns in listing currency; dividends and annualisation are excluded.

| Company | Quarter | Currency | Start trade | Start close | Latest trade | Latest close | Independent return | Cached return | Independent start source |
|---|---|---|---|---:|---|---:|---:|---:|---|
| CLX.US | 2018Q1 | USD | 2018-03-29 | 133.110001 | 2026-10-02 | 80.410004 | -39.591313% | -39.591316% | Yahoo daily |
| EQNR.OL | 2019Q4 | NOK | 2019-12-30 | 175.500000 | 2026-10-02 | 402.799988 | +129.515663% | +129.515670% | Yahoo daily |
| LUV.US | 2012Q3 | USD | 2012-09-28 | 8.770000 | 2026-10-02 | 42.470001 | +384.264527% | +384.264513% | Yahoo daily |
| 601288.SHG | 2016Q4 | CNY | 2016-12-30 | 3.100000 | 2026-09-30 | 6.970000 | +124.838710% | +124.838717% | Yahoo daily |
| PCAR.US | 2013Q4 | USD | 2013-12-31 | 39.446667 | 2026-10-02 | 109.680000 | +178.046308% | +178.046307% | Yahoo daily |
| PHP.LSE | 2023Q1 | GBp | 2023-03-31 | 101.199997 | 2026-10-02 | 90.349998 | -10.721343% | -10.721341% | Yahoo daily |
| BRG.AU | 2025Q4 | AUD | 2025-12-30 | 29.469999 | 2026-10-02 | 30.040001 | +1.934176% | +1.934173% | Yahoo daily |
| ACA.PA | 2020Q1 | EUR | 2020-03-31 | 6.690000 | 2026-10-02 | 16.885000 | +152.391631% | +152.391627% | Yahoo daily |
| SCA-B.ST | 2016Q2 | SEK | 2016-06-30 | 54.868877 | 2026-10-02 | 119.599998 | +117.974203% | +117.974206% | Yahoo daily |
| 601899.SHG | 2022Q2 | CNY | 2022-06-30 | 9.330000 | 2026-09-30 | 29.790001 | +219.292617% | +219.292607% | Yahoo daily |
| AMBU-B.CO | 2019Q3 | DKK | 2019-09-30 | 113.500000 | 2026-10-02 | 67.349998 | -40.660794% | -40.660793% | Yahoo daily |
| WM.US | 2012Q1 | USD | 2012-03-30 | 34.959999 | 2026-10-02 | 204.449997 | +484.811219% | +484.811228% | Yahoo daily |
| WCN.TO | 2009Q3 | CAD | 2009-09-30 | 19.217722 | 2026-10-02 | 219.250000 | +1040.874036% | +1040.874036% | Yahoo daily |
| VU.PA | 2019Q4 | EUR | 2019-12-31 | 31.700001 | 2026-10-02 | 129.199997 | +307.570958% | +307.570968% | Yahoo daily |
| GN.CO | 2014Q2 | DKK | 2014-06-30 | 156.000000 | 2026-10-02 | 105.400002 | -32.435896% | -32.435897% | EODHD daily; Yahoo daily omits date |

## Completed data work

- Full refresh completed: **2,079 companies**, 580 refreshed this round plus 1,499 cached on 2026-10-03, **zero failures**. [Refresh report](since-2b-evidence/price-refresh.json).
- Regenerated `/tmp/value-since-store/history`, `views`, and `meta.json` from the current published store and fresh return cache. Other store directories remain read-only symlinks. The earlier missing-view-hash inconsistency is resolved. [Regeneration](since-2b-evidence/regeneration.json).
- Independent data audit: **87 quarters, 102,384 source rows; 102,381 non-null returns** independently reproduce latest / quarter close − 1 within stored rounding. All original prediction, valuation and quality fields are unchanged. Both all-market and western `perQuarter` arithmetic means match independent calculations. All **37,502 browser rows** match the existing quality-filtered population, rounded returns, expected returns and outcome dates. [Data audit](since-2b-evidence/data-audit.json), [reproduction script](since-2b-evidence/data-audit.cjs).
- Three retained 2026Q3 rows have no since return: `MLC.IR` latest quote 2026-09-29, `SKO.AU` and `TRA.AU` 2026-09-28. Their quotes precede the 2026-09-30 cutoff, so `refreshReturn` deliberately emits null. No row is dropped and no stale value is substituted. This safeguard is unchanged. All other rows have current refresh inputs.
- **No real cached listing was marked delisted**. Terminal-price behavior remains covered by the existing EODHD split-only regression, not by a real delisted example in this dataset. Historical membership remains the original hindsight universe; absent past constituents were not reconstructed. Do not claim a survivorship-free population.

## Build, tests, and nightly integration

- Fresh production build **passed**, including TypeScript and **8,219 pages**. [Build log](since-2b-evidence/build.log).
- Focused suite **84/84 passed**, five files: since-return, nightly-history, publish, main-layout and history. Standalone TypeScript also passed. `git diff --check` passed. The build after the CSS edit repeated TypeScript successfully. [Test log](since-2b-evidence/tests.log).
- Nightly source path verified: `run-daily.sh` calls `publish`; `publish` awaits `historyReturns`, blocks on failed refreshes, then `latestHistoryFiles` recomputes `perQuarter` and western summaries and `publishViews` produces hashed payloads. Existing integration tests exercise fresh means and preserved predictions. The actual complete refresh and isolated regeneration now exercise the full historical population locally.
- No nightly runner or remote publish was launched. The publish hold was left intact. The parallel nightly branch's changes were inspected read-only; they concern memo inputs, not this return-refresh call. A combined-branch nightly deployment has **not** been tested or merged here.

## UI fix and remaining failure

The first gate reproduced historical Next closest cards overlapping vertically at 1728×970. The added outcome had increased their text height beyond the existing row allowance. Changed **only historical card row-height thresholds** in `main-view.css`; Today and shared drawer/chrome rules are unchanged. The initial failing gate provided the reproduction; the rebuilt historical screens at 1728×970 and 2056×1180 pass the DOM layout check.

**Unfixed:** at **1440×800**, historical secondary buy rows squeeze the company-name grid column because predicted and since returns share the right-hand cell. Overlaps occur in all three requested past quarters (Berkeley/Omnicom/Pandora in 2018Q3; Pandora/Berkeley in 2020Q1; eBay/Franklin/Amphenol in 2011Q4). The disk stop occurred before implementing a second fix. Likely next step: stack the two return labels within that existing historical answer cell, preserving space for the company name, then verify all sizes. This is a diagnosis/proposed fix, not verified code.

## Gate, screenshots, consistency and change control

- Final release-gate run: **34 recorded visual states at 1728×970, zero layout/cut/overlap findings**, followed by one disk-stop record (35 records total). It did not reach the dossier paths or other viewports. [Gate report](since-2b-evidence/gate/report.json). Some PNGs left from the earlier, interrupted pre-fix run are also in that folder; only files referenced by the final report are final-run evidence.
- Separate screenshot/feature audit completed **12 page-and-list pairs**: Today, 2018Q3, 2020Q1, 2011Q4 at 1728×970, 2056×1180 and 1440×800. DOM checks pass all eight pairs at the two larger sizes and Today at 1440×800; the three historical 1440×800 pairs have the failures above. It checks visible card/table outcomes, expected headline, tooltip since label, and absence of since labels on Today. **390×844 was not reached.** [Screenshot audit](since-2b-evidence/screenshots/report.json).
- All eight requested large-desktop page screenshots were captured (links below). Visually inspected 1728×970/2018Q3 and 1440×800/2018Q3. **The other screenshots have not all been visually reviewed; they are not release approval.**
- Full consistency script passed its initial numeric assertions across **2,708 published dossiers, 13,145 quality rules, 1,968 finite IRRs and 41 cash-covered cases**. The final browser run was stopped during collection; **no completed 29-company browser consistency pass is claimed**. [Audit log](since-2b-evidence/audit.log). Cohort includes all current buys.
- Read `git diff --stat 2713930..HEAD` and the full diff of every touched UI component. Search, QuarterSlider, BottomBar, SidePanel and side-panel CSS are identical to requested master. CompanyList keeps master's sizing/pagination with only since metadata/labels added.
- Live-versus-candidate `change-review.mjs` remains **not run**. No deployment occurred. The full four-viewport gate, complete browser consistency audit, every required visual review and change-review pairs remain release blockers.

| Frame | 1728×970 | 2056×1180 |
|---|---|---|
| Today | [Screenshot](since-2b-evidence/screenshots/1728x970-Today.png) | [Screenshot](since-2b-evidence/screenshots/2056x1180-Today.png) |
| 2018Q3 | [Screenshot](since-2b-evidence/screenshots/1728x970-2018Q3.png) | [Screenshot](since-2b-evidence/screenshots/2056x1180-2018Q3.png) |
| 2020Q1 | [Screenshot](since-2b-evidence/screenshots/1728x970-2020Q1.png) | [Screenshot](since-2b-evidence/screenshots/2056x1180-2020Q1.png) |
| 2011Q4 | [Screenshot](since-2b-evidence/screenshots/1728x970-2011Q4.png) | [Screenshot](since-2b-evidence/screenshots/2056x1180-2011Q4.png) |

## Files changed in this round

- `app/value/main-view.css` — reserves more vertical space for historical Next closest cards so the new outcome label fits.
- `scripts/value/stages/history-returns.ts` — permits a run-specific `VALUE_MIN_FREE_GB` floor; default remains 5 GiB.
- `scripts/value/release-gate.mjs` — same run-specific disk floor, default remains 6 GiB.
- `scripts/value/consistency-audit.ts` — same run-specific disk floor, default remains 6 GiB.
- `.superpowers/sdd/2026-09-29-value/since-2b-report.md` — committed copy of this checkpoint report.

Inherited feature files and their reasons are fully listed in [since-2-report.md](since-2-report.md). New external artifacts are in `since-2b-evidence/`: logs, raw price evidence, reproduction scripts, screenshot reports and images, numerical audit and the cohort. The isolated store and compact price cache remain local. Commit message: **`value: show return since then on past quarters`**. This commit is a disk-stop checkpoint, not a readiness claim.
