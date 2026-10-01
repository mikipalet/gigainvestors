# Complete data — local audit

Starting commit: da56aec. No push, deployment, remote publication, or subagents. Paid EODHD requests were disabled in all corpus, calibration, publication, build and serving commands. Unit tests exercise mocked providers.

The comparison cohort contains 19,056 pre-round analysis records. The final corpus contains 38,051. Final classifications: fail: 15,276; short history: 18,701; undecided: 3,262; pass: 812. Published dossiers: 34,731 (16,046 decided, 18,685 short-history direct URLs).

Within the original comparison cohort, final classifications are fail: 12,694; short history: 3,532; undecided: 2,157; pass: 673. The full pass also includes previously unanalyzed universe companies; their addition is separate from this comparison.

## Decisions and derivations

Seven annual periods establish history. Core rules: predictable profits require loss years and operating-margin level/variation; moat requires return median and second-lowest return; economics requires five paired owner-earnings/net-income observations; management requires the retained-dollar test or per-share earnings/book-value growth; accounting requires accruals and cash backing (cash backing for financial companies). Present supporting failures retain their thresholds; absent supporting measures are omitted.

Statement derivations cover gross profit, operating income, diluted shares from earnings/EPS, retained earnings changes, cash-flow SBC/repurchases, last-resort repurchases from shares × mean monthly price, NWC, invested capital, and explicit complete-statement zeroes. Missing statements never establish zero. Cash-flow owner earnings deduct all capital spending if depreciation or maintenance-investment detail is absent. Values retain source and derivation metadata in the private fundamentals corpus; price-derived market capitalisations, average prices and estimated repurchases are recorded in analysis/inputs/.

Explicit secondary reported facts replace inferred absence zeroes and fallback estimates, and dependent derivations are refreshed. Trusted contradictory filing evidence produces a failed test with its reason. Retained provenance: reported: 6,809,899; absent-in-complete-statement: 1,316,018; derived: 706,902; cached: 4,196,733; estimate: 251.

Direct filing facts also replace opaque legacy cached values for the exact fiscal period. Balance-sheet reconciliation repaired 834 inconsistent records, including wrong-year Daifuku assets; reported minority interests are fetched explicitly, never invented as a balancing residual.

The balance pass checked 863 inconsistent records across the expanded corpus. Yahoo returned reported minority interests for 757 of them (2,943 annual observations), with 106 empty responses and no fetch errors.

## Before / after unresolved reasons

Counts below use the same pre-round cohort. Supporting reasons disappear by design when their core test is decided. Core reason counts can rise where a formerly optional measure now requires enough observations to establish the test; these companies remain private. Near-quality means at least three passes and no failures before this round.

| Reason | Before | Near before | After | Near after |
|---|---:|---:|---:|---:|
| economics: not enough data for incremental invested capital return | 5,440 | 198 | 0 | 0 |
| management: not enough data for the $1 retained earnings test | 4,739 | 125 | 0 | 0 |
| economics: not enough data for three-year working capital averages at both ends of ten years | 4,336 | 166 | 0 | 0 |
| management: not enough data for buyback timing | 3,555 | 112 | 0 | 0 |
| management: not enough data for acquired goodwill and intangibles (proxy) and ROIC stability | 2,955 | 26 | 0 | 0 |
| economics: not enough data for owner earnings cash conversion | 2,744 | 20 | 364 | 2 |
| accounting: not enough data for five years of restructuring charges | 2,487 | 15 | 0 | 0 |
| management: not enough data for diluted share growth over five and ten years | 2,157 | 17 | 0 | 0 |
| accounting: not enough data for stock compensation to operating cash flow | 2,003 | 5 | 0 | 0 |
| accounting: not enough data for latest-year receivables to sales index (DSRI) | 1,105 | 11 | 0 | 0 |
| management: not enough data for acquisition spending and ROIC stability | 554 | 0 | 0 | 0 |
| accounting: not enough data for Sloan accruals | 253 | 4 | 280 | 5 |
| moat: not enough data for ROIC median | 229 | 1 | 94 | 0 |
| moat: not enough data for ROIC worst years | 229 | 1 | 226 | 0 |
| moat: not enough data for FY2019, FY2020 and FY2023 gross margins | 216 | 0 | 0 | 0 |
| accounting: not enough data for operating cash flow backing earnings | 203 | 4 | 227 | 5 |
| understandable: not enough data for average operating margin | 198 | 7 | 809 | 5 |
| understandable: not enough data for operating margin variation | 198 | 7 | 189 | 4 |
| understandable: not enough data for revenue declines | 85 | 0 | 0 | 0 |
| management: not enough data for the $1 test or per-share value growth | 0 | 0 | 1,119 | 24 |
| understandable: not enough data for net loss years | 0 | 0 | 1 | 0 |
| Companies with fewer than seven usable annual periods | 3,543 | 0 | 3,532 | 0 |


Formerly unresolved near-quality companies: 283. Outcomes: fail 82; pass 167; undecided 33; short history 1. Company-level comparisons are retained in ~/value-corpus/completeness/summary.json and before.json.

## Second sources

| Source | Annual data read | Empty | Other outcomes | Added values |
|---|---:|---:|---:|---:|
| Yahoo annual timeseries | 22,035 | 2,634 | 880 | 1,209,792 |
| ESEF XBRL | 946 | 2,142 | 627 | 50,969 |
| EDINET XBRL | 4,426 | 0 | 0 | 337,394 |
| SEC companyfacts | 3,304 | 299 | 68 | 869,042 |
Source statuses count the latest outcome per company/source; added values include successful retry fills. Other outcomes: ESEF XBRL: No matching LEI (623); Yahoo annual timeseries: not required after derivations (11); Yahoo annual timeseries: Unsupported Yahoo exchange: GSE (36); Yahoo annual timeseries: Unsupported Yahoo exchange: EGX (260); Yahoo annual timeseries: Unsupported Yahoo exchange: XNSA (140); Yahoo annual timeseries: Unsupported Yahoo exchange: XBOT (29); Yahoo annual timeseries: Unsupported Yahoo exchange: SEM (88); SEC companyfacts: HTTP 404 (67); Yahoo annual timeseries: Unsupported Yahoo exchange: ZSE (52); Yahoo annual timeseries: Unsupported Yahoo exchange: LUSE (24); Yahoo annual timeseries: Unsupported Yahoo exchange: XZIM (36); Yahoo annual timeseries: Unsupported Yahoo exchange: BC (79); Yahoo annual timeseries: Unsupported Yahoo exchange: DSE (22); Yahoo annual timeseries: Unsupported Yahoo exchange: MSE (17); Yahoo annual timeseries: Unsupported Yahoo exchange: USE (11); Yahoo annual timeseries: Unsupported Yahoo exchange: XNAI (67); ESEF XBRL: not required after derivations (4); Yahoo annual timeseries: Unsupported Yahoo exchange: RSE (5); Yahoo annual timeseries: Unsupported Yahoo exchange: CM (3); SEC companyfacts: not required after derivations (1).

ESEF uses exact legal-name LEI lookup when ISIN is absent. Yahoo exchange routing now includes Stuttgart, Munich, Düsseldorf, NEO, [Pakistan](https://sg.finance.yahoo.com/quote/MEBL.KA/) and [Vietnam](https://ca.finance.yahoo.com/quote/VHM.VN/).



Per-company attempts and residual fields: ~/value-corpus/completeness/attempts/. Private exclusion list: ~/value-corpus/staging/undecided.json. Normalized secondary facts are cached, with source provenance; no extra store copies were made.

Historical snapshot rows are restricted to currently eligible companies and five decided historical outcomes; historical snapshot calculations themselves were not rerun in this round.

## Named cases

Adobe (ADBE.US) was the reported ROIC bug: finite years of 342.2456% and 488.4449%, eight positive-profit/nonpositive-capital years represented as Infinity, and consequently a null serialized median. Returns now use equity-plus-debt capital when invested capital is nonpositive, or a finite “> 100%” representation when no positive denominator exists. Final Adobe median: 25.8054%; second-lowest: 16.5121%; lowest: 12.9%. All five quality tests pass, and all ten plotted returns are finite.

HVID.CO: [the issuer's 2025 annual report](https://attachment.news.eu.nasdaq.com/a1f20f8058a09419332013c250307ee4d), contents p. 2 and auditor's scope p. 24, contains income, balance and equity statements but no cash-flow statement. SEC does not cover this issuer; ESEF and Yahoo yielded no operating cash-flow observation. The core cash-backing test cannot be established; the company is private rather than shown with a gap.

6048.JP: The completed record has 105 additional numeric inputs versus the recorded starting fixture. Final result: fail.

AUQ.V: Both feeds omitted share-based payment reserves from equity. The [FY2025 audited filing](https://auqgold.com/wp-content/uploads/2025/10/AUQ_FS_2024_Q4.pdf#page=5) reports equity of CAD -950,568; the [FY2026 annual comparative](https://cdn.financialreports.eu/financialreports/media/filings/43747/2026/RNS/43747_rns_2026-07-30_27e01b76-f976-45ad-826d-3df5972605c4.pdf#page=3) reports CAD -80,884. Those direct reported totals restore both balance equations. The PDFs, extracted facts, provenance and regression fixture are retained.

LENZ.US: A previously interrupted Yahoo attempt was retried successfully (113 SEC and five Yahoo fills on the retry). The usable history remains two annual periods; its refreshed dossier remains direct-only. No transient source failures remain.

## New buy-zone names

Compared with the 19 pre-round published buy-zone names. Numbers use the local staging price snapshot, in each listing's currency. These are model outputs for audit.

| ID | Name | Currency | Price date / source | Price | Mid value | Buy price | Margin | Required margin | Expected / yr | Required / yr | Median return | OE / NI | Per-share growth |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 7079.JP | WDB coco Co., Ltd. | JPY | 2026-09-30 / quote | 2,610 | 5,039.8 | 3,779.85 | 48.21% | 25% | 10.71% | 10% | 122.54% | 0.98 | 20.2% |
| MERK.JK | Merck Tbk | IDR | 2026-09-29 / quote | 3,690 | 5,906.99 | 3,839.54 | 37.53% | 35% | 13.3% | 11.22% | 27.41% | 1.04 | 2.64% |
| 3733.JP | Software Service, Inc. | JPY | 2026-09-30 / quote | 11,500 | 22,973.98 | 17,230.49 | 49.94% | 25% | 16.64% | 10% | 23.49% | 1.03 | 13.92% |
| TROW.US | T. Rowe Price Group Inc | USD | 2026-09-29 / quote | 104.51 | 181.9 | 136.42 | 42.54% | 25% | 16.2% | 10% | 37.05% | 0.98 | 8.62% |
| MGT.BK | Megachem (Thailand) Public Company Limited | THB | 2026-09-29 / quote | 2.3 | 3.28 | 2.46 | 29.9% | 25% | 11.41% | 10% | 20.24% | 1.13 | 9.77% |
| 2163.JP | ARTNER CO.,LTD. | JPY | 2026-09-30 / quote | 948 | 1,730.66 | 1,298 | 45.22% | 25% | 12.45% | 10% | 389.9% | 0.99 | 10.83% |
| 332370.KQ | IDP Corp Ltd. | KRW | 2026-09-30 / quote | 5,340 | 12,965.9 | 8,427.83 | 58.82% | 35% | 14.86% | 10% | 18.81% | 1.01 | 30.81% |
| 264450.KQ | Ubiquoss Inc | KRW | 2026-09-30 / quote | 11,250 | 32,164.16 | 24,123.12 | 65.02% | 25% | 15.3% | 10% | 46.66% | 1.08 | 5.41% |
| 6196.JP | Strike Group Co., Ltd. | JPY | 2026-09-30 / quote | 1,394 | 3,442.26 | 2,581.7 | 59.5% | 25% | 13.8% | 10% | 69.33% | 0.97 | 8.75% |
| 1770.JP | FUJITA ENGINEERING CO.,LTD. | JPY | 2026-09-30 / quote | 2,158 | 3,296.87 | 2,472.65 | 34.54% | 25% | 10.41% | 10% | 16.97% | 0.97 | 7.29% |
| 6432.JP | TAKEUCHI MFG.CO.,LTD. | JPY | 2026-09-30 / quote | 7,300 | 11,933.72 | 8,950.29 | 38.83% | 25% | 15.54% | 10% | 22.84% | 0.97 | 13.68% |
| 2335.JP | CUBE SYSTEM INC. | JPY | 2026-09-30 / quote | 1,055 | 1,500.79 | 1,125.59 | 29.7% | 25% | 10.1% | 10% | 27.48% | 0.98 | 9.49% |
| NETBAY.BK | Netbay Public Company Limited | THB | 2026-09-29 / quote | 11.7 | 19.4 | 14.55 | 39.69% | 25% | 15.69% | 10% | 123.64% | 0.97 | 11.66% |
| VCOM.BK | Vintcom Technology PCL | THB | 2026-09-29 / quote | 3.62 | 7.22 | 4.7 | 49.89% | 35% | 15.96% | 10% | 61.02% | 1.08 | 5.96% |
| 4743.JP | ITFOR Inc | JPY | 2026-09-30 / quote | 1,610 | 2,259.8 | 1,694.85 | 28.75% | 25% | 13.07% | 10% | 39.01% | 0.96 | 14.39% |
| WTN.WAR | Wittchen SA | PLN | 2026-09-29 / quote | 11.6 | 19.24 | 12.51 | 39.71% | 35% | 15.57% | 10.45% | 21.27% | 1.19 | 5.7% |
| III.LSE | 3I Group PLC | GBX | 2026-09-29 / quote | 2,652 | 8,623.08 | 6,467.31 | 69.25% | 25% | 24.86% | 10% | 19.2% | 1 | 16.75% |
| 4641.JP | Altech Corporation | JPY | 2026-09-30 / quote | 876 | 3,037.2 | 2,277.9 | 71.16% | 25% | 21.38% | 10% | 53.78% | 1.01 | 3.41% |
| 7095.JP | Macbee Planet, Inc. | JPY | 2026-09-30 / quote | 1,150 | 2,403.27 | 1,562.13 | 52.15% | 35% | 15.26% | 10% | 156.67% | 1.02 | 23.77% |
| 5184.JP | NICHIRIN CO., LTD. | JPY | 2026-09-30 / quote | 4,190 | 6,701.15 | 5,025.86 | 37.47% | 25% | 10.95% | 10% | 19.3% | 0.97 | 3.48% |
| 4270.JP | BeeX inc. | JPY | 2026-09-30 / quote | 1,885 | 3,539.16 | 2,654.37 | 46.74% | 25% | 10.45% | 10% | 56.22% | 0.99 | 19.8% |
| 067160.KQ | AfreecaTV Co. Ltd | KRW | 2026-09-30 / quote | 36,350 | 144,522.38 | 108,391.78 | 74.85% | 25% | 20.74% | 10% | 31.37% | 1.01 | — |
| 6248.JP | Yokota Manufacturing Co., Ltd. | JPY | 2026-09-30 / quote | 1,772 | 3,331.32 | 2,498.49 | 46.81% | 25% | 12.01% | 10% | 28.56% | 0.97 | 8.37% |
| OBS.XETRA | Orbis AG | EUR | 2026-09-29 / quote | 4.7 | 7.62 | 5.71 | 38.28% | 25% | 11.42% | 10% | 42.4% | 1.66 | 8.71% |
| 126720.KO | Soosan Industries Co. Ltd. | KRW | 2026-09-30 / quote | 21,300 | 52,712.33 | 34,263.02 | 59.59% | 35% | 15.41% | 10% | 17.37% | 1.07 | 14.47% |
| 4719.JP | ALPHA SYSTEMS INC. | JPY | 2026-09-30 / quote | 3,320 | 5,388.84 | 4,041.63 | 38.39% | 25% | 12.06% | 10% | 16.27% | 1.03 | 6.88% |
| GRVY.US | Gravity Co Ltd | USD | 2026-09-29 / quote | 67.73 | 168.13 | 109.29 | 59.72% | 35% | 12.14% | 10% | 36.85% | 1.21 | — |


New buy-zone count: 27. The JSON audit also includes market-value gain and cumulative retained earnings for each name.

## Verification

- Four analysis processes: 9,513 + 9,513 + 9,513 + 9,512 = 38,051 records, zero failures; every analysis has pipeline version 16. AuQ and LENZ received final targeted refreshes.
- Calibration: truePositive 10, trueNegative 16, falsePositive 0, falseNegative 0, unclear 0; two short-history exclusions (LCID/RIVN), eight predefined exceptions.
- Unit suite: 1,214 tests in 92 files passed; all 47 focused completeness, chart and design-contract tests passed after the final chart changes. Production build and TypeScript passed.
- Local publication only: `VALUE_NO_EODHD=1 node --import tsx scripts/value/cli.ts publish --out=/Users/miki/value-corpus/staging/complete-1`.
- Exhaustive scan: all 34,731 published dossiers and 80,230 rendered evidence panels, zero forbidden phrases. Browser scan: 1,756 checks at 390 and 1728 pixels, zero matches. Search excludes HVID and LCID; HVID returns 404; LCID shows only the neutral short-history verdict.
- `design-flows.mjs`: 572 screens across 390×844, 1728×970 and 2056×1180, zero layout, scrolling, small-text or browser errors. `design-qa.mjs`: 100 screens (20 routes × five viewport sizes), zero layout issues. After the final chart-spacing changes, `completeness-layout-audit.mjs` passed 108 page/drawer checks at 390, 768 and 1728 pixels, including explicit left/right SVG-label bounds.
- Visually inspected drawers for ADBE.US, 6048.JP, INPP.LSE, 2406.TW, EL8.AU, 7547.TWO, FEV.XETRA, 7378.JP, 301217.SHE, 2007.TW and 2115.TW. HVID has no public drawer by the exclusion rule. Fixed the per-share chart headline to use the same three-year medians as its rule, made both moat thresholds explicit, and corrected extreme-axis clipping and the empty price column.
- Zero EODHD calls: September ledger content and modification time unchanged; no October usage ledger created. Source attempts have no remaining transient failures.

Logs and screenshots: `test-results/complete-1-*`, `test-results/complete-1/`, and `~/value-corpus/logs/complete-1-*`. Numerical comparisons and source audits: `~/value-corpus/completeness/summary.json`, `analysis-run.json`, `analysis-coverage.json`, `transient-residual.json` and `eodhd-final.json`.



## Disk

`df -h /` ran immediately before each of the six builds. Only `.next` was used, with no `.next-*` build copies. Minimum recorded free space across all builds: 7.20 GiB, above the 5 GiB stop threshold. The old local `.next` was removed before the first build after confirming no server used it; later builds reused the same directory. One new publication directory: `~/value-corpus/staging/complete-1`; no staging/store copies in `/tmp`. Disk evidence: `~/value-corpus/completeness/build-disk.json`.
