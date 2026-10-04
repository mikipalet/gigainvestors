# ttm-1 — rolling LTM quality tests

2026-10-04 UTC. Worktree `/Users/miki/GitHub/superinvestors-wt/value-zt-ttm`; base `5b231e8`. Local-only implementation and staging publication. Requested commit: `value: rolling LTM provisional year for quality tests`.

## Result

- Replayed **20 companies × 8 quarters = 160 observations**, 2024Q4–2026Q3. Raw LTM produced **9 differing test observations and 1 flap**. Two-quarter confirmation reduced this to **4 differing observations and 0 flaps** in the same cohort.
- Today: **31 raw LTM-only numeric changes**, **24 after confirmation**. Full staging publication has **22 quality-test verdict differences versus live**; the separate lists below distinguish the annual counterfactual from the released baseline.
- Published **2708 / 2708 companies** into the isolated store. **147 frozen dossiers preserved exactly**, 0 differences.
- Rebuilt **87 calendar-quarter frames** for all 2,708 current published companies; history failures: **0**. Older published identities remain preserved by the existing publication retention rule.
- Final production-build visual gate: **725 states at 1728×970, 2056×1180, 1440×800 and 390×844**; **0 states with non-whitespace issues**. The full gate still flags 134 whitespace-only states; detail below.
- No push, deployment, subagents or financial-data API fetches. Live `~/value-corpus/analysis` and `~/value-corpus/publish-repo` were read only. All generated analysis, historical frames and publication output are private staging files.

## Data and confirmation rules

`lib/value/quality-ltm.ts` maps explicit provider quarterly statements: four consecutive roughly three-month periods for flows, latest quarter-end balance for stocks, and an average of quarterly diluted shares. True quarterly statements are required. Existing half-year detection rejects half-year-only and padded half-year data. Income, balance and any cash-flow statement must agree on reporting currency and absolute units. Missing lines stay null; absent cash/debt components are not invented or copied from annual statements.

The last annual must have a complete matching four-quarter anchor. Revenue, net income and diluted shares must reconcile within 2%; every other observed annual field is checked independently and excluded from the provisional observation if it fails. Known dated splits normalize a matching share discontinuity, including an 11-for-10 split; already-adjusted shares are not adjusted twice. Unresolved share/unit jumps are rejected. Each quality test has its own required fields and observed optional dependencies. Minority-interest and lease dependencies also force annual fallback when absent. No annual acquisition estimates or judgement defaults are carried into the provisional row.

All five tests can consume the extra observation; their rolling windows shift by one. An annual report replaces the provisional slot. Current cash-conversion, chart and table series retain their own test's window and income basis. The valuation and annual owner memo continue to use their existing inputs.

**Hysteresis:** reconstruct quarterly LTM candidates after the latest annual. A verdict change needs the same new result at two consecutive quarter ends. An unconfirmed change retains the prior confirmed observation, including its numbers and exact LTM date; an initial unconfirmed change retains the annual test. A return in the other direction also requires two confirmations. New annual reports reset this state. A test with missing quarterly dependencies immediately uses annual data. This keeps the visible verdict consistent with the displayed numbers; it never paints a pass over failing current metrics.

Current analysis fingerprints include eligible quarterly periods so crossing a fallback filing date triggers a refresh. Historical calculations admit only statements filed strictly before the selected quarter end, including the latest filing date across income, balance and cash flow. The existing 90-day fallback remains for unknown/unusable dates. Confirmation uses only quarterly periods known at that cutoff. As in the existing backtest, cached figures can be restated: this is filing-date-aware replay, not a vintage filing archive. Current classification, FX and other existing historical assumptions remain as documented in the history output.

JP support uses existing verified issuer-linked provider quarterly caches alongside annual EDINET data. No new native EDINET quarterly parser or fabricated substitute was added. Native/secondary quarters lacking enough reconciled history remain annual. Management has no eligible current issuer in this cache because required quarterly lines are absent; the synthetic complete-input test exercises LTM for all five tests.

Labels read `LTM to <Mon YYYY>` on charts, tooltips and table rows. Dense charts use a single date-range caption to prevent the annual and LTM endpoints colliding in narrow bank panels. Existing panel types and width rules are unchanged; no shared-chrome code changed. LTM observations stay inside the existing charts and tables. The business-drawer fix groups duplicate SEC companyfacts calculation links while retaining every quote: unchanged live LULU data reproduced cut links at desktop sizes. Oversized calculation/filing hover text uses a short click prompt; the complete text remains in the existing disclosure. The compact Method drawer shows the latest three method entries so the new LTM entry fits at 1440px; the full Method page retains every version. No panel width rule or shared-chrome component changed. A final manual screenshot review also found compact-desktop card footers painting outside their borders (including annual ADBE figures). The dossier-only 1440×800 fix lets line/price charts yield vertical space to their numbers; the audit now checks card boundaries even when CSS overflow is visible. Before/after measurements are retained in `.ttm-1/compact-probe.json`.

Method version **3.3.0**; pipeline **27**. The released 2026-10-01 forward record is byte-identical in staging. A fresh preview publication creates the 2026-10-04 record with method 3.3.0. Each staging rerun starts from the released forward archive so earlier local experiments cannot retain a stale same-day preview; no released observation is rewritten.

## Coverage

2708 current issuers audited; 722 have a reconciled latest four-quarter candidate; 527 have at least one provisional quality observation after confirmation, before the release freeze. After the freeze, **491 published dossiers** display at least one LTM quality observation.

| Test | Current provisional observations |
| --- | --- |
| understandable | 514 |
| moat | 147 |
| economics | 48 |
| management | 0 |
| accounting | 13 |

Eligibility is intentionally conservative. Zero eligible quarters is not a claimed stability success for that company. The initial trial contained large-bank annual-only controls; the final cohort was selected for actual quarterly eligibility before measuring its outcomes. Every final member exercises LTM during at least one replay quarter.

## Stability gate

The cohort spans seasonal retailers (WMT, COST, TGT, KR), travel (DAL, MAR, BKNG), banks (BNY, BMO, BBDC3, BBVA), insurer SLF, US technology (AAPL, MSFT, ADBE, GOOGL), cyclicals (CAT, DE, XOM), and Japan (Murata, 6981.JP).

| Company | Quarters with a displayed LTM test |
| --- | --- |
| WMT.US | 6 |
| COST.US | 7 |
| TGT.US | 6 |
| KR.US | 2 |
| DAL.US | 6 |
| MAR.US | 5 |
| BKNG.US | 5 |
| BNY.US | 2 |
| BMO.TO | 2 |
| BBDC3.SA | 6 |
| AAPL.US | 6 |
| MSFT.US | 6 |
| ADBE.US | 5 |
| GOOGL.US | 6 |
| CAT.US | 6 |
| DE.US | 6 |
| XOM.US | 1 |
| SLF.TO | 6 |
| BBVA.MC | 2 |
| 6981.JP | 3 |

Each observation compares the identical annual input prefix with and without LTM. A flap is an LTM-caused transition that returns to the previous result within the next two calendar-quarter observations. Opening-boundary changes are counted against the annual control. Persistent differences in two quarters are listed twice below but are one transition. The last two replay quarters are right-censored: zero observed flapping does not guarantee that a future quarter will not reverse a recent change.

### Every raw LTM-driven difference

| Company | Quarter | LTM end | Test | Annual → raw LTM | Changed metrics / cause |
| --- | --- | --- | --- | --- | --- |
| ADBE.US | 2024Q4 | 2024-08-31 | moat | fail → pass | roicMedian: 0.199574 → 0.231471; roicSecondLowest: 0.0727579 → 0.129289; capitalFallbackYears: 8 → 7; capexToRevenue: 0.0297089 → 0.0273133 |
| CAT.US | 2025Q4 | 2025-09-30 | understandable | fail → pass | opMarginCv: 0.381509 → 0.348266 |
| WMT.US | 2026Q2 | 2026-04-30 | moat | fail → pass | roicMedian: 0.149635 → 0.160154; capexToRevenue: 0.022369 → 0.0252293 |
| WMT.US | 2026Q3 | 2026-07-31 | moat | fail → pass | roicMedian: 0.149635 → 0.160815; capexToRevenue: 0.022369 → 0.0252293 |
| DE.US | 2026Q2 | 2026-04-30 | economics | fail → pass | oeToNi: 0.849125 → 0.806308; ownerEarningsTotal: 3.0048e+10 → 2.75814e+10; netIncomeTotal: 3.5387e+10 → 3.4207e+10; roiic: 0.1038 → 1; nwcToRevenueTrend: 0.0178161 → -0.0100561; nwcToRevenueChange: 0.135579 → 0.00375453; nwcToRevenueEnd: 1.22615 → 0.980278 |
| DE.US | 2026Q3 | 2026-07-31 | economics | fail → pass | oeToNi: 0.849125 → 0.835274; ownerEarningsTotal: 3.0048e+10 → 2.86474e+10; netIncomeTotal: 3.5387e+10 → 3.4297e+10; roiic: 0.1038 → 1; nwcToRevenueTrend: 0.0178161 → -0.0106659; nwcToRevenueChange: 0.135579 → 2.83186e-05; nwcToRevenueEnd: 1.22615 → 0.976551 |
| BMO.TO | 2026Q2 | 2026-01-31 | moat | fail → pass | roeMedian: 0.117618 → 0.127756; roeSecondLowest: 0.0743485 → 0.0869962 |
| BMO.TO | 2026Q2 | 2026-01-31 | economics | fail → pass | bookReturnCagr: 0.0538085 → 0.0700399; bookStartPerShare: 97.7778 → 82.324; bookEndPerShare: 92.9884 → 89.2199 |
| BMO.TO | 2026Q3 | 2026-04-30 | economics | fail → pass | bookReturnCagr: 0.0538085 → 0.0706962; bookStartPerShare: 97.7778 → 82.324; bookEndPerShare: 92.9884 → 89.7074 |

Raw flapping: [{"id": "BMO.TO", "test": "moat", "quarter": "2026Q2", "reverted": "2026Q3", "from": "F", "to": "P"}]. BMO's moat briefly crossed the 12% bank-return median bar and returned to annual failure in the next frame. Confirmation suppresses that one-quarter change.

### Every difference after confirmation

| Company | Quarter | Confirmed LTM end | Test | Annual → confirmed | Changed metrics / cause |
| --- | --- | --- | --- | --- | --- |
| ADBE.US | 2024Q4 | 2024-08-31 | moat | fail → pass | roicMedian: 0.199574 → 0.231471; roicSecondLowest: 0.0727579 → 0.129289; capitalFallbackYears: 8 → 7; capexToRevenue: 0.0297089 → 0.0273133 |
| WMT.US | 2026Q3 | 2026-07-31 | moat | fail → pass | roicMedian: 0.149635 → 0.160815; capexToRevenue: 0.022369 → 0.0252293 |
| DE.US | 2026Q3 | 2026-07-31 | economics | fail → pass | oeToNi: 0.849125 → 0.835274; ownerEarningsTotal: 3.0048e+10 → 2.86474e+10; netIncomeTotal: 3.5387e+10 → 3.4297e+10; roiic: 0.1038 → 1; nwcToRevenueTrend: 0.0178161 → -0.0106659; nwcToRevenueChange: 0.135579 → 2.83186e-05; nwcToRevenueEnd: 1.22615 → 0.976551 |
| BMO.TO | 2026Q3 | 2026-04-30 | economics | fail → pass | bookReturnCagr: 0.0538085 → 0.0706962; bookStartPerShare: 97.7778 → 82.324; bookEndPerShare: 92.9884 → 89.7074 |

Key bars: operating-margin coefficient of variation ≤0.35; operating ROIC median ≥15% and second-lowest ≥10%; bank tangible/common return median ≥12%; book-plus-dividend growth ≥7%. The DE cash-test change reflects the working-capital window and incremental-return rules, not a change to the cash-conversion bar. Full input/metric deltas are in `.ttm-1/stability.json`.

## Today's changes

### Raw LTM counterfactual, before confirmation

| Company | Test | LTM end | Annual → raw LTM | Cause / changed metrics |
| --- | --- | --- | --- | --- |
| CSX.US | understandable | 2026-06-30 | fail → pass | revenueDeclines: 6 → 5; opMarginCv: 0.104224 → 0.0846538 |
| 112610.KO | understandable | 2026-06-30 | fail → pass | revenueDeclines: 1 → 2; lossYears: 1 → 0; opMarginCv: 0.801127 → 0.288008 |
| BIIB.US | understandable | 2026-06-30 | pass → fail | opMarginCv: 0.310494 → 0.373218 |
| WIE.VI | understandable | 2026-06-30 | pass → fail | opMarginCv: 0.335878 → 0.36879 |
| RAIL3.SA | understandable | 2026-06-30 | fail → pass | lossYears: 3 → 2; opMarginCv: 0.338512 → 0.228778 |
| 2327.TW | understandable | 2026-06-30 | fail → pass | opMarginCv: 0.367043 → 0.320144 |
| ARM.US | understandable | 2026-06-30 | unclear → fail | historyYears: 6 → 7; opMarginCv: 0.450441 → 0.417468 |
| STE.US | moat | 2026-06-30 | fail → pass | roicMedian: 0.156598 → 0.172339; roicSecondLowest: 0.0796848 → 0.121722 |
| VRT.US | economics | 2026-06-30 | fail → pass | oeToNi: 1.19795 → 1.07822; ownerEarningsTotal: 2.9769e+09 → 4.4179e+09; netIncomeTotal: 2.485e+09 → 4.0974e+09; roiic: 1.04001 → 0.751246; nwcToRevenueTrend: 0.0183147 → 0.00566077; nwcToRevenueChange: 0.114908 → 0.00648377; nwcToRevenueEnd: 0.284751 → 0.297175 |
| R3NK.XETRA | understandable | 2026-06-30 | unclear → pass | historyYears: 6 → 7; opMarginCv: 0.309445 → 0.301091 |
| 103140.KO | understandable | 2026-06-30 | fail → pass | opMarginCv: 0.3526 → 0.347087 |
| VICI.US | understandable | 2026-06-30 | fail → pass | opMarginCv: 0.361296 → 0.126113 |
| SWKS.US | understandable | 2026-06-30 | pass → fail | revenueDeclines: 5 → 6; opMarginCv: 0.275489 → 0.365477 |
| 373220.KO | understandable | 2026-03-31 | unclear → fail | historyYears: 6 → 7; lossYears: 3 → 4; opMarginCv: 9.14552 → 15.2944 |
| ZAL.XETRA | understandable | 2026-06-30 | fail → pass | opMarginCv: 0.374855 → 0.337178 |
| 185750.KO | understandable | 2026-06-30 | pass → fail | opMarginCv: 0.315987 → 0.358694 |
| MDLZ.US | economics | 2026-03-31 | fail → pass | oeToNi: 0.993854 → 0.988125; ownerEarningsTotal: 1.8921e+10 → 1.7141e+10; netIncomeTotal: 1.9038e+10 → 1.7347e+10; roiic: 0 → 1; nwcToRevenueTrend: -0.00393423 → -0.00159204; nwcToRevenueChange: -0.0268555 → -0.0145783; nwcToRevenueEnd: -0.0165236 → -0.0171282 |
| PWR.US | moat | 2026-06-30 | fail → pass | roicMedian: 0.141774 → 0.151056; roicSecondLowest: 0.109956 → 0.117606; capexToRevenue: 0.0253156 → 0.0245634 |
| 002840.KO | understandable | 2026-06-30 | fail → pass | opMarginCv: 0.357617 → 0.330325 |
| SNPS.US | economics | 2026-07-31 | fail → pass | oeToNi: 0.689724 → 0.835918; ownerEarningsTotal: 4.52983e+09 → 5.75646e+09; netIncomeTotal: 6.5676e+09 → 6.8864e+09; roiic: 155.372 → 1; nwcToRevenueTrend: 0.00351247 → -0.00702078; nwcToRevenueChange: 0.0246293 → -0.0355505; nwcToRevenueEnd: 0.204261 → 0.151079 |
| 3661.TW | understandable | 2026-06-30 | fail → pass | lossYears: 1 → 0; opMarginCv: 0.566436 → 0.295436 |
| CFG-PH.US | moat | 2026-06-30 | fail → pass | roeMedian: 0.116922 → 0.125628; roeSecondLowest: 0.0878151 → 0.0947805 |
| WMT.US | moat | 2026-07-31 | fail → pass | roicMedian: 0.149635 → 0.160815; capexToRevenue: 0.022369 → 0.0252293 |
| SYF.US | understandable | 2026-06-30 | pass → fail | revenueDeclines: 3 → 4; opMarginCv: 0.34618 → 0.351544 |
| 2382.TW | understandable | 2026-06-30 | fail → pass | revenueDeclines: 2 → 1; opMarginCv: 0.363043 → 0.342172 |
| RL.US | moat | 2026-06-30 | fail → pass | roicMedian: 0.21015 → 0.250635; roicSecondLowest: -0.013702 → 0.109757 |
| CAI.VI | understandable | 2026-06-30 | pass → fail | revenueDeclines: 5 → 6; opMarginCv: 0.0870418 → 0.0866235 |
| DE.US | economics | 2026-07-31 | fail → pass | oeToNi: 0.849125 → 0.835274; ownerEarningsTotal: 3.0048e+10 → 2.86474e+10; netIncomeTotal: 3.5387e+10 → 3.4297e+10; roiic: 0.1038 → 1; nwcToRevenueTrend: 0.0178161 → -0.0106659; nwcToRevenueChange: 0.135579 → 2.83186e-05; nwcToRevenueEnd: 1.22615 → 0.976551 |
| CBOE.US | understandable | 2026-06-30 | fail → pass | opMarginCv: 0.361223 → 0.279341 |
| BMO.TO | economics | 2026-04-30 | fail → pass | bookReturnCagr: 0.0526125 → 0.0706962; bookStartPerShare: 97.7778 → 82.324; bookEndPerShare: 91.9384 → 89.7074 |
| FIX.US | understandable | 2026-06-30 | pass → fail | opMarginCv: 0.342849 → 0.419425 |

### After two-quarter confirmation, before the released verdict freeze

| Company | Test | Confirmed LTM end | Annual → confirmed | Frozen today? | Cause / changed metrics |
| --- | --- | --- | --- | --- | --- |
| CSX.US | understandable | 2026-06-30 | fail → pass | no | revenueDeclines: 6 → 5; opMarginCv: 0.104224 → 0.0846538 |
| 112610.KO | understandable | 2026-06-30 | fail → pass | no | revenueDeclines: 1 → 2; lossYears: 1 → 0; opMarginCv: 0.801127 → 0.288008 |
| BIIB.US | understandable | 2026-06-30 | pass → fail | no | opMarginCv: 0.310494 → 0.373218 |
| RAIL3.SA | understandable | 2026-06-30 | fail → pass | no | lossYears: 3 → 2; opMarginCv: 0.338512 → 0.228778 |
| 2327.TW | understandable | 2026-06-30 | fail → pass | no | opMarginCv: 0.367043 → 0.320144 |
| VRT.US | economics | 2026-06-30 | fail → pass | no | oeToNi: 1.19795 → 1.07822; ownerEarningsTotal: 2.9769e+09 → 4.4179e+09; netIncomeTotal: 2.485e+09 → 4.0974e+09; roiic: 1.04001 → 0.751246; nwcToRevenueTrend: 0.0183147 → 0.00566077; nwcToRevenueChange: 0.114908 → 0.00648377; nwcToRevenueEnd: 0.284751 → 0.297175 |
| R3NK.XETRA | understandable | 2026-06-30 | unclear → pass | no | historyYears: 6 → 7; opMarginCv: 0.309445 → 0.301091 |
| 103140.KO | understandable | 2026-06-30 | fail → pass | no | opMarginCv: 0.3526 → 0.347087 |
| VICI.US | understandable | 2026-06-30 | fail → pass | no | opMarginCv: 0.361296 → 0.126113 |
| SWKS.US | understandable | 2026-06-30 | pass → fail | no | revenueDeclines: 5 → 6; opMarginCv: 0.275489 → 0.365477 |
| ZAL.XETRA | understandable | 2026-06-30 | fail → pass | no | opMarginCv: 0.374855 → 0.337178 |
| 185750.KO | understandable | 2026-06-30 | pass → fail | no | opMarginCv: 0.315987 → 0.358694 |
| PWR.US | moat | 2026-06-30 | fail → pass | no | roicMedian: 0.141774 → 0.151056; roicSecondLowest: 0.109956 → 0.117606; capexToRevenue: 0.0253156 → 0.0245634 |
| 002840.KO | understandable | 2026-06-30 | fail → pass | no | opMarginCv: 0.357617 → 0.330325 |
| 3661.TW | understandable | 2026-06-30 | fail → pass | no | lossYears: 1 → 0; opMarginCv: 0.566436 → 0.295436 |
| CFG-PH.US | moat | 2026-06-30 | fail → pass | no | roeMedian: 0.116922 → 0.125628; roeSecondLowest: 0.0878151 → 0.0947805 |
| WMT.US | moat | 2026-07-31 | fail → pass | no | roicMedian: 0.149635 → 0.160815; capexToRevenue: 0.022369 → 0.0252293 |
| SYF.US | understandable | 2026-06-30 | pass → fail | no | revenueDeclines: 3 → 4; opMarginCv: 0.34618 → 0.351544 |
| 2382.TW | understandable | 2026-06-30 | fail → pass | no | revenueDeclines: 2 → 1; opMarginCv: 0.363043 → 0.342172 |
| CAI.VI | understandable | 2026-06-30 | pass → fail | yes | revenueDeclines: 5 → 6; opMarginCv: 0.0870418 → 0.0866235 |
| DE.US | economics | 2026-07-31 | fail → pass | no | oeToNi: 0.849125 → 0.835274; ownerEarningsTotal: 3.0048e+10 → 2.86474e+10; netIncomeTotal: 3.5387e+10 → 3.4297e+10; roiic: 0.1038 → 1; nwcToRevenueTrend: 0.0178161 → -0.0106659; nwcToRevenueChange: 0.135579 → 2.83186e-05; nwcToRevenueEnd: 1.22615 → 0.976551 |
| CBOE.US | understandable | 2026-06-30 | fail → pass | no | opMarginCv: 0.361223 → 0.279341 |
| BMO.TO | economics | 2026-04-30 | fail → pass | no | bookReturnCagr: 0.0526125 → 0.0706962; bookStartPerShare: 97.7778 → 82.324; bookEndPerShare: 91.9384 → 89.7074 |
| FIX.US | understandable | 2026-06-30 | pass → fail | no | opMarginCv: 0.342849 → 0.419425 |

### Actual full-publish diff against live

| Company | Test | Live → staged |
| --- | --- | --- |
| CSX.US | understandable | fail → pass |
| 112610.KO | understandable | fail → pass |
| BIIB.US | understandable | pass → fail |
| RAIL3.SA | understandable | fail → pass |
| 2327.TW | understandable | fail → pass |
| VRT.US | economics | fail → pass |
| 103140.KO | understandable | fail → pass |
| VICI.US | understandable | fail → pass |
| SWKS.US | understandable | pass → fail |
| ZAL.XETRA | understandable | fail → pass |
| 185750.KO | understandable | pass → fail |
| PWR.US | moat | fail → pass |
| 002840.KO | understandable | fail → pass |
| 3661.TW | understandable | fail → pass |
| CFG-PH.US | moat | fail → pass |
| WMT.US | moat | fail → pass |
| SYF.US | understandable | pass → fail |
| 2382.TW | understandable | fail → pass |
| DE.US | economics | fail → pass |
| CBOE.US | understandable | fail → pass |
| BMO.TO | economics | fail → pass |
| FIX.US | understandable | pass → fail |

Company-level quality / buy changes:

| Company | All five pass: live → staged | Buy: live → staged |
| --- | --- | --- |
| CFG-PH.US | False → True | False → True |

The raw comparison uses a fixed local copy of memo-year inputs; the live comparison uses the already released dossier and existing judgement evidence. Thus its count need not equal the annual numeric counterfactual. The standard publisher reapplies all membership, price, integrity and freeze rules. No frozen dossier changed. Independent checks covered 2708 dossiers, 13177 quality verdicts and 1921 valuation/IRR pairs.

## Verification and scope review

- Final focused suite: `npx vitest run --maxWorkers=1 --testTimeout=20000` over quality-LTM, stability, evidence grouping, analyze, quarterly, forward, publish and selected-sources tests; see `.ttm-1/tests-final-serial.log` for the final total.
- The full value regression suite passed 184 files: 1,964 tests passed, one skipped. Final focused LTM/integration checks passed 223 tests, and the additional UI audit checks passed 21 tests. An unrelated source-refresh test intermittently exceeded its existing five-second budget under concurrent host load, then passed in isolation in under one second. The final focused run uses a 20-second execution budget, with no production/test logic changed for that timeout.
- New regression coverage includes missing lines, basis/currency/units, half-year fillers, split adjustment, strict filing cutoffs, annual replacement, per-test fallback, minority/common-earnings/lease dependencies, correct chart windows, bidirectional confirmation, and evidence-link grouping.
- `npx tsc --noEmit`, `git diff --check`, structural publication invariants and a real `npm run build` were run on the final implementation.
- Local release gate ran on the production server at port 3047, all four contract sizes, including home/list drawers, search/filter states, 2011 and 2018Q3, LULU, WKL, ADBE, GOOGL, KO, JPM, 7203.JP, RELIANCE, CBG, plus WMT, DE, BMO and CFG-PH. The rendered data-surface audit passed GOOGL, WMT, DE, BMO and CFG-PH, including every quality drawer and the home/list values.
- Manual screenshot review covered home, buy/next-closest lists, Method, 2011, ADBE, GOOGL, KO, JPM, LTM quality/valuation/business drawers and phone sheets. Long source-tooltip probes passed all four sizes (maximum width 400px; zero off-screen findings).
- Every changed UI diff was reviewed. Search, bottom bar, timeline, filter components, side-panel shell, global styles and drawer widths have no diff; `density.css` has only the compact-dossier chart-height fix described above. LTM labeling/context changes trace to this brief. Source-link grouping and compact long-quote hover text trace to independently reproduced LULU clipping. The compact three-entry method history accommodates the new LTM version while the full Method page retains its archive. No routing/shared-brand merge work is included.

Whitespace-only gate findings: 134 states. Maximum raster-empty measurement among those: 53.0%. The gate's generic 8%/15% whitespace limits are stricter than the contract's fixed-width allowance. Some pre-existing sparse drawers exceed even that allowance; they are recorded rather than changing unrelated drawer widths. This is not a claim that every broader design-gate assertion passes. The requested zero-cut/zero-overlap outcome is stated separately above.

Non-whitespace issues: [].

## Staging isolation and artifacts

- Corpus overlay: `/Users/miki/GitHub/superinvestors-wt/value-zt-ttm/.ttm-1/corpus`. Cached source areas are symlinked and accessed read-only; `analysis`, `history-v7` and staging outputs are private directories. Memo-year inputs were copied into this overlay before the replay so the other reanalysis job could not change that comparison mid-run.
- Publication output: `/Users/miki/GitHub/superinvestors-wt/value-zt-ttm/.ttm-1/store`. The live publish repository is used only as a read-only baseline for dossiers, quotes, freeze and forward observations.
- Audit/replay: `npx tsx scripts/value/ltm-audit.ts`.
- Complete historical rebuild: `npx tsx scripts/value/ltm-history.ts`.
- Full local publish: `npx tsx scripts/value/ltm-publish.ts`.
- Build/start use `VALUE_CORPUS_DIR=$PWD/.ttm-1/corpus VALUE_STORE_DIR=$PWD/.ttm-1/store VALUE_SITE_HOST=localhost`.
- Gate report/screenshots: `/Users/miki/GitHub/superinvestors-wt/value-zt-ttm/.ttm-1/gate-final`; initial/baseline LULU evidence: `/Users/miki/GitHub/superinvestors-wt/value-zt-ttm/.ttm-1/gate` and `/Users/miki/GitHub/superinvestors-wt/value-zt-ttm/.ttm-1/baseline-gate`.
- Data evidence: `.ttm-1/stability.json`, `today.json`, `today-before-hysteresis.json`, `coverage.json`, `history-report.json`, `publish-diff.json`.
- All staging scripts block network fetches. EODHD fetch spend for this task: zero. No keys were printed. Disk was checked throughout with a conservative 4-GiB stop floor; no crossing occurred.

No push or deploy was performed. The report is also committed at `.superpowers/sdd/2026-09-29-value/ttm-1-report.md` in this worktree and copied to the exact owner-requested path in the `value` worktree.
