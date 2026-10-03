# Nightly 4 — KEEP HOLD

**KEEP HOLD.** Final local replay: **106 quality flips; 12 filing-backed (sampled), 94 UNEXPLAINED** under the release-approval standard. Of those blockers, **19 cannot reproduce the released numeric verdict** from retained source bodies; the others have a two-way input counterfactual but lack complete source-lineage/filing approval. The zero-UNEXPLAINED target is not achieved. The requested commit title is the task label, not a claim of completion.

**32 missing-history verdict regressions fixed**, covering the original six all-`n/a` companies (30 tests) plus Genesis management/economics (two false improvements). LG Chem's false management improvement also disappears. Final compared cohort: **0 verdicts regressed to n/a; 4 company/test fiscal-window loss signals (three rolling-window changes, one unexplained)**. Retaining usable history does not certify every retained source value, particularly EMEIS's recapitalization basis. Dossiers: **2708 → 2708**, removed **0**, added **0**. Nothing was published remotely; `publish.hold` is unchanged.

## Attribution tool and evidence limits

`lib/value/verdict-attribution.ts` recomputes the real numeric tests, exchanges fiscal rows by year, and tests both old→new and new→old substitutions. It checks shares, EPS, book, profit, OCF/lease/SBC, revenue, capital spending, balance-sheet inputs, distributions, prices, currencies, fiscal sets, classification and rule code. It searches single groups, pairs, then reduces interacting groups and fields to an irreducible sufficient set. This is not a claim that the set is unique. Every changed field includes old/new values and provenance; inputs are content-addressed and saved in `nightly-4-inputs.json.gz`.

`scripts/value/attribute-nightly-verdicts.ts` covers all 139 original flips and any additional final flips. Historical numeric code from pipeline 19 (`a536855`), 20 (`2cd70b1`) and 22 (`dc5dd86`) is replayed where applicable, with a complete source-hash manifest. All final new numeric verdicts reproduce. Jev changes and numeric/final results are recorded separately; no Jev-only cause explains this cohort.

Released dossiers preserve direct public series, not complete release-time normalized inputs. The tool labels every reconstructed baseline, records its provenance and exact metric mismatches, and refuses an attribution if the released verdict cannot be reproduced. Reconstructing a matching verdict does not establish byte-identical historical inputs. In the original cohort, 87 baselines also match every comparable published metric; 33 other reproduced verdicts have metric differences. **Missing source bodies cannot be recovered from their hashes, and are never relabelled vendor restatements.** The original counterfactual ledger is retained alongside the corrected final ledger so resolved regressions remain auditable.

## Corrections and filing checks

- Secondary completion now checks whether replacement share observations invalidate previously usable history. If they do, it retains the coherent prior share/EPS batch and provenance, records rejected values and sources, and preserves independent new cash facts. Already invalid prior data is not blessed. The existing refresh safeguard remains in force.
- **MCC:** use filed weighted ordinary shares and common income instead of parent profit divided by ordinary EPS. **LG Chem:** separate ordinary and preferred shares. **KMD / PDI:** convert filed weighted share counts onto completed consolidation bases. KMD's explicitly documented post-period action can be reconciled even when old EPS is absent.
- **Genesis:** issuer EPS notes across FY2008–22 replace repeated recent share counts with real weighted observations on the 1-for-10 basis. All 19 annual periods survive, actual issuance remains, and both false improvements disappear.
- **Idemitsu / Tractor Supply:** mixed old comparative split bases caused further fiscal-history loss. Idemitsu retains all 14 years and real merger issuance; Tractor Supply retains 30 unique years. Its FY2008 share units and FY2008–21 split normalization are corrected, with actual FY2008/09 dates and inventory-accounting restatements kept explicit. Older cached SEC/EDINET denominators remain labelled source-derived where only the action itself is checked against a filing.
- **Develop:** FY2026 was real, but inferred SBC zero was false. Filed SBC, OCF, capex and consolidated income replace the bad inputs. Accounting still passes under the existing rule, now with its compensation red flag.
- **SSP:** all five FY2021–25 consolidated income, OCF, capex, lease-cash and SBC observations are reconciled to filings. Five-year consolidated income is -GBP234.8m and post-capex/lease/SBC cash is GBP185.3m. Cash conversion passes; ROIIC is still zero, so economics fails. This fixes the input basis without restoring the old pass by fiat.

| Requested class | Samples and disposition |
|---|---|
| Split/consolidation basis | WSM, Hyundai Glovis, KMD checked against cached EODHD actions and issuer documents; PDI and TSCO also checked. WSM/Glovis mechanisms are filing-backed (sampled); KMD/PDI inputs were wrong and corrected. TSCO share units/bases and duplicate-period risk were corrected, but its old economics verdict remains unreproduced. Prior Meiji/Shionogi/Denso issuer checks carry forward with reproduced counterfactuals; Japanese EODHD actions were absent from this preserved corpus. No blanket approval of unverified share/price rows. |
| New fiscal year | Close Brothers, Micron, Develop: three issuer checks. Close/Micron data agree; Develop inputs corrected, final pass survives. Remaining intended new-year changes are filing-backed (sampled). |
| Missing-data regression | MCC, KMD, PDI filing samples expose wrong bases; all corrected. Taihan/IAG/EMEIS retain prior coherent history; Genesis additionally repaired from annual filings. Zero remaining cohort verdict-to-n/a losses; additional fiscal-window signals remain blocked below. |
| Unit/currency/basis | LG Chem ordinary/preferred units, MCC ordinary/perpetual profit denominator, SSP parent/consolidated cash and lease basis checked and corrected. No standalone reporting-currency flip is certified. |
| Rule-version difference | Old rule versions were actually executed. Classification and older-year coverage changes are recorded, but this class is **not fully filing-approved**: Credit Saison lending classification is supported; its full common-book/dividend window remains blocked. |
| Newly completed financial inputs | AXP, Morgan Stanley, Wells Fargo FY2024/25 expense and net-revenue inputs match issuer statements. New efficiency checks are filing-backed (sampled). This is a coverage cause, not evidence of vendor restatement. |
| Vendor restatement | No such claim is proved from before/after vendor bodies. Unverified source changes remain blockers; there are no three certified members to sample. |

See `nightly-4-filing-reviews.json` for every sample, source URL, exact observations and decisions. Key sources:

- **601618.SHG**: [issuer document 1](https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0417/2026041700852.pdf), [issuer document 2](https://www.hkexnews.hk/listedco/listconews/sehk/2025/0422/2025042200817.pdf).
- **051910.KO**: [issuer document 1](https://www.lgchem.com/upload/file/audit-report/LG_Chem_FY2025_4Q_K-IFRS_Eng_Consoliated_Audit_report%5B0%5D.PDF), [issuer document 2](https://www.lgchem.com/upload/file/audit-report/LG_Chem_FY2023_Consolidated_Audit_Report_ENG_updated.pdf).
- **KMD.AU**: [issuer document 1](https://www.nzx.com/announcements/475499), [issuer document 2](https://company-announcements.afr.com/asx/kmd/b356e819-98c7-11f0-a9c5-e67b34444083.pdf).
- **PDI.AU**: [issuer document 1](https://wp-predictivediscovery-2024.s3.eu-west-2.amazonaws.com/media/2025/10/FY25-Annual-Report.pdf), [issuer document 2](https://www.globenewswire.com/news-release/2026/08/24/3349505/0/en/name-change-and-consolidation-approved.html).
- **GMD.AU**: [issuer document 1](https://www.annualreports.com/HostedData/AnnualReportArchive/g/ASX_GMD_2009.pdf), [issuer document 2](https://www.annualreports.com/HostedData/AnnualReportArchive/g/ASX_GMD_2010.pdf), [issuer document 3](https://www.annualreports.com/HostedData/AnnualReportArchive/g/ASX_GMD_2012.pdf), [issuer document 4](https://www.annualreports.com/HostedData/AnnualReportArchive/g/ASX_GMD_2014.pdf), [issuer document 5](https://www.annualreports.com/HostedData/AnnualReportArchive/g/ASX_GMD_2016.pdf), [issuer document 6](https://www.annualreports.com/HostedData/AnnualReportArchive/g/ASX_GMD_2017.pdf), [issuer document 7](https://www.asx.com.au/asxpdf/20180918/pdf/43yfmt2527lqjs.pdf), [issuer document 8](https://announcements.asx.com.au/asxpdf/20200925/pdf/44n1052jj3zpzn.pdf), [issuer document 9](https://www.annualreports.com/HostedData/AnnualReportArchive/g/ASX_GMD_2022.pdf).
- **5019.JP**: [issuer document 1](https://www.idemitsu.com/jp/news/2024/240514_4_en.pdf), [issuer document 2](https://www.idemitsu.com/jp/ir/library/shell/news/shell_101603_en.pdf).
- **TSCO.US**: [issuer document 1](https://www.sec.gov/Archives/edgar/data/916365/000091636524000117/tsco-20241219.htm), [issuer document 2](https://www.sec.gov/Archives/edgar/data/916365/000091636511000013/tractorsuppy10kfeb232011.htm), [issuer document 3](https://www.sec.gov/Archives/edgar/data/916365/000091636513000027/a08292013-stocksplit8k.htm).
- **SSPG.LSE**: [issuer document 1](https://www.foodtravelexperts.com/media/sinnxjj2/ssp-annual-report-and-accounts-2022.pdf), [issuer document 2](https://www.foodtravelexperts.com/media/pdxhbe3v/ssp-ar_financials_2023.pdf), [issuer document 3](https://www.foodtravelexperts.com/media/q11pqu5h/ssp-group-plc_annual-report-and-accounts_2025.pdf).
- **DVP.AU**: [issuer document 1](https://www.develop.com.au/), [issuer document 2](https://wcsecure.weblink.com.au/pdf/DVP/03140972.pdf).
- **CBG.LSE**: [issuer document 1](https://www.investegate.co.uk/index.php/announcement/rns/close-brothers-group--cbg/preliminary-results/9795269).
- **MU.US**: [issuer document 1](https://micron.gcs-web.com/node/50991).
- **AXP.US**: [issuer document 1](https://www.sec.gov/Archives/edgar/data/4962/000000496226000037/q425exhibit992.htm).
- **MS.US**: [issuer document 1](https://www.morganstanley.com/content/dam/msdotcom/en/about-us-ir/shareholder/10k2025/10k1225.pdf).
- **WFC.US**: [issuer document 1](https://www.wellsfargo.com/assets/pdf/about/investor-relations/annual-reports/2025-annual-report.pdf).

## Replay, diff and guards

- First full analysis attempted all 38,056 jobs: 38,053 written, three transient failures (`089230.KQ`, `8GW.IR`, `CDT.AU`). The second unfiltered process exited 0 but did not print a completion summary and initially left two version-24 records, so exit status alone was not accepted. Targeted retries and corrected-company replays completed with zero failures. Final independent coverage: **38,056 version-25 analyses**, zero missing analyses/fingerprints/stale member snapshots. One already-insufficient member (`457190.KO`) has an explicitly empty snapshot.
- Normal business backfill: 100 processed, cached text, Jev enabled, exit 0. Its remaining narrative research queue is reported in the log and is not claimed complete. Final fresh local export used `--out=.fix5c/nightly-4/after-final-3`, exit 0, no remote action. Publisher removal guard remained enabled.
- **10 test files / 161 tests pass**, including failing-then-passing regressions for destructive share replacement, issuer denominator fixes, GMD history preservation, SSP cash/lease basis and DVP compensation. Focused TypeScript check and `git diff --check` pass. Full repository test suite is not claimed.
- Frozen live baseline: 5,081 files unchanged. Published-source inventory: 26801 checked, 0 changed. Guarded replay network dispatches: {'api.typesafe.ai': 242}. EODHD calls: 0; existing EODHD actions were used. Issuer filing research was read-only and separate. No keys printed, no subagents, no push/deploy/remote publication.
- Hold SHA-256: `a5defda8067e82dee447d696da4a00975a7e05fe1b5a785a8f1059ccf7a6de0e`. Disk remained above the 4 GiB stop threshold; final evidence records free bytes.
- Exact JSON diff: **604,542 raw changed leaves**, **240,821 exactly proved quote/history-price exclusions**, **363,721 residual changes**. The exact-diff process returns 1 because changes exist; this is an inventory result, not a successful equality claim. No numeric tolerance or blanket financial-field exclusions.
- Same-FY public-series numeric→null observations: **105**; all-published history-start losses: **11**. These broader loss signals remain in machine-readable evidence; zero cohort quality regressions does not mean every public series gap is approved.
- Newly included dossiers: none. No added-dossier review exemption is assumed.

## Remaining blockers

1. **94 final flips remain UNEXPLAINED for release approval.** 19 cannot reproduce the old numeric verdict. The other 75 have sufficient input counterfactuals but incomplete source/filing evidence; a changed `marketCap` series alone does not prove a split or correct denomination.
2. Before/after normalized source bodies for the older release are unavailable for the unreproduced cases. Current vendor data or arithmetic reverse-engineering cannot substitute for missing historical evidence. Recover archived release-time bodies or reconstruct the complete affected statement windows from filings, keeping each inference explicit.
3. EMEIS's actual recapitalization must be separated from its reverse split before its retained per-share history is certified. The safeguard restores availability, not a blanket assertion that old shares are correct. Credit Saison's full common-book/dividend window and other unverified price/retained-earnings series remain open.
4. The broader null-series ledger and history-start losses still need review. Four of 11 history-start changes are 30-year rolling windows after a new year; seven lose earlier observations without a matching new fiscal year (EQNR, 4043.JP, 3457.JP, EVN, NTRS, AENA, HMSO). The 3457.JP loss overlaps the flip cohort: FY2013 is missing from the normalized baseline too, so counterfactual coverage alone could conceal it. These are additional blockers; zero missing-data regressions across all published history is **not established**.

The requested targets are only partially achieved: the six all-n/a cases and Genesis false improvements are repaired; other history-loss signals remain open; every original flip has a recorded disposition and counterfactual attempt; **not every flip has an evidence-backed final cause**. Recommendation: **KEEP HOLD**.

## Every remaining verdict change Miki would see

| Company | Test | Live → final | One-line cause / disposition |
|---|---|---|---|
| 002236.SHE — Zhejiang Dahua Technology Co Ltd | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 086280.KO — Hyundai Glovis | management | fail → pass | Market-cap series alone: gain 1.9575e+12 → 7.750965e+12, retained earnings 6.5949155e+12; source/basis approval sampled. **FILING-BACKED (sampled)** |
| 1093.HK — CSPC Pharmaceutical Group Ltd | management | fail → pass | Market-cap series alone: gain -2,915,805.3 → 3.086339e+10, retained earnings 1.9201422e+10; source/basis approval pending. **UNEXPLAINED** |
| 138040.KO — Meritz Financi | management | pass → fail | Market-cap series alone: gain 1.7490411e+13 → 1.860403e+13, retained earnings 8.2799262e+12; source/basis approval pending. **UNEXPLAINED** |
| 139130.KO — Dgb Financial | management | pass → fail | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 2269.HK — WuXi Biologics | management | fail → pass | Market-cap series alone: gain -3.2462e+10 → 6.3983764e+10, retained earnings 2.0365871e+10; source/basis approval pending. **UNEXPLAINED** |
| 2269.JP — Meiji Holdings Co., Ltd. | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; issuer sample supports cause. **FILING-BACKED (sampled)** |
| 2413.JP — M3, Inc. | management | pass → fail | Market-cap series alone: gain 6.3966215e+11 → 1.92463e+11, retained earnings 2.70957e+11; source/basis approval pending. **UNEXPLAINED** |
| 267270.KO — Hyundai Construction Equipment Co Ltd | management | pass → fail | Market-cap series alone: gain 1.3997416e+12 → -1.6044634e+12, retained earnings 6.4838888e+11; source/basis approval pending. **UNEXPLAINED** |
| 300124.SHE — Shenzhen Inovance Tech | management | pass → fail | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 3092.JP — ZOZO, Inc. | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 3457.JP — &Do Holdings Co.,Ltd. | management | pass → fail | Market-cap series alone: gain 1.1622348e+10 → 4.3810714e+09, retained earnings 1.0086462e+10; source/basis approval pending. **UNEXPLAINED** |
| 3659.JP — NEXON Co., Ltd. | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 4208.JP — UBE Corporation | understandable | pass → fail | Fiscal window 2018–2026 → 2014–2026; exchanging the window reproduces both verdicts. **UNEXPLAINED** |
| 4507.JP — Shionogi & Co.,Ltd. | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; issuer sample supports cause. **FILING-BACKED (sampled)** |
| 4751.JP — CyberAgent,Inc. | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 5019.JP — Idemitsu Kosan Co.,Ltd. | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 5713.JP — Sumitomo Metal Mining Co., Ltd. | management | fail → pass | Market-cap series alone: gain 6.5629062e+11 → 1.5297833e+12, retained earnings 6.95587e+11; source/basis approval pending. **UNEXPLAINED** |
| 5714.JP — DOWA HOLDINGS CO.,LTD. | management | fail → pass | Market-cap series alone: gain -6.6700001e+11 → 2.8234554e+11, retained earnings 2.06833e+11; source/basis approval pending. **UNEXPLAINED** |
| 600000.SHG — Shanghai Pudong Development Bank Co Ltd | management | pass → fail | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 600089.SHG — Tbea Co Ltd | management | pass → fail | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 600426.SHG — Shandong Hualu Hengsheng Chemical Co Ltd | management | pass → fail | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 600875.SHG — Dongfang Electric Corp Ltd Class A | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 601066.SHG — China Securities Co Ltd | management | pass → fail | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 601169.SHG — Bank of Beijing Co Ltd | management | pass → fail | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 601229.SHG — Bank of Shanghai Co Ltd | management | pass → fail | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 601788.SHG — Everbright Securities Co Ltd | management | pass → fail | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 601988.SHG — Bank of China Limited | management | pass → fail | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 601998.SHG — China Citic Bank Corp Ltd Class A | management | pass → fail | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 6902.JP — DENSO CORPORATION | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; issuer sample supports cause. **FILING-BACKED (sampled)** |
| 6963.JP — ROHM COMPANY LIMITED | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 6971.JP — KYOCERA CORPORATION | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 6988.JP — NITTO DENKO CORPORATION | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 7012.JP — Kawasaki Heavy Industries,Ltd. | understandable | pass → fail | Counterfactual fields operatingIncome, revenue reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 7267.JP — HONDA MOTOR CO., LTD. | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 7269.JP — suzuki motor corporation | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 7936.JP — ASICS Corporation | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 7951.JP — YAMAHA CORPORATION | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 8015.JP — TOYOTA TSUSHO CORPORATION | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 8253.JP — Credit Saison Co.,Ltd. | management | fail → pass | Classification changes the applicable tests; frozen normalized source (not necessarily release-time). Full financial-basis approval pending. **UNEXPLAINED** |
| 8253.JP — Credit Saison Co.,Ltd. | accounting | fail → pass | Classification changes the applicable tests; frozen normalized source (not necessarily release-time). Full financial-basis approval pending. **UNEXPLAINED** |
| 8253.JP — Credit Saison Co.,Ltd. | economics | fail → pass | Classification changes the applicable tests; current memo observations; historical source snapshot unavailable. Full financial-basis approval pending. **UNEXPLAINED** |
| 8697.JP — Japan Exchange Group, Inc. | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 9009.JP — Keisei Electric Railway Co., Ltd. | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 9020.JP — East Japan Railway Company | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 9101.JP — Nippon Yusen Kabushiki Kaisha | management | pass → fail | Fiscal window 2018–2026 → 2017–2026; exchanging the window plus marketCap reproduces both verdicts. **UNEXPLAINED** |
| 9202.JP — ANA HOLDINGSINC. | economics | fail → pass | Fiscal window 2018–2026 → 2014–2026; exchanging the window reproduces both verdicts. **UNEXPLAINED** |
| 9433.JP — KDDI CORPORATION | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| 9532.JP — OSAKA GAS CO.,LTD. | understandable | pass → fail | Fiscal window 2018–2026 → 2014–2026; exchanging the window reproduces both verdicts. **UNEXPLAINED** |
| 9735.JP — SECOM CO., LTD. | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| AMCR.US — Amcor PLC | economics | pass → fail | UNEXPLAINED: old verdict not reproduced; historical operands missing for roiic, nwcToRevenueTrend, nwcToRevenueChange. **UNEXPLAINED** |
| AXP.US — American Express Company | moat | pass → fail | New filed expense/revenue coverage activates the efficiency check; median 0.73104522 exceeds 0.65. **FILING-BACKED (sampled)** |
| BX.US — Blackstone Group Inc | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| CBG.LSE — Close Brothers Group plc | moat | pass → fail | Fiscal window 1997–2025 → 1997–2026; exchanging the window reproduces both verdicts. **FILING-BACKED (sampled)** |
| CBG.LSE — Close Brothers Group plc | understandable | pass → fail | Fiscal window 1997–2025 → 1997–2026; exchanging the window reproduces both verdicts. **FILING-BACKED (sampled)** |
| COALINDIA.NSE — Coal India Ltd. | management | pass → fail | Market-cap series alone: gain missing → 9.5913865e+11, retained earnings 1.00961e+12; source/basis approval pending. **UNEXPLAINED** |
| DLTR.US — Dollar Tree Inc | management | fail → pass | Counterfactual fields acquisitions reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| DVP.AU — Develop Global Ltd | accounting | fail → pass | FY2026 added; filed OCF/SBC/capex corrected. One compensation flag remains, within the accounting rule; cash backing passes. **FILING-BACKED (sampled)** |
| HBAN.US — Huntington Bancshares Incorporated | accounting | pass → fail | Counterfactual fields peerCreditLossRate reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| HDB.US — HDFC Bank Limited ADR | accounting | pass → fail | Counterfactual fields peerCreditLossRate reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| IBKR.US — Interactive Brokers Group Inc | moat | fail → pass | Counterfactual fields equity reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| INVP.LSE — Investec PLC | understandable | fail → pass | Counterfactual fields operatingIncome reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| IR5B.IR — Irish Continental Group PLC | economics | pass → fail | UNEXPLAINED: old verdict not reproduced; historical operands missing for roiic, nwcToRevenueTrend, nwcToRevenueChange, nwcToRevenueEnd. **UNEXPLAINED** |
| ITC.NSE — ITC Ltd. | management | pass → fail | Market-cap series alone: gain missing → 3.2653011e+11, retained earnings 3.8848e+11; source/basis approval pending. **UNEXPLAINED** |
| KIM.US — Kimco Realty Corporation | economics | fail → pass | UNEXPLAINED: old verdict not reproduced; historical operands missing for oeToNi, ownerEarningsTotal, roiic, nwcToRevenueEnd. **UNEXPLAINED** |
| LEN-B.US — Lennar Corporation | moat | pass → fail | UNEXPLAINED: old verdict not reproduced; historical operands missing for roicMedian, roicSecondLowest. **UNEXPLAINED** |
| LEN-B.US — Lennar Corporation | economics | fail → pass | UNEXPLAINED: old verdict not reproduced; historical operands missing for oeToNi, ownerEarningsTotal, roiic, nwcToRevenueEnd. **UNEXPLAINED** |
| LHX.US — L3Harris Technologies Inc | moat | fail → pass | Counterfactual fields revenue reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| MEGACPO.MX — Megacable Holdings S. A. B. de C. V | management | fail → pass | Market-cap series alone: gain -3.1185432e+10 → 1.3555876e+10, retained earnings 1.2298373e+10; source/basis approval pending. **UNEXPLAINED** |
| MGM.US — MGM Resorts International | economics | fail → pass | UNEXPLAINED: old verdict not reproduced; historical operands missing for oeToNi, ownerEarningsTotal, roiic, nwcToRevenueTrend, nwcToRevenueChange, nwcToRevenueEnd. **UNEXPLAINED** |
| MS.US — Morgan Stanley | moat | pass → fail | New filed expense/revenue coverage activates the efficiency check; median 0.72194218 exceeds 0.65. **FILING-BACKED (sampled)** |
| MTB.US — M&T Bank Corporation | accounting | pass → fail | Counterfactual fields peerCreditLossRate reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| MU.US — Micron Technology Inc | economics | fail → pass | Fiscal window 1997–2025 → 1997–2026; exchanging the window reproduces both verdicts. **FILING-BACKED (sampled)** |
| NDSN.US — Nordson Corporation | economics | fail → pass | UNEXPLAINED: old verdict not reproduced; historical operands missing for oeToNi, ownerEarningsTotal, roiic, nwcToRevenueTrend, nwcToRevenueChange, nwcToRevenueEnd. **UNEXPLAINED** |
| OMC.US — Omnicom Group Inc | economics | fail → pass | Counterfactual fields operatingIncome reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| OMV.VI — OMV Aktiengesellschaft | economics | pass → fail | UNEXPLAINED: old verdict not reproduced; historical operands missing for oeToNi, ownerEarningsTotal. **UNEXPLAINED** |
| ONGC.NSE — Oil & Natural Gas Corporation Ltd. | management | pass → fail | Market-cap series alone: gain missing → 1.206838e+12, retained earnings 1.79148e+12; source/basis approval pending. **UNEXPLAINED** |
| PFD.LSE — Premier Foods PLC | management | fail → pass | UNEXPLAINED: old verdict not reproduced; historical operands missing for retainedEarnings. **UNEXPLAINED** |
| PINFRA.MX — Promotora y Operadora de Infraestructura S. A. B. de C. V | management | fail → pass | Market-cap series alone: gain 1.7097939e+10 → 3.1710988e+10, retained earnings 2.4153358e+10; source/basis approval pending. **UNEXPLAINED** |
| PPG.US — PPG Industries Inc | economics | fail → pass | UNEXPLAINED: old verdict not reproduced; historical operands missing for oeToNi, ownerEarningsTotal, roiic, nwcToRevenueTrend, nwcToRevenueChange, nwcToRevenueEnd. **UNEXPLAINED** |
| PTC.US — PTC Inc | moat | fail → pass | UNEXPLAINED: old verdict not reproduced; historical operands missing for roicMedian, roicSecondLowest, capitalFallbackYears, capexToRevenue. **UNEXPLAINED** |
| RA.MX — Regional S.A.B. de C.V | management | pass → fail | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| RF.US — Regions Financial Corporation | accounting | pass → fail | Counterfactual fields peerCreditLossRate reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| SANB3.SA — Banco Santander Brasil SA ADR | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| SCHW.US — Charles Schwab Corp | moat | fail → pass | Classification changes the applicable tests; frozen normalized source (not necessarily release-time). Full financial-basis approval pending. **UNEXPLAINED** |
| SHC.LSE — Shaftesbury Capital PLC | economics | pass → fail | Counterfactual fields operatingIncome reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| SSPG.LSE — SSP Group PLC | economics | pass → fail | Filed consolidated cash/lease window restored; cash conversion passes but ROIIC is 0 and still fails. Published operating-income series changes are sufficient in both directions. **UNEXPLAINED** |
| STE.US — STERIS plc | moat | pass → fail | UNEXPLAINED: old verdict not reproduced; historical operands missing for roicMedian, roicSecondLowest. **UNEXPLAINED** |
| STE.US — STERIS plc | management | pass → fail | Fiscal window 2017–2026 → 1997–2026; exchanging the window reproduces both verdicts. **UNEXPLAINED** |
| TFC.US — Truist Financial Corp | accounting | pass → fail | Counterfactual fields peerCreditLossRate reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| TMPV.NSE — Tata Motors Passenger Vehicles Ltd. | management | pass → fail | Market-cap series alone: gain missing → -2.5414006e+11, retained earnings 8.0738e+11; source/basis approval pending. **UNEXPLAINED** |
| TPL.US — Texas Pacific Land Corporation | economics | fail → pass | UNEXPLAINED: old verdict not reproduced; historical operands missing for oeToNi, ownerEarningsTotal, nwcToRevenueTrend. **UNEXPLAINED** |
| TROW.US — T. Rowe Price Group Inc | moat | pass → fail | UNEXPLAINED: old verdict not reproduced; historical operands missing for roicMedian, roicSecondLowest. **UNEXPLAINED** |
| TSCO.US — Tractor Supply Company | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| TSCO.US — Tractor Supply Company | economics | fail → pass | UNEXPLAINED: old verdict not reproduced; historical operands missing for oeToNi, ownerEarningsTotal, roiic, nwcToRevenueTrend. **UNEXPLAINED** |
| TYL.US — Tyler Technologies Inc | moat | pass → fail | Counterfactual fields grossProfit reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| UHS.US — Universal Health Services Inc | economics | fail → pass | UNEXPLAINED: old verdict not reproduced; historical operands missing for oeToNi, ownerEarningsTotal, roiic, nwcToRevenueTrend, nwcToRevenueChange. **UNEXPLAINED** |
| UOB.F — United Overseas Bank Limited | understandable | fail → pass | Counterfactual fields operatingIncome reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| USB.US — U.S. Bancorp | accounting | pass → fail | Counterfactual fields peerCreditLossRate reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| VTRS.US — Viatris Inc | management | pass → fail | Fiscal window 2018–2025 → 1996–2025; exchanging the window reproduces both verdicts. **UNEXPLAINED** |
| VTRS.US — Viatris Inc | economics | pass → fail | UNEXPLAINED: old verdict not reproduced; historical operands missing for ownerEarningsTotal, nwcToRevenueTrend. **UNEXPLAINED** |
| WFC.US — Wells Fargo & Company | moat | pass → fail | New filed expense/revenue coverage activates the efficiency check; median 0.66672044 exceeds 0.65. **FILING-BACKED (sampled)** |
| WSM.US — Williams-Sonoma Inc | management | fail → pass | Counterfactual fields dilutedShares reproduce old/new verdicts in both directions; issuer sample supports cause. **FILING-BACKED (sampled)** |
| WTW.US — Willis Towers Watson PLC | economics | fail → pass | UNEXPLAINED: old verdict not reproduced; historical operands missing for oeToNi, ownerEarningsTotal, roiic, nwcToRevenueTrend, nwcToRevenueChange, nwcToRevenueEnd. **UNEXPLAINED** |
| WY.US — Weyerhaeuser Company | economics | pass → fail | Counterfactual fields operatingIncome reproduce old/new verdicts in both directions; source-lineage/filing approval pending. **UNEXPLAINED** |
| WYNN.US — Wynn Resorts Limited | economics | fail → pass | UNEXPLAINED: old verdict not reproduced; historical operands missing for oeToNi, ownerEarningsTotal, roiic, nwcToRevenueTrend, nwcToRevenueChange, nwcToRevenueEnd. **UNEXPLAINED** |

## Resolved original flips

| Company | Test | Live → nightly 3 → final | Cause |
|---|---|---|---|
| 001440.KO | moat | fail → na → fail | Secondary FY2022 shares 12,864,214 replaced 123,762,122.8 and discarded usable history; retain coherent prior share inputs with provenance. |
| 001440.KO | management | pass → na → pass | Secondary FY2022 shares 12,864,214 replaced 123,762,122.8 and discarded usable history; retain coherent prior share inputs with provenance. |
| 001440.KO | understandable | fail → na → fail | Secondary FY2022 shares 12,864,214 replaced 123,762,122.8 and discarded usable history; retain coherent prior share inputs with provenance. |
| 001440.KO | accounting | fail → na → fail | Secondary FY2022 shares 12,864,214 replaced 123,762,122.8 and discarded usable history; retain coherent prior share inputs with provenance. |
| 001440.KO | economics | fail → na → fail | Secondary FY2022 shares 12,864,214 replaced 123,762,122.8 and discarded usable history; retain coherent prior share inputs with provenance. |
| 051910.KO | management | fail → pass → fail | Secondary denominator included preferred shares; ordinary EPS note restores common weighted shares and removes the false market-cap/retained-earnings pass. |
| 601618.SHG | moat | fail → na → fail | Parent income divided by ordinary EPS produced 660.884bn shares; issuer EPS note supplies 20.723619bn ordinary shares and separate common income. |
| 601618.SHG | management | fail → na → fail | Parent income divided by ordinary EPS produced 660.884bn shares; issuer EPS note supplies 20.723619bn ordinary shares and separate common income. |
| 601618.SHG | understandable | pass → na → pass | Parent income divided by ordinary EPS produced 660.884bn shares; issuer EPS note supplies 20.723619bn ordinary shares and separate common income. |
| 601618.SHG | accounting | pass → na → pass | Parent income divided by ordinary EPS produced 660.884bn shares; issuer EPS note supplies 20.723619bn ordinary shares and separate common income. |
| 601618.SHG | economics | pass → na → pass | Parent income divided by ordinary EPS produced 660.884bn shares; issuer EPS note supplies 20.723619bn ordinary shares and separate common income. |
| EMEIS.PA | moat | fail → na → fail | Secondary FY2022 shares 1,071,038 replaced 64,626,000 and discarded history; retain prior coherent batch. Recapitalization basis remains a separate blocker. |
| EMEIS.PA | management | fail → na → fail | Secondary FY2022 shares 1,071,038 replaced 64,626,000 and discarded history; retain prior coherent batch. Recapitalization basis remains a separate blocker. |
| EMEIS.PA | understandable | fail → na → fail | Secondary FY2022 shares 1,071,038 replaced 64,626,000 and discarded history; retain prior coherent batch. Recapitalization basis remains a separate blocker. |
| EMEIS.PA | accounting | pass → na → pass | Secondary FY2022 shares 1,071,038 replaced 64,626,000 and discarded history; retain prior coherent batch. Recapitalization basis remains a separate blocker. |
| EMEIS.PA | economics | fail → na → fail | Secondary FY2022 shares 1,071,038 replaced 64,626,000 and discarded history; retain prior coherent batch. Recapitalization basis remains a separate blocker. |
| GMD.AU | management | fail → pass → fail | Reused recent vendor shares in FY2008–19 caused a 2020 integrity cut, disabling long-window checks; filed weighted shares /10 restore all 19 years and both failures. |
| GMD.AU | economics | fail → pass → fail | Reused recent vendor shares in FY2008–19 caused a 2020 integrity cut, disabling long-window checks; filed weighted shares /10 restore all 19 years and both failures. |
| IAG.AU | moat | pass → na → pass | Secondary FY2025 shares 8.28m replaced 2.526bn and discarded usable history; retain prior coherent share batch. |
| IAG.AU | management | pass → na → pass | Secondary FY2025 shares 8.28m replaced 2.526bn and discarded usable history; retain prior coherent share batch. |
| IAG.AU | understandable | pass → na → pass | Secondary FY2025 shares 8.28m replaced 2.526bn and discarded usable history; retain prior coherent share batch. |
| IAG.AU | accounting | pass → na → pass | Secondary FY2025 shares 8.28m replaced 2.526bn and discarded usable history; retain prior coherent share batch. |
| IAG.AU | economics | pass → na → pass | Secondary FY2025 shares 8.28m replaced 2.526bn and discarded usable history; retain prior coherent share batch. |
| KMD.AU | moat | fail → na → fail | Missing post-period 25-for-1 basis reconciliation cut history; use issuer action and filed FY2024/25 weighted diluted shares /25. |
| KMD.AU | management | fail → na → fail | Missing post-period 25-for-1 basis reconciliation cut history; use issuer action and filed FY2024/25 weighted diluted shares /25. |
| KMD.AU | understandable | fail → na → fail | Missing post-period 25-for-1 basis reconciliation cut history; use issuer action and filed FY2024/25 weighted diluted shares /25. |
| KMD.AU | accounting | pass → na → pass | Missing post-period 25-for-1 basis reconciliation cut history; use issuer action and filed FY2024/25 weighted diluted shares /25. |
| KMD.AU | economics | fail → na → fail | Missing post-period 25-for-1 basis reconciliation cut history; use issuer action and filed FY2024/25 weighted diluted shares /25. |
| PDI.AU | moat | fail → na → fail | Ordinary and 1-for-5 adjusted shares were mixed; retain history and replace FY2024/25 denominators with filed weighted shares /5. |
| PDI.AU | management | fail → na → fail | Ordinary and 1-for-5 adjusted shares were mixed; retain history and replace FY2024/25 denominators with filed weighted shares /5. |
| PDI.AU | understandable | fail → na → fail | Ordinary and 1-for-5 adjusted shares were mixed; retain history and replace FY2024/25 denominators with filed weighted shares /5. |
| PDI.AU | accounting | pass → na → pass | Ordinary and 1-for-5 adjusted shares were mixed; retain history and replace FY2024/25 denominators with filed weighted shares /5. |
| PDI.AU | economics | fail → na → fail | Ordinary and 1-for-5 adjusted shares were mixed; retain history and replace FY2024/25 denominators with filed weighted shares /5. |

## Reproduce the attribution

Archive the listed git revisions under `.fix5c/nightly-4/rules/{19,20,22}` (manifest committed), retain the frozen sources, then run:

```sh
node --import tsx scripts/value/attribute-nightly-verdicts.ts --before=.fix5c/nightly-2/live-current --after=.fix5c/nightly-4/after-final-3 --corpus=.fix5c/nightly-4/corpus --prior=.fix5c/nightly-2/frozen-inputs --original=.fix5c/nightly-3/quality-flip-ledger.json --rules=.fix5c/nightly-4/rules --out=.fix5c/nightly-4/final
```

Compressed attribution records include counterfactual outcomes, minimal fields, complete deltas, old/new reasons and metrics, exact input hashes, original-version availability and unresolved-baseline diagnostics. `nightly-4-quality-flips.json` is the readable disposition ledger.
