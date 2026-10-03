# Spin-off 1 — stopped at disk threshold

2026-10-03. Worktree: `value-zq-spinoff`. **Partial implementation; not release-ready.**

The owner required stopping with a commit when disk availability fell below 5 GB. At 11:23 UTC availability was 5,239,382,016 bytes (4.88 GiB, below the `df -h` 5G threshold); the subsequent check was 5,122,813,952 bytes (4.77 GiB). Stopped implementation, removed this task's downloaded research PDFs/text (about 45 MB), and committed the completed findability work. No build, push, deployment, remote publication, or write to `~/value-corpus/publish-repo`. `publish.hold` remains present. No subagents or API keys used. No shared chrome/UI component or stylesheet changed.

## Implemented

The normal nightly `publishSnapshot` path now distinguishes findability from a decided checklist. Companies under seven annual periods, except investment holdings without the required NAV valuation, enter search, country indexes, deferred browser views, and the All companies filter (`gate=0`). Their dossier uses the existing neutral treatment; valuation is null, status insufficient, quality flags UUUUU, buy flag false. They cannot enter Buy now or Next closest. The normal publisher generates everything; no postprocessing.

The existing exclusion file contains **77 short-history companies out of 85 exclusions**. These are the expected additional findable companies on this input. A full corpus snapshot/count comparison was not run before the disk stop. Pluxee currently has five cached annual periods (FY2021–25), explaining its absence from search and All companies; the old publisher emitted a neutral dossier but kept its identity out of search and indexes.

## Validation

Publication tests: **62 passed**, including a new end-to-end local publication test for search membership, index status, deferred browser membership, All companies inclusion, investment-list exclusion, and the neutral dossier. The regression failed on missing search membership before implementation, then passed. Existing publication tests also cover withholding investment holdings without NAV, count consistency, publication safeguards, aliases, and local publication without mutating the source repository.

Not run: full test suite, production build, full-corpus consistency audit, release gate, screenshots at 1728×970 / 2056×1180 (or other sizes). No claim of zero cut/overlap failures. No screenshots are available. No predecessor implementation is included in this checkpoint.

## Predecessor research completed, not yet applied

Pluxee: Sodexo FY2020 Universal Registration Document provides Benefits & Rewards Services FY2019 and FY2020 revenue of €892m / €773m and underlying operating profit of €276m / €202m (printed pp. 61–63 and 107). This would extend FY2021–25 to **seven periods**, adding FY2019–20. Segment figures include inter-segment revenues and use underlying operating profit, not a standalone consolidated income statement. FY2020 capex is reported as 9.1% of sales (printed p. 66); do not turn this rounded ratio into an invented precise capex figure. Segment assets/liabilities are explicitly not presented (printed p. 106).

Source: https://tracks.sodexonet.com/files/live/sites/com-global/files/02%20PDF/Finance/Sodexo-Universal-Registration-Document-FY2020.pdf

Pluxee January 2024 prospectus contains combined FY2021–23 accounts (F-1 onward, FY2021–22 from F-66). These years already exist in the cache but need explicit carve-out provenance. The appendix is scanned; inspect its pages before mapping fields. The prospectus identifies the business as Sodexo's transferred Benefits & Rewards Services segment.

Source: https://www.pluxeegroup.com/sites/g/files/jclxxe221/files/2024-01/Pluxee%20-%20Prospectus_compressed.pdf

An exploratory numeric call using cached FY2021–25 plus those two segment years produced understandable pass, moat fail (median ROIC 11.4445%, below 15%), economics pass, management undecided, accounting pass. **This is not a published/final verdict**: it did not run the completed cached-fact repairs, judgement, share reconciliation, or full analysis pipeline. The management test needs per-share history absent from the segment disclosures. Never invent parent shares or net income. The current `shortHistory` fallback masks all tests for unresolved 7–10-year dossiers, so predecessor integration must preserve confirmed results while leaving unsupported tests undecided. Do not relax thresholds or turn unknown into a failure.

Named-company scan (existing cached annual records, supplemented by the current exclusion file):

| Company | Existing years | Research status / years to add |
|---|---|---|
| Pluxee | 2021–25 | 2019–20 supported by Sodexo segment disclosure; not applied |
| GE Vernova | 2021–25 | GE 2020 annual report has Power and Renewable Energy 2018–20; reconcile perimeter, inter-segment eliminations and Energy Financial Services before applying |
| Solventum | 2020–25 | 3M 2020 annual report has 2019 Health Care segment; reconcile divested drug delivery / food safety perimeter before applying |
| Veralto | 2020–25 | Danaher 2021 annual report pp. 44, 82–83 has 2019 Environmental & Applied Solutions: sales $4,399m, operating profit $1,052m, D&A $111m, gross capex $54m, identifiable assets $4,882m; not applied |
| Sandoz | 2020–25 in analysed record (raw fundamentals only 2025) | Novartis 2020 annual report contains prior Sandoz segment information; check the completed loader before adding 2019 |
| GE HealthCare | 2019–25 | Already seven periods; no short-history extension needed |
| Kenvue | 2019–25 | Already seven periods |
| Haleon | 2019–25 | Already seven periods |
| Corebridge | 2018–25 | Already eight periods |
| Daimler Truck | 2018–25 | Already eight periods |
| Siemens Healthineers | 2015–25 | Already eleven periods |

Other short-history names that warrant predecessor research include Sandisk, Honeywell Aerospace, Qnity, Amrize, FedEx Freight, Magnum Ice Cream, Syensqo, TKMS, Kongsberg Maritime, Aumovio, Sunrise, Mandatum, Kalmar, Sony Financial, and Jio Financial. These are investigation candidates, not verified mappings.

Other primary sources found:
- GE: https://www.ge.com/sites/default/files/GE_AR20_AnnualReport.pdf
- 3M: https://investors.3m.com/financials/sec-filings/content/0001558370-21-000737/mmm-20201231x10k.htm
- Danaher: https://www.danaher.com/sites/default/files/2023-08/danaher-2021-annual-report_1.pdf
- Novartis: https://www.novartis.com/sites/novartiscom/files/novartis-annual-report-2020.pdf

## Remaining exclusion reasons

These eight records are outside the approved short-history-only inclusion. They have unresolved core evidence or the investment-holding NAV requirement. Informational buyback text is not itself a valid exclusion; the unresolved core per-share check is the reason those rows remain excluded. A predecessor extension could later resolve some, but no evidence was fabricated to do so.

- **0016.HK — Sun Hung Kai Properties Ltd**: accounting: not enough data for Sloan accruals; accounting: not enough data for operating cash flow backing earnings. Correct to retain: missing core cash-flow/accrual inputs cannot establish an accounting or cash-conversion pass.
- **006800.KO — Mirae Asset Daewoo Securities Co Ltd**: economics: not enough data for owner earnings cash conversion; accounting: not enough data for Sloan accruals; accounting: not enough data for operating cash flow backing earnings. Correct to retain: missing core cash-flow/accrual inputs cannot establish an accounting or cash-conversion pass.
- **278470.KO — APR LTD**: management: buybacks leaned toward cheaper years (informational); management: not enough data for the $1 test or per-share value growth. Correct to retain: the core retained-earnings/per-share value test cannot yet be decided; the informational buyback comment is not the blocker.
- **KBCA.BR — KBC Ancora**: economics: not enough data for owner earnings cash conversion; accounting: not enough data for Sloan accruals; accounting: not enough data for operating cash flow backing earnings. Correct to retain: missing core cash-flow/accrual inputs cannot establish an accounting or cash-conversion pass.
- **TLC.AU — The Lottery Corporation Ltd**: management: buybacks leaned toward cheaper years (informational); management: not enough data for the $1 test or per-share value growth. Correct to retain: the core retained-earnings/per-share value test cannot yet be decided; the informational buyback comment is not the blocker.
- **RF.PA — Eurazeo**: Consecutive reported NAV per share and dividend history unavailable. Correct to retain: an investment holding needs reported NAV history; ordinary equity is not a substitute.
- **088350.KO — Hanwha Life**: economics: Common book per share; economics: Parent-total proxy for preferred equity and common earnings; economics: not enough data for at least seven consecutive book observations with annual dividends; management: Common book per share; management: Parent-total proxy for preferred equity and common earnings; management: Unreported buybacks treated as zero; retained-earnings test is conservative; management: not enough data for annualized share growth excluding flagged crisis recapitalisations; management: not enough data for retained earnings versus book per share. Correct to retain: consecutive common-book/dividend, dilution, and retained-earnings observations are required for the financial-business rules.
- **TDSA.LS — Teixeira Duarte**: accounting: not enough data for Sloan accruals; accounting: not enough data for operating cash flow backing earnings. Correct to retain: missing core cash-flow/accrual inputs cannot establish an accounting or cash-conversion pass.

## Short-history addition inventory (77)

- SPCX.US — Space Exploration Technologies Corp. Class A Common Stock: Only 3 annual periods; 7 required.
- ARM.US — Arm Holdings plc American Depositary Shares: Only 6 annual periods; 7 required.
- SNDK.US — Sandisk Corp: Only 5 annual periods; 7 required.
- GEV.US — GE Vernova LLC: Only 5 annual periods; 7 required.
- 402340.KO — SK Square Co Ltd: Only 5 annual periods; 7 required.
- 373220.KO — LG Energy Solution Ltd: Only 6 annual periods; 7 required.
- ALAB.US — Astera Labs, Inc.: Only 4 annual periods; 7 required.
- HONA.US — Honeywell Aerospace Inc: Only 3 annual periods; 7 required.
- 0267.HK — Citic Pacific: Only 2 annual periods; 7 required.
- CRWV.US — CoreWeave, Inc. Class A Common Stock: Only 4 annual periods; 7 required.
- GALD.SW — Galderma Group N: Only 5 annual periods; 7 required.
- SDZ.SW — Sandoz Group AG: Only 6 annual periods; 7 required.
- RDDT.US — Reddit, Inc.: Only 6 annual periods; 7 required.
- Q.US — Qnity Electronics, Inc: Only 4 annual periods; 7 required.
- VLTO.US — Veralto Corporation: Only 6 annual periods; 7 required.
- TPRO.MI — TECHNOPROBE: Only 5 annual periods; 7 required.
- AMRZ.US — Amrize Ltd: Only 5 annual periods; 7 required.
- FDXF.US — FedEx Freight Holding Company, Inc.: Only 4 annual periods; 7 required.
- CVC.AS — CVC Capital Partners PLC: Only 5 annual periods; 7 required.
- SOLV.US — Solventum Corp.: Only 6 annual periods; 7 required.
- 688271.SHG — Shanghai United Imaging Healthcare Co. Ltd. A: Only 6 annual periods; 7 required.
- VAR.OL — Var Energi ASA: Only 5 annual periods; 7 required.
- MICC.AS — The Magnum Ice Cream Company N.V.: Only 4 annual periods; 7 required.
- VSURE.ST — Verisure Plc: Only 4 annual periods; 7 required.
- S3Z.F — Ascendas Real Estate Investment Trust: Only 6 annual periods; 7 required.
- SYENS.BR — Syensqo: Only 6 annual periods; 7 required.
- ZAB.WAR — Zabka Group S.A.: Only 5 annual periods; 7 required.
- 443060.KO — HD Hyundai Marine Solution: Only 5 annual periods; 7 required.
- 601059.SHG — Cinda Securities Co. Ltd. A: Only 5 annual periods; 7 required.
- LTMC.MI — LOTTOMATICA GROUP: Only 5 annual periods; 7 required.
- 0126Z0.KO — SAMSUNG EPISHOLDINGS CO LTD: Only 1 annual periods; 7 required.
- TKMS.XETRA — TKMS AG & Co KGaA: Only 4 annual periods; 7 required.
- KMAR.OL — KONGSBERG MARITIME ASA: Only 4 annual periods; 7 required.
- SIGMAFA.MX — Sigma Foods, S.A.B. de C.V.: Only 5 annual periods; 7 required.
- OCTV-SDB.ST — Octave Intelligence PLC: Only 3 annual periods; 7 required.
- IOS.DU — IONOS Group SE: Only 4 annual periods; 7 required.
- ZEG.LSE — Zegona Communications Plc: Only 2 annual periods; 7 required.
- 064400.KO — LG CNS: Only 5 annual periods; 7 required.
- 062040.KO — Sanil Electric Co., Ltd.: Only 4 annual periods; 7 required.
- R3NK.XETRA — Renk Group AG: Only 6 annual periods; 7 required.
- AMVIF.US — Aumovio SE: Only 4 annual periods; 7 required.
- ROSE.LSE — Rosebank Industries PLC: Only 2 annual periods; 7 required.
- TLX.AU — TELIX Pharmaceuticals Ltd: Only 4 annual periods; 7 required.
- 600732.SHG — Shanghai Xinmei Real Estate Co Ltd Class A: Only 6 annual periods; 7 required.
- SUNN.SW — SUNRISE N: Only 5 annual periods; 7 required.
- 454910.KO — Doosan Robotics Inc.: Only 5 annual periods; 7 required.
- EXENS.PA — EXOSENS PROM: Only 6 annual periods; 7 required.
- MANTA.HE — Mandatum Oyj: Only 6 annual periods; 7 required.
- 360.AU — LIFE360 Inc: Only 6 annual periods; 7 required.
- KALMAR.HE — Kalmar: Only 5 annual periods; 7 required.
- 022100.KO — POSCO ICT Co. Ltd.: Only 6 annual periods; 7 required.
- IWG.LSE — IWG PLC: Only 4 annual periods; 7 required.
- 375500.KO — DL E&C Co Ltd: Only 5 annual periods; 7 required.
- PLX.PA — PLUXEE NV: Only 5 annual periods; 7 required.
- 450080.KO — ECOPRO MAT: Only 5 annual periods; 7 required.
- 383220.KO — F&F Co., Ltd.: Only 5 annual periods; 7 required.
- RPI.LSE — Raspberry Pi Holdings PLC: Only 4 annual periods; 7 required.
- 457190.KO — ISU Specialty Chemical Co. Ltd.: Only 0 annual periods; 7 required.
- 483650.KO — d'Alba Global: Only 3 annual periods; 7 required.
- GNZ.NZ — Goodman NZ Ltd & Goodman Property Services Ltd (NS) Stapled Security: Only 4 annual periods; 7 required.
- BRAV3.SA — 3R Petroleum Oleo E Gas SA Ordinary Shares: Only 5 annual periods; 7 required.
- HDN.AU — Homeco Daily Needs REIT: Only 6 annual periods; 7 required.
- PRN.LSE — Princes Group plc: Only 4 annual periods; 7 required.
- APN.LSE — Applied Nutrition Plc: Only 4 annual periods; 7 required.
- MNO.LSE — Meridian Mining Plc: Only 5 annual periods; 7 required.
- ATG.LSE — Auction Technology Group PLC: Only 4 annual periods; 7 required.
- DBV.PA — DBV Technologies S.A.: Only 6 annual periods; 7 required.
- PYIYF.US — Property For Industry Ltd.: Only 2 annual periods; 7 required.
- 034230.KO — PARADISE LTD: Only 5 annual periods; 7 required.
- THG.LSE — THG Holdings PLC: Only 5 annual periods; 7 required.
- ATO.PA — Atos SE: Only 1 annual periods; 7 required.
- 543A.JP — ARCHION Corporation: Only 1 annual periods; 7 required.
- 6526.JP — Socionext Inc.: Only 6 annual periods; 7 required.
- 8729.JP — Sony Financial Group Inc.: Only 5 annual periods; 7 required.
- ETERNAL.NSE — Eternal Ltd.: Only 5 annual periods; 7 required.
- JIOFIN.NSE — Jio Financial Services Ltd.: Only 4 annual periods; 7 required.
- NESTLEIND.NSE — Nestle India Ltd.: Only 2 annual periods; 7 required.

## Resume requirements

1. Implement source-controlled predecessor facts with per-year parent, segment, basis, source and per-field provenance; integrate in `completeCachedYears` before integrity/analysis/history fingerprinting. Keep absent inputs null.
2. Label supported predecessor years in existing evidence drawers without changing the shell/width or adding sections.
3. Apply verified mappings, analyse through the normal pipeline, and produce a local snapshot only. Reconcile Pluxee’s real verdict with undecided management evidence.
4. Run full relevant tests, corpus consistency audit, local build only in `.next`, release gate at four viewports, inspect screenshots, and include the owner-size Pluxee screenshots. Keep publish hold and never write the publish repository.
