# Return since then — final local verification (since-r1)

**Completed locally, 2026-10-03.** Resumed from `3bf8ff4` and its since-2b disk-stop report. The requested master commit `2713930` is already merged through `42f42b5`; ancestry was verified. No repeat merge or unrelated changes. Final commit message: `value: show return since then on past quarters`.

The four-viewport release gate now has **zero cut/overlap or other non-whitespace failures across 576 states**. All fixed-width drawer whitespace findings are retained and accepted under the owner's explicit exception in this task. **84 tests pass; production build passes; 15/15 price checks reconcile; 29/29 company consistency checks pass.** Screenshots and change-review pairs were opened and visually reviewed. No subagents, push, deploy, remote publish, or nightly run. No API keys appear in this report or evidence.

## Changes completed on this resume

1. Historical secondary buy rows at 1440×800 squeezed their company names when the predicted return and since return shared a horizontal cell. Reproduced the Berkeley/Omnicom/Pandora overlaps, then stacked the two figures inside that existing answer cell. Rechecked all four sizes; Today rules are unchanged.
2. The feature's longer Method paragraph made its final links spill into an extra column at 1440×800. Reproduced this against the original short paragraph; shortened the feature explanation while retaining the restated-accounts/current-membership and no-AI-reading qualifications. All Method states now fit. Drawer width, shell, columns, typography rules and other shared chrome were not changed.

Evidence: [row reproduction](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/reproduction.json), [Method reproduction](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/method-reproduction.json), [Method fix check](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/method-fix-check.json).

## GN.CO discrepancy and all 15 price checks

The preselected sample remains seed **20261003**, 15 distinct companies chosen from eligible company-quarter pairs before fetching daily prices. No resampling. Same-day raw evidence from since-2/2b was reused and its arithmetic independently checked again; no redundant price download was needed.

Yahoo's daily chart omits **2014-06-30**, so the original GN.CO comparison accidentally used 2014-06-27 at DKK 154.899994. EODHD supplies the missing quarter-end day's close **156.00**, exactly matching the stored Yahoo monthly close; the EODHD split response contains no later splits for this listing. The cache was correct: **105.40 / 156.00 − 1 = −32.435897%**. No price-code change was necessary. The current evidence corrects the GN row and keeps the original daily comparison separately, alongside raw daily rows and the split response. [Raw evidence and sources](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/spot-checks.json). EODHD's [historical API documentation](https://eodhd.com/financial-apis/api-for-historical-data-and-volumes) distinguishes ordinary close from dividend-adjusted close; this check used ordinary close.

Every row below was checked as `(latest / start − 1) × 100`, in the listing currency, without annualising or adding dividends. All 15 differences are below **0.001 percentage point**, including split-affected historical listings. Start prices below are split-adjusted Yahoo daily closes except GN.CO's confirmed EODHD close. Links and full-precision operands are in the raw evidence.

| Company | Quarter | Currency | Start trade | Start close | Latest trade | Latest close | Independent return | Stored return |
|---|---|---|---|---:|---|---:|---:|---:|
| CLX.US | 2018Q1 | USD | 2018-03-29 | 133.110001 | 2026-10-02 | 80.410004 | -39.591313% | -39.591316% |
| EQNR.OL | 2019Q4 | NOK | 2019-12-30 | 175.500000 | 2026-10-02 | 402.799988 | +129.515663% | +129.515670% |
| LUV.US | 2012Q3 | USD | 2012-09-28 | 8.770000 | 2026-10-02 | 42.470001 | +384.264527% | +384.264513% |
| 601288.SHG | 2016Q4 | CNY | 2016-12-30 | 3.100000 | 2026-09-30 | 6.970000 | +124.838710% | +124.838717% |
| PCAR.US | 2013Q4 | USD | 2013-12-31 | 39.446667 | 2026-10-02 | 109.680000 | +178.046308% | +178.046307% |
| PHP.LSE | 2023Q1 | GBp | 2023-03-31 | 101.199997 | 2026-10-02 | 90.349998 | -10.721343% | -10.721341% |
| BRG.AU | 2025Q4 | AUD | 2025-12-30 | 29.469999 | 2026-10-02 | 30.040001 | +1.934176% | +1.934173% |
| ACA.PA | 2020Q1 | EUR | 2020-03-31 | 6.690000 | 2026-10-02 | 16.885000 | +152.391631% | +152.391627% |
| SCA-B.ST | 2016Q2 | SEK | 2016-06-30 | 54.868877 | 2026-10-02 | 119.599998 | +117.974203% | +117.974206% |
| 601899.SHG | 2022Q2 | CNY | 2022-06-30 | 9.330000 | 2026-09-30 | 29.790001 | +219.292617% | +219.292607% |
| AMBU-B.CO | 2019Q3 | DKK | 2019-09-30 | 113.500000 | 2026-10-02 | 67.349998 | -40.660794% | -40.660793% |
| WM.US | 2012Q1 | USD | 2012-03-30 | 34.959999 | 2026-10-02 | 204.449997 | +484.811219% | +484.811228% |
| WCN.TO | 2009Q3 | CAD | 2009-09-30 | 19.217722 | 2026-10-02 | 219.250000 | +1040.874036% | +1040.874036% |
| VU.PA | 2019Q4 | EUR | 2019-12-31 | 31.700001 | 2026-10-02 | 129.199997 | +307.570958% | +307.570968% |
| GN.CO | 2014Q2 | DKK | 2014-06-30 | 156.000000 | 2026-10-02 | 105.400002 | -32.435896% | -32.435897% |

## Data and nightly publication

The full **2,079-company** price refresh completed in the prior checkpoint on this same UTC day, with zero failures. All return caches remain dated **2026-10-03**. The isolated `/tmp/value-since-store` retains regenerated history, metadata and browser views; other store directories are symlinks to the published local store. Nothing was remotely published. Prior refresh and regeneration evidence remains in [since-2b-evidence](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-2b-evidence/).

The fresh independent [data audit](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/data-audit.json) and [reproduction script](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/data-audit.cjs) verify **87 quarters, 102,384 source rows, 102,381 finite returns, and 37,502 browser rows**. Every finite return reproduces the latest price divided by the quarter price, minus one, within stored rounding. Original predictions, valuations and quality fields are unchanged. Both all-market and western equal-weight buy-group and analysed-universe averages match recomputation. Browser gains, expected returns, quality population and outcome dates match their source rows.

Three retained 2026Q3 rows have no return because their last available quotes precede the quarter-end cutoff: MLC.IR (2026-09-29), SKO.AU and TRA.AU (2026-09-28). They are not dropped or given a misleading stale return. No real cached listing is marked delisted; terminal-price/split-only behavior is verified by regression tests, rather than a real delisted example. The original history uses current membership and restated accounts; this feature preserves every stored row but does not reconstruct absent former constituents. It is not a survivorship-free backtest.

Nightly wiring is present in this branch: `scripts/value/run-daily.sh` invokes `publish`; `publish` awaits the full historical return refresh and aborts on any refresh failure; `latestHistoryFiles` then recomputes `perQuarter` summaries, including western scope, before `publishViews` creates hashed browser payloads and metadata. The focused integration tests cover fresh summaries and preserved predictions, and the full local regeneration exercised all historical rows. The publication hold remains intact. No remote nightly execution was performed. Changes on the parallel nightly branch were not merged, so a combined-branch deployment is not claimed.

## Build, browser and consistency verification

- **84/84 tests, five files:** since-return, nightly-history, publish, main-layout, history. [Log](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/tests.log).
- **Production build passed**, including TypeScript and 8,219 pages; final build includes both fixes above. Existing `.next` reused. [Log](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/build-final.log).
- **16/16 feature frames:** Today, 2018Q3, 2020Q1, 2011Q4 at all four sizes, each with page and All companies screenshot. The browser assertions check visible outcomes, headline arithmetic, hover tooltip and Today's absence of since labels, plus layout. [Report](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/report.json), [runner](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/browser.cjs).
- **29/29 company consistency checks pass**, with no numeric or surface mismatch. Coverage includes the buy cohort plus the required comparison dossiers, tiles, evidence drawers, business drawer, prices, valuation and financial surfaces. Initial whole-store assertions checked 2,708 published dossiers, 13,145 quality rules, 1,969 finite IRRs and 41 cash-covered cases. [Final results](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/consistency-final.json), [cohort](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/cohort-final.json), [initial log](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/audit.log).
- The first audit assumed absent `RELIANCE.NSE` must return 404. It actually redirects to published canonical `RIGD.LSE`. Verified the redirect, 200 status and Reliance company name, then audited RIGD.LSE successfully. This was an audit input correction, not an application defect; the original failed assertion is preserved. [Alias proof](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/reliance-alias.json), [canonical audit](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/audit-alias/consistency/report.json).
- `git diff --check` passed. Read the diff statistics against `2713930` and the full diff of every touched UI component. Search, QuarterSlider, BottomBar, SidePanel and side-panel CSS are identical to the requested master. CompanyList keeps master's sizing, pagination and behavior, adding only since labels and metadata. No valuation/verdict changes.

## Full release gate

13 routes × four sizes: home Today and all three requested historical frames, plus LULU, WKL, ADBE, GOOGL, KO, JPM, Toyota, Reliance and Close Brothers. The run opens every drawer, home filters, search and search results. Desktop rows each cover 145 states; phone covers 141 because it has a single Filters sheet.

Long-lived Chromium runs sometimes closed unexpectedly; the cause was not established. Runs were completed with fresh browser processes per route, retaining raw logs. A complete 576-state sweep identified only the Method clipping plus fixed-width whitespace after the buy-row fix. Following the Method text edit and final production build, all 52 route/viewport Method states, pages, search states and home filters were rerun. These replace the corresponding earlier records; all unaffected states retain their completed full-sweep evidence. This is a full sweep plus affected-state retest, not a claim that one uninterrupted process ran the entire final build.

[Consolidated final gate](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/gate-final.json) maps each state to its source report and screenshot folder. [Summary](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/gate-summary.json). [Before Method fix](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/gate-before-method-fix.json) is retained for comparison.

| Viewport | States | Routes | Cut/overlap and other non-whitespace failures | States with accepted whitespace | Largest raster empty area |
|---|---:|---:|---:|---:|---:|
| 1728x970 | 145 | 13 | 0 | 25 | 31.51% |
| 2056x1180 | 145 | 13 | 0 | 16 | 27.73% |
| 1440x800 | 145 | 13 | 0 | 42 | 42.84% |
| 390x844 | 141 | 13 | 0 | 0 | 14.71% |

The gate's raw whitespace warnings were not suppressed or erased: **83 states** have them. Nine raster findings exceed the design contract's earlier approximate 25% allowance; this task explicitly accepts empty-area findings for fixed-width drawers. They are Reliance In depth 31.51% at 1728; CBG valuation 27.73% at 2056; and, at 1440, CBG moat 32.16% / cash 39.72%, GOOGL valuation 32.63%, JPM moat 32.80% / cash 30.48%, WKL cash 42.84% / valuation 28.65%. The shared fixed-width shell was preserved. There are no cut/overlap findings hidden within this exception. Phone has zero warnings.

## Screenshots and change control

Opened and reviewed all eight required large-desktop page screenshots below, the smaller viewport historical pages, and the home/Buy now/Next closest/filter/2011 and LULU/ADBE/GOOGL/KO/JPM dossier and drawer screenshots at all four sizes. The [visual-review manifest](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/visual-review/manifest.json) maps contact sheets back to original full-resolution captures; phones retain their permitted section scrolling.

Ran `change-review.mjs` against live production and local candidate: **20 state/viewport comparisons**, producing **14 changed pairs**, every pair opened and reviewed. [Report](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/change-review/report.json). After the final Method edit, reran Method comparisons at all four sizes and opened all **three** resulting changed pairs; phone's first Method screen was unchanged. [Final Method comparison](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/change-method-final/report.json). Shared-chrome file comparison is empty.

Changed pixels trace to the requested since labels/headline and historical fitting, the requested Method explanation, or the named data difference between live quotes and the current local store (for example LULU 95.86 → 94.46 and 21.6% → 21.9%; KO 86.10 → 85.65 and 6.7% → 6.8%). Today has no since labels and no new layout rules. The generic change-review phone country-selector action could not open the hidden desktop combobox; the real phone Filters sheet was separately exercised in the full gate and visually reviewed. No comparison is treated as deployment authorization.

| Frame | 1728×970 | 2056×1180 | 1440×800 | 390×844 |
|---|---|---|---|---|
| Today | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/1728x970-Today.png) | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/2056x1180-Today.png) | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/1440x800-Today.png) | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/390x844-Today.png) |
| 2018Q3 | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/1728x970-2018Q3.png) | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/2056x1180-2018Q3.png) | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/1440x800-2018Q3.png) | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/390x844-2018Q3.png) |
| 2020Q1 | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/1728x970-2020Q1.png) | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/2056x1180-2020Q1.png) | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/1440x800-2020Q1.png) | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/390x844-2020Q1.png) |
| 2011Q4 | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/1728x970-2011Q4.png) | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/2056x1180-2011Q4.png) | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/1440x800-2011Q4.png) | [Screenshot](/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/since-r1-evidence/screenshots/390x844-2011Q4.png) |

## Scope and file list

Only two source files changed in this resume:

- `app/value/main-view.css` — stack historical secondary buy-row return figures to prevent company-name overlap; only the historical answer cell changes.
- `components/value/AboutMethod.tsx` — shorten the requested historical-return explanation to fit master's fixed-width Method drawer.
- `.superpowers/sdd/2026-09-29-value/since-r1-report.md` — committed copy of this final verification report.

Cumulative feature files relative to master `2713930` (including prior checkpoints):

- `app/value/ValueIndex.tsx` — carry outcome metadata and render the precomputed historical headline.
- `app/value/main-view.css` — since-label styling and historical-only card fitting, including this resume's fix.
- `components/value/AboutMethod.tsx` — concise prediction-versus-outcome explanation, dividends excluded.
- `components/value/CompanyList.tsx` — show since return and terminal-date metadata alongside the existing prediction.
- `components/value/MainView.tsx` — since returns on hero/cards/rows and hover tooltip; preserve predictions.
- `lib/value/browser-view.ts` — propagate since return and outcome metadata into historical browser rows.
- `lib/value/result-entry.ts` — type the carried historical outcome metadata.
- `lib/value/since-return.ts` — shared absolute-return formatting and precomputed headline formatting.
- `lib/value/types.ts` — type historical endpoint/terminal metadata.
- `scripts/value/stages/history-returns.ts` — refresh all stored historical identities' prices, split-only fallback, terminal handling, and configurable disk floor.
- `scripts/value/stages/history-snapshots.ts` — update returns and recompute equal-weight all/western quarter summaries while preserving predictions.
- `scripts/value/stages/publish.ts` — await return refresh before regenerating summaries and browser payloads; fail closed on refresh failure.
- `scripts/value/consistency-audit.ts` — inherited run-specific disk-floor setting; default unchanged.
- `scripts/value/release-gate.mjs` — inherited run-specific disk-floor setting; default unchanged.
- `tests/unit/value-since-return.test.ts` — return/headline formatting and split-only terminal-price cases.
- `tests/unit/value/nightly-history.test.ts` — refreshed outcomes, retained history and current summaries.
- `tests/unit/value/publish.test.ts` — historical rows survive membership changes and publication summaries remain current.
- `.superpowers/sdd/2026-09-29-value/since-2-report.md` — prior checkpoint evidence.
- `.superpowers/sdd/2026-09-29-value/since-2b-report.md` — prior disk-stop checkpoint evidence.
- `.superpowers/sdd/2026-09-29-value/since-r1-report.md` — this final report.

External additions are confined to this report and `since-r1-evidence/`: reports, raw price checks, scripts, logs, screenshots and contact sheets. No dependency installation, extra worktree, alternate build directory or additional price refresh was needed.

## Disk budget and completion

Used **3 GiB** as the requested stop floor for all resumed verification runners; no disk stop this round. Initial free space was approximately 14 GB; final `df -k` showed 12,398,584 KiB available (other jobs share the disk). `.next` allocation is 2,055,192 KiB versus 2,052,560 KiB at resume, a net increase of 2,632 KiB. New evidence is approximately 256,000 KiB plus small logs/report; total new retained task allocation is approximately **0.27 GB**, below 1.5 GB. Existing local store and return caches were reused. Build outputs remain in `.next`.

The feature is complete and verified locally under the explicit fixed-width whitespace exception. The local server is stopped after verification. No remote action was taken; the final local commit carries the requested message.
