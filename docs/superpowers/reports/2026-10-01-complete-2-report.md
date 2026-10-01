# Complete data round 2 — 2026-10-01

Base: `61f79ea`; branch/worktree: `value-m-design`. Local-only release: `/Users/miki/value-corpus/staging/release-8`.

**Overall target met using the requested 2,716-member denominator:** 54 counted residuals / 2,716 = **1.988%**, down from 597 / 2,716 = 21.981%. There are also 32 documented recent-company history exceptions. All ten priority indexes have zero counted residuals.

The final publication has 2,630 decided index members. Of the other 86 original index members, 79 have neutral history dossiers and 7 lack a published dossier. The seven include SAIN.LSE, a pooled investment vehicle excluded by the existing publisher classification; it is counted conservatively as a residual here, not treated as a recent-company exception. Before publication this case was numerically decided, which made an earlier analysis-only count one too low. Removing the 32 recent-company exceptions from the denominator as well would produce 54 / 2,684 = 2.012%; the percentage above uses all original index members.

No previously decided company became undecided. There were no subagents, pushes, deployments, remote publication or revalidation. All builds used `.next`; the existing release-8 directory was reused. Final observed free disk space: approximately 6.6 GiB.

## Decisions and source repairs

- Numeric decisions depend on checks, never informational prose. A sufficient observed failure remains a failure when an unrelated input is missing; missing observations do not become passes. Uber now has five decided quality tests (FFFPP).
- Negative-equity companies use per-share growth and asset-based accruals. Where parent cash allocation is undefined, cash conversion compares consolidated free cash flow after all capital expenditure with consolidated income. AutoZone passes all five quality tests.
- Operating income is recovered from explicit operating-income/EBIT lines, or a labelled pretax-profit-plus-interest EBIT proxy. Zoetis passes all five quality tests.
- Banks and insurers use parent-total capital/earnings proxies where common-capital detail is absent. Capital compounding and dilution use the actual consecutive observation interval, with at least seven annual periods; no fabricated decade is displayed. Explicit reported dividends per share, including a declared zero, complete capital-return tests.
- Annual dates handle 52/53-week years, duplicate provider period ends and issuer-confirmed changes of balance date. Consecutive per-share windows retain the latest endpoint and never skip an interior missing observation.
- Currency repairs require issuer evidence or corroborating independent amounts; declared presentation-currency translations use separate flow and closing rates. Balance repairs replace coherent reported totals together. SEC cache lookup accepts both padded and unpadded CIK filenames.
- Monthly price histories now reconcile declared forward/reverse splits only when adjacent closes corroborate the factor and consecutive annual share observations already use the restated basis. The original cache is preserved; already adjusted prices and actual dilution remain unchanged. Five new regression tests cover this distinction. The rule corrected 52 histories, including Rightmove.
- Corporate-action evidence preserves real issuance/dilution, handles split-adjusted comparative shares and retains legal-predecessor history where the economic business continues. Cancelled common capital is an explicit management failure.
- ESEF parent totals, EDINET structured/text statements, SEC annual foreign-issuer 6-K facts, Indian standalone filings and secondary listings recover actual historical observations. The committed issuer-facts table has 525 dated source observations for 146 issuers, containing 1,741 field values.
- Budweiser APAC illustrates the currency check: the provider’s HKD-converted 2019–2021 statements were replaced with USD issuer observations, including 2021 parent profit of US$950 million and 13,232,321,677 diluted shares. Labels alone were not treated as a conversion.
- Current share checks restored price panels for all quality-pass companies. AutoZone, Zoetis and Exor reconcile with independent provider/filing observations. Manual issuer observations complete Interpump, De’Longhi, Ferrari and McCormick. A publication regression now passes the verified-share flag into the NAV valuation guard, avoiding suppression caused by stale market capitalization.

## Reported NAV

Investor AB, Industrivarden, Exor and SoftBank use issuer-reported annual NAV/share observations with dated sources, evidence and explicit split/currency basis. Jev extraction jobs and answers are retained in `complete-2/nav-jobs.json` and `complete-2/nav-jev.json`; the committed facts carry the reviewed observations. The valuation uses NAV directly, without adding cash/debt again or re-denominating reported NAV/share with a current share count.

| Issuer | Latest NAV/share | Annual return interval | Source |
| --- | ---: | ---: | --- |
| INVE-B.ST | SEK 355.00 | 9 years | [Issuer evidence](https://www.investorab.com/investors-media/financials/key-figures) |
| INDU-C.ST | SEK 444.00 | 10 years | [Issuer evidence](https://www.industrivarden.se/globalassets/arsredovisningar/engelska/2025.pdf) |
| EXO.AS | EUR 164.40 | 10 years | [Issuer evidence](https://www.exor.com/sites/default/files/2026/page-documents/Historical%20Net%20Asset%20Value%20%28NAV%29%2031%20December%202025_0.xlsx) |
| 9984.JP | JPY 7,029.00 | 6 years | [Issuer evidence](https://group.softbank/media/Project/sbg/sbg/pdf/ir/financials/annual_reports/annual-report_fy2026_en.pdf) |

NAV windows require at least seven consecutive annual observations and annualize over the actual six-to-ten-year interval. The existing 12% return cap, 15% NAV discount and 10% expected-return requirements remain. SoftBank’s 2020 point is calculated from the issuer’s reported shareholder value divided by issued shares less treasury shares, then adjusted for its later split.

## Before and after by index

Index memberships overlap. “After” includes recent-company exceptions and the publisher-excluded SAIN.LSE; “Counted” removes only the 32 documented recent-company exceptions.

| Index | Members | Before | After | Recent exceptions | Counted |
| --- | ---: | ---: | ---: | ---: | ---: |
| AEX | 29 | 3 | 2 | 2 | 0 |
| ATX | 20 | 3 | 0 | 0 | 0 |
| BEL 20 | 20 | 2 | 1 | 1 | 0 |
| CAC 40 | 40 | 2 | 0 | 0 | 0 |
| CSI 300 | 298 | 10 | 3 | 0 | 3 |
| DAX 40 | 40 | 0 | 0 | 0 | 0 |
| Dow 30 | 30 | 0 | 0 | 0 | 0 |
| Euro Stoxx 50 | 50 | 3 | 0 | 0 | 0 |
| FTSE 100 | 95 | 7 | 0 | 0 | 0 |
| FTSE 250 | 163 | 68 | 9 | 1 | 8 |
| FTSE MIB | 40 | 38 | 1 | 1 | 0 |
| FTSE TWSE Taiwan 50 | 50 | 0 | 0 | 0 | 0 |
| Hang Seng | 85 | 70 | 2 | 0 | 2 |
| IBEX 35 | 35 | 2 | 0 | 0 | 0 |
| IPC | 35 | 16 | 1 | 0 | 1 |
| ISEQ 20 | 19 | 3 | 0 | 0 | 0 |
| Ibovespa | 74 | 3 | 1 | 0 | 1 |
| KOSPI 200 | 197 | 46 | 17 | 4 | 13 |
| MDAX | 50 | 5 | 4 | 2 | 2 |
| NZX 50 | 49 | 30 | 2 | 0 | 2 |
| Nasdaq-100 | 100 | 8 | 6 | 5 | 1 |
| Nifty 50 | 50 | 43 | 3 | 0 | 3 |
| Nikkei 225 | 225 | 61 | 2 | 2 | 0 |
| OBX | 25 | 8 | 2 | 1 | 1 |
| OMXC25 | 24 | 2 | 0 | 0 | 0 |
| OMXH25 | 25 | 3 | 2 | 1 | 1 |
| OMXS30 | 30 | 3 | 0 | 0 | 0 |
| PSI | 16 | 12 | 1 | 0 | 1 |
| S&P 500 | 500 | 53 | 8 | 8 | 0 |
| S&P/ASX 200 | 200 | 29 | 4 | 1 | 3 |
| S&P/TSX 60 | 60 | 4 | 0 | 0 | 0 |
| SBF 120 | 120 | 10 | 5 | 1 | 4 |
| SMI | 20 | 5 | 3 | 3 | 0 |
| STI | 30 | 25 | 1 | 0 | 1 |
| STOXX Europe 600 | 599 | 93 | 18 | 9 | 9 |
| TOPIX Core30 | 31 | 13 | 1 | 0 | 1 |
| TOPIX Large70 | 68 | 20 | 0 | 0 | 0 |

## Before and after by blocking reason

Companies can have multiple blocking classes; these columns do not sum to the member totals. Informational annotations and parent-proxy descriptions are excluded from blocking-reason counts.

| Blocking class | Before | After |
| --- | ---: | ---: |
| Cash conversion / accruals | 39 | 4 |
| Fewer than seven annual periods | 448 | 77 |
| Financial-company capital history | 27 | 1 |
| Management per-share history | 28 | 2 |
| Operating margin / return on capital | 78 | 0 |
| Other core / integrity | 35 | 0 |
| Publisher fund classification | 0 | 1 |
| Reported NAV history | 8 | 1 |

Each repaired derivation class is covered by unit tests, including informational decisions, negative equity, EBIT, parent totals, declared zero dividends, annual-period alignment, source currency, split basis, NAV periods, ESEF extraction and verified NAV publication.

## New buy-zone names

Compared with the preserved pre-round published index. All eight pass five quality tests and the published price/return requirements. GBX amounts are pence. Prices are dated September 29–30, 2026; these are model outputs, not new prices downloaded by this task.

| Company | Quote | Central value | Value range | Discount | Required discount | Buy ceiling | Expected annual return |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Zoetis Inc (ZTS.US) | USD 70.30 | 118.44 | 82.81–138.32 | 40.6% | 35% | 76.99 | 19.6% |
| Cognizant Technology Solutions Corp Class A (CTSH.US) | USD 57.44 | 86.72 | 66.30–101.00 | 33.8% | 15% | 73.71 | 15.5% |
| Lululemon Athletica Inc. (LULU.US) | USD 96.87 | 246.40 | 173.33–287.16 | 60.7% | 15% | 209.44 | 23.3% |
| Regional S.A.B. de C.V (RA.MX) | MXN 139.34 | 213.00 | 188.35–245.08 | 34.6% | 25% | 159.75 | 17.7% |
| Dunelm Group PLC (DNLM.LSE) | GBX 804.50 | 1,081.39 | 867.20–1,263.06 | 25.6% | 15% | 919.18 | 12.9% |
| Gamma Communications PLC (GAMA.LSE) | GBX 1,124.00 | 1,542.83 | 1,061.42–1,811.33 | 27.1% | 15% | 1,311.40 | 18.4% |
| Close Brothers Group plc (CBG.LSE) | GBX 416.40 | 1,918.63 | 1,534.91–2,558.18 | 78.3% | 50% | 959.32 | 24.5% |
| Copart Inc (CPRT.US) | USD 27.28 | 34.69 | 25.27–39.94 | 21.4% | 15% | 29.48 | 17.2% |

Copart becomes price-eligible after the split-basis repair and independent share-count reconciliation.

Rightmove remains in the buy zone after reconciling original monthly closes with its reported 2018 ten-for-one split and restated shares: £332.8m of market value gained versus £80.8m retained in 2016–2025. T. Rowe Price leaves the buy zone: recovered price history establishes $3.72bn gained versus $9.29bn retained, so the direct retained-profit test fails.

Published buy-zone total: **22**, versus 15 in the preserved pre-round index. Some additions were already quality-decided and became price-eligible after independent share reconciliation; Zoetis and Regional also gained complete quality decisions.

## Recent-company exceptions

These 32 are not counted as goal failures. The neutral history dossiers remain. “Reports” is the evidenced available reporting history; “Dossier” is the current retained annual-period count. Initial stub periods are identified in the assessment.

| ID / company | Reports | Dossier | Evidence and assessment |
| --- | ---: | ---: | --- |
| 0126Z0.KO — SAMSUNG EPISHOLDINGS CO LTD | 1 | 1 | First consolidated accounts cover the two-month period after the 1 November 2025 spin-off. No full annual report yet; the initial reported period is retained. [Source](https://d22332wtopc0b3.cloudfront.net/FY2025_%EA%B0%90%EC%82%AC%EB%B3%B4%EA%B3%A0%EC%84%9C%20%28%EC%97%B0%EA%B2%B0%29.pdf) |
| 375500.KO — DL E&C Co Ltd | 5 | 5 | First audited group accounts begin at the spin-off on 1 January 2021, with an opening balance sheet rather than a 2020 income period. Five full annual reports FY2021–2025. [Source](https://www.dlenc.co.kr/common/fileDownloadSecu.do?fileseq=32670&filesral=34750&nm_file_chg=fin_20227171241892.pdf) |
| 383220.KO — F&F Co., Ltd. | 5 | 5 | Fashion spin-off first accounts cover May–December 2021; four subsequent full annual reports FY2022–2025. Earlier F&F Holdings accounts are a different group. [Source](https://englishdart.fss.or.kr/dsbh002/viewer.do?rcpNo=20220317001143) |
| 402340.KO — SK Square Co Ltd | 5 | 5 | SK Telecom spin-off incorporated November 2021. Four full annual periods FY2022–25 plus the initial two-month FY2021 period; keep all five reported periods in the neutral dossier. [Source](https://www.sksquare.com/assets/download/report/2022_SK_square_ESG_Report_en.pdf?download=1) |
| 543A.JP — ARCHION Corporation | 1 | 1 | New combined group. Earlier Hino-only annual reports do not cover the integrated company; keep its neutral history dossier. [Source](https://archion.co.jp/media/20260401_archion_newsrelease_en.pdf) |
| 6526.JP — Socionext Inc. | 6 | 6 | The consolidated annual table and audit note begin with FY March 2021. Earlier parent-only financial statements cannot be spliced into the consolidated series. FY2021–2026 supplies six annual consolidated reports. [Source](https://www.socionext.com/jp/ir/pdf/sn_ir20230629_01j.pdf) |
| ALAB.US — Astera Labs, Inc. | 4 | 4 | First confidential IPO submission dated 13 November 2023 includes an audit opinion covering FY2022 only; audited annual series through 2025 contains four years. [Source](https://www.sec.gov/Archives/edgar/data/1736297/000095012323010146/filename1.htm) |
| AMRZ.US — Amrize Ltd | 5 | 5 | First draft spin-off registration (2024-09-06) contains the independent audit opinion for the carve-out annual series beginning in 2021. The comparable annual series runs through 2025. Parent-company total statements are a different business perimeter. [Source](https://www.sec.gov/Archives/edgar/data/2035989/000114036124040457/filename2.htm) |
| AMVIF.US — Aumovio SE | 4 | 4 | 2025 spin-off listing documents supply FY2022–24 for the automotive group; FY2025 adds the fourth annual report. Earlier Continental totals include the retained tyre business. [Source](https://ir.aumovio.com/de/spin-off) |
| CRWV.US — CoreWeave, Inc. Class A Common Stock | 4 | 4 | Original registration audit establishes short annual history. 2022 pre-audit annual comparative is also retained in the dossier. [Source](https://www.sec.gov/Archives/edgar/data/1769628/000095012324012268/filename1.htm) |
| CVC.AS — CVC Capital Partners PLC | 5 | 5 | IPO prospectus presents separate special-purpose audited histories for Management, Advisory and Credit groups for 2021–2023. It explicitly says a combined/consolidated set cannot be prepared for these predecessor groups; no comparable older common-shareholder group series is supplied. Five annual observations through 2025. [Source](https://www.cvc.com/media/bpgbpbai/cvc-capital-partners-plc-prospectus-22-april-2024.pdf) |
| FDXF.US — FedEx Freight Holding Company, Inc. | 4 | 4 | First draft spin-off registration (2025-08-29) contains the independent audit opinion for the carve-out annual series beginning in 2023. The comparable annual series runs through 2026. Parent-company total statements are a different business perimeter. [Source](https://www.sec.gov/Archives/edgar/data/2082247/000110465925085477/filename2.htm) |
| GALD.SW — Galderma Group N | 6 | 5 | The new parent acquired Galderma on October 1, 2019. Its 2019 operating ownership period is three months, leaving six possible full annual periods from 2020 to 2025. The published IPO consolidated series begins in 2021; the 2020 year is not yet recovered in this dossier. [Source](https://investors.galderma.com/static-files/41113028-d8ef-4abd-9bd5-d66b09fdb5ab) |
| GEV.US — GE Vernova LLC | 5 | 5 | First draft spin-off registration (2023-10-27) contains the independent audit opinion for the carve-out annual series beginning in 2021. The comparable annual series runs through 2025. Parent-company total statements are a different business perimeter. [Source](https://www.sec.gov/Archives/edgar/data/1996810/000095012323009091/filename2.htm) |
| HDN.AU — Homeco Daily Needs REIT | 6 | 6 | New REIT established and listed November 2020. The first FY2021 report covers the initial operating period; FY2021–26 supplies six reports. Former Home Consortium reports cover a different portfolio and security. Establishment also documented in the parent FY2021 report, note17: https://www.asx.com.au/asxpdf/20211022/pdf/451z8klbd97vx3.pdf [Source](https://www.asx.com.au/asxpdf/20210819/pdf/44zg5hk36y65zs.pdf) |
| HONA.US — Honeywell Aerospace Inc | 3 | 3 | Original registration audit establishes short annual history. Parent totals are not the standalone business perimeter. [Source](https://www.sec.gov/Archives/edgar/data/2089271/000162827925000665/filename2.htm) |
| KALMAR.HE — Kalmar | 5 | 5 | Original spin-off reporting perimeter begins FY2021; annual reporting through FY2025 has fewer than seven periods. Earlier parent-group totals are not this business. [Source](https://www.kalmarglobal.com/49c38c/globalassets/ir/kalmar-corporation---demerger-and-listing-prospectus-22-may-2024.pdf) |
| KMAR.OL — KONGSBERG MARITIME ASA | 4 | 4 | 2026 demerger reporting perimeter; audited income series begins FY2023. The provider also contains FY2022 comparative figures, retained as additional history, but even including those there are only four periods. Earlier Kongsberg Gruppen reports are not the standalone maritime group. [Source](https://live.euronext.com/sites/default/files/2026-04/Kongsberg%20Maritime%20ASA%20-%20Prospectus%20%2816.04.2026%29.pdf) |
| LTMC.MI — LOTTOMATICA GROUP | 6 | 5 | First group financial report covers the initial 14.5-month incorporation/acquisition period ending 2020, then five annual reports 2021–2025. Gamenet-only predecessor statements cover a different perimeter. [Source](https://live.euronext.com/sites/default/files/2023-05/Lottomatica-Group-Prospetto-Informativo-20-aprile-2023_1.pdf) |
| MICC.AS — The Magnum Ice Cream Company N.V. | 4 | 4 | Original 2025 draft registration contains the ice-cream business carve-out series for 2022–2024; 2025 adds the fourth period. [Source](https://www.sec.gov/Archives/edgar/data/2071668/000110465925058051/filename1.htm) |
| OCTV-SDB.ST — Octave Intelligence PLC | 4 | 3 | Original confidential spin-off submission covers FY2022–24; FY2025 adds a fourth annual period. The listed group differs from all of Hexagon. The dossier retains FY2022–24; FY2025 has not yet been recovered. [Source](https://www.sec.gov/Archives/edgar/data/2083632/000162827925000611/filename2.htm) |
| PLX.PA — PLUXEE NV | 5 | 5 | Original spin-off reporting perimeter begins FY2021; annual reporting through FY2025 has fewer than seven periods. Earlier parent-group totals are not this business. [Source](https://www.pluxeegroup.com/sites/g/files/jclxxe221/files/2024-01/Pluxee%20-%20Prospectus_compressed.pdf) |
| Q.US — Qnity Electronics, Inc | 4 | 4 | First draft spin-off registration (2025-04-24) contains the independent audit opinion for the carve-out annual series beginning in 2022. The comparable annual series runs through 2025. Parent-company total statements are a different business perimeter. [Source](https://www.sec.gov/Archives/edgar/data/2058873/000119312525093594/d942851dex991.htm) |
| RDDT.US — Reddit, Inc. | 6 | 6 | First confidential IPO submission dated 16 December 2021 contains an audit opinion for FY2020 only. Subsequent annual series extends through 2025: six audited annual periods. [Source](https://www.sec.gov/Archives/edgar/data/1713445/000095012321016209/filename1.htm) |
| ROSE.LSE — Rosebank Industries PLC | 2 | 2 | Incorporated 31 May 2024, first acquisition August 2025. Two reports, of which one is a full year. [Source](https://cdn.yano.digital/media/upqnplx1/8419-rosebank-ar25-web.pdf) |
| SDZ.SW — Sandoz Group AG | 6 | 6 | Original spin-off prospectus begins the standalone combined financial statements in 2020; six annual periods through 2025. [Source](https://sandoz-com.cms.sandoz.com/sites/default/files/2023-10/Sandoz-Group-AG-Prospectus-2023-08_17.pdf) |
| SNDK.US — Sandisk Corp | 5 | 5 | First draft spin-off registration (2024-06-13) contains the independent audit opinion for the carve-out annual series beginning in 2022. The comparable annual series runs through 2026. Parent-company total statements are a different business perimeter. [Source](https://www.sec.gov/Archives/edgar/data/2023554/000095012324006221/filename2.htm) |
| SOLV.US — Solventum Corp. | 6 | 6 | First draft spin-off registration (2023-02-14) contains the independent audit opinion for the carve-out annual series beginning in 2020. The comparable annual series runs through 2025. Parent-company total statements are a different business perimeter. [Source](https://www.sec.gov/Archives/edgar/data/1964738/000162827923000050/filename2.htm) |
| SPCX.US — Space Exploration Technologies Corp. Class A Common Stock | 3 | 3 | Original registration audit establishes short annual history. Parent totals are not the standalone business perimeter. [Source](https://www.sec.gov/Archives/edgar/data/1181412/000162828026021860/filename1.htm) |
| SYENS.BR — Syensqo | 6 | 6 | Original spin-off reporting perimeter begins FY2020; annual reporting through FY2025 has fewer than seven periods. Earlier parent-group totals are not this business. [Source](https://www.syensqo.com/sites/g/files/alwlxe161/files/2023-11/SpecialtyCo-Registration-document2.pdf) |
| TKMS.XETRA — TKMS AG & Co KGaA | 4 | 4 | Original spin-off reporting perimeter begins FY2022; annual reporting through FY2025 has fewer than seven periods. Earlier parent-group totals are not this business. [Source](https://www.ir.tkmsgroup.com/media/document/be6de187-bbee-47ad-a0a2-3f8f8a824957/assets/TKMS_Prospectus_.pdf?disposition=inline) |
| VLTO.US — Veralto Corporation | 6 | 6 | First draft spin-off registration (2023-03-31) contains the independent audit opinion for the carve-out annual series beginning in 2020. The comparable annual series runs through 2025. Parent-company total statements are a different business perimeter. [Source](https://www.sec.gov/Archives/edgar/data/1967680/000162827923000110/filename2.htm) |

## Counted residuals

The remaining 54 cases are listed explicitly rather than disappearing from the audit. SAIN.LSE is included because publication excludes it even though its numeric quality checks are decided.

| ID / company | Indexes | Blocking reason |
| --- | --- | --- |
| ARM.US — Arm Holdings plc American Depositary Shares | Nasdaq-100 | Only 6 annual periods; 7 required |
| APN.LSE — Applied Nutrition Plc | FTSE 250 | Only 4 annual periods; 7 required |
| ATG.LSE — Auction Technology Group PLC | FTSE 250 | Only 4 annual periods; 7 required |
| IWG.LSE — IWG PLC | FTSE 250 | Only 4 annual periods; 7 required |
| MNO.LSE — Meridian Mining Plc | FTSE 250 | Only 5 annual periods; 7 required |
| PRN.LSE — Princes Group plc | FTSE 250 | Only 4 annual periods; 7 required |
| RPI.LSE — Raspberry Pi Holdings PLC | FTSE 250 | Only 4 annual periods; 7 required |
| SAIN.LSE — Scottish American Investment Co | FTSE 250 | Publisher fund classification: provider description identifies a pooled investment vehicle |
| THG.LSE — THG Holdings PLC | FTSE 250 | Only 5 annual periods; 7 required |
| TPRO.MI — TECHNOPROBE | STOXX Europe 600 | Only 5 annual periods; 7 required |
| VAR.OL — Var Energi ASA | STOXX Europe 600, OBX | Only 5 annual periods; 7 required |
| ZAB.WAR — Zabka Group S.A. | STOXX Europe 600 | Only 5 annual periods; 7 required |
| ZEG.LSE — Zegona Communications Plc | STOXX Europe 600 | Only 2 annual periods; 7 required |
| R3NK.XETRA — Renk Group AG | STOXX Europe 600, MDAX | Only 6 annual periods; 7 required |
| KBCA.BR — KBC Ancora | STOXX Europe 600 | economics: not enough data for owner earnings cash conversion; accounting: not enough data for Sloan accruals; accounting: not enough data for operating cash flow backing earnings |
| MANTA.HE — Mandatum Oyj | STOXX Europe 600, OMXH25 | Only 6 annual periods; 7 required |
| SUNN.SW — SUNRISE N | STOXX Europe 600 | Only 5 annual periods; 7 required |
| VSURE.ST — Verisure Plc | STOXX Europe 600 | Only 4 annual periods; 7 required |
| IOS.DU — IONOS Group SE | MDAX | Only 4 annual periods; 7 required |
| ATO.PA — Atos SE | SBF 120 | Only 1 annual periods; 7 required |
| DBV.PA — DBV Technologies S.A. | SBF 120 | Only 6 annual periods; 7 required |
| RF.PA — Eurazeo | SBF 120 | Consecutive reported NAV per share and dividend history unavailable |
| EXENS.PA — EXOSENS PROM | SBF 120 | Only 6 annual periods; 7 required |
| TDSA.LS — Teixeira Duarte | PSI | accounting: not enough data for Sloan accruals; accounting: not enough data for operating cash flow backing earnings |
| TLC.AU — The Lottery Corporation Ltd | S&P/ASX 200 | management: not enough data for the $1 test or per-share value growth |
| TLX.AU — TELIX Pharmaceuticals Ltd | S&P/ASX 200 | Only 4 annual periods; 7 required |
| 360.AU — LIFE360 Inc | S&P/ASX 200 | Only 6 annual periods; 7 required |
| GNZ.NZ — Goodman NZ Ltd & Goodman Property Services Ltd (NS) Stapled Security | NZX 50 | Only 4 annual periods; 7 required |
| PYIYF.US — Property For Industry Ltd. | NZX 50 | Only 2 annual periods; 7 required |
| 8729.JP — Sony Financial Group Inc. | TOPIX Core30 | Only 5 annual periods; 7 required |
| 0016.HK — Sun Hung Kai Properties Ltd | Hang Seng | accounting: not enough data for Sloan accruals; accounting: not enough data for operating cash flow backing earnings |
| 0267.HK — Citic Pacific | Hang Seng | Only 2 annual periods; 7 required |
| 278470.KO — APR LTD | KOSPI 200 | management: not enough data for the $1 test or per-share value growth |
| 483650.KO — d'Alba Global | KOSPI 200 | Only 3 annual periods; 7 required |
| 454910.KO — Doosan Robotics Inc. | KOSPI 200 | Only 5 annual periods; 7 required |
| 450080.KO — ECOPRO MAT | KOSPI 200 | Only 5 annual periods; 7 required |
| 088350.KO — Hanwha Life | KOSPI 200 | economics: not enough data for at least seven consecutive book observations with annual dividends; management: Unreported buybacks treated as zero; retained-earnings test is conservative; management: not enough data for annualized share growth excluding flagged crisis recapitalisations; management: not enough data for retained earnings versus book per share |
| 443060.KO — HD Hyundai Marine Solution | KOSPI 200 | Only 5 annual periods; 7 required |
| 457190.KO — ISU Specialty Chemical Co. Ltd. | KOSPI 200 | Only 0 annual periods; 7 required |
| 064400.KO — LG CNS | KOSPI 200 | Only 5 annual periods; 7 required |
| 373220.KO — LG Energy Solution Ltd | KOSPI 200 | Only 6 annual periods; 7 required |
| 006800.KO — Mirae Asset Daewoo Securities Co Ltd | KOSPI 200 | economics: not enough data for owner earnings cash conversion; accounting: not enough data for Sloan accruals; accounting: not enough data for operating cash flow backing earnings |
| 034230.KO — PARADISE LTD | KOSPI 200 | Only 5 annual periods; 7 required |
| 022100.KO — POSCO ICT Co. Ltd. | KOSPI 200 | Only 6 annual periods; 7 required |
| 062040.KO — Sanil Electric Co., Ltd. | KOSPI 200 | Only 4 annual periods; 7 required |
| ETERNAL.NSE — Eternal Ltd. | Nifty 50 | Only 5 annual periods; 7 required |
| JIOFIN.NSE — Jio Financial Services Ltd. | Nifty 50 | Only 4 annual periods; 7 required |
| NESTLEIND.NSE — Nestle India Ltd. | Nifty 50 | Only 2 annual periods; 7 required |
| 688271.SHG — Shanghai United Imaging Healthcare Co. Ltd. A | CSI 300 | Only 6 annual periods; 7 required |
| 600732.SHG — Shanghai Xinmei Real Estate Co Ltd Class A | CSI 300 | Only 6 annual periods; 7 required |
| 601059.SHG — Cinda Securities Co. Ltd. A | CSI 300 | Only 5 annual periods; 7 required |
| S3Z.F — Ascendas Real Estate Investment Trust | STI | Only 6 annual periods; 7 required |
| BRAV3.SA — 3R Petroleum Oleo E Gas SA Ordinary Shares | Ibovespa | Only 5 annual periods; 7 required |
| SIGMAFA.MX — Sigma Foods, S.A.B. de C.V. | IPC | Only 5 annual periods; 7 required |

## Verification and execution boundary

- Daily runner: the controller stopped the October 1 cycle at 07:06 UTC and wrote the 07:07 publish-log handoff explicitly freeing the corpus. The runner was then idle until the next 03:00 UTC. The gate evidence is saved in `complete-2/runner-gate.txt`. Shared-corpus writes began only after this handoff.
- Source adoption: 884 verified/issuer/SEC/Yahoo/EDINET cache files, followed by 525 missing raw EODHD downloads. Existing real raw EODHD files were not overwritten. Adoption inventories and backups are in `adoption.json`, `adoption-plan.json`, `adoption-raw.json` and `adoption-backup/`.
- Shared analysis: all 2,716 original index IDs reanalysed, **0 failures**, using cached qualitative readings. Focused reruns applied final issuer observations, the consolidated-cash explanatory note and the 52 price-basis corrections (0 failures).
- Calibration: **PASS**; 10 true positives, 16 true negatives, 0 false positives, 0 false negatives, 0 unclear, 2 existing insufficient-history cases (LCID/RIVN), 8 designated exceptions.
- Buffett purchase check: **4 buys / 7 within 20%**, versus the required baseline of 4 / 6: no regression. Tune: 1 buy / 4 within 20%; holdout: 3 / 3. This is the fixture’s “all” category; ordinary-only is 3 / 6.
- Unit suite: **112 files, 1,402 tests passed**. The final publication/derivation focused run passed 83 tests. TypeScript and the production build passed; build output stayed in `.next`. Method-page wording now states the actual annual windows and profitability proportions.
- Local publish: `publish --out=/Users/miki/value-corpus/staging/release-8 --overwrite`; no data-repository commit, push, deployment or revalidation. Publisher universe: 2,715 after the existing SAIN.LSE fund exclusion; decided published screens: 2,630.
- Share-price panels: no remaining private share residual among quality-pass companies. There are 423 other private share/valuation residuals among failing-quality companies; this round’s completeness percentage measures decided quality screens, and does not claim that every valuation in the entire corpus has a reconciled denominator.
- Browser checks: all seven requested routes return 200 at 1728×970; five quality tiles and share price, estimated value and buy price are present. The design audit checks wording, console errors, overlap, clipping and overflow. Published JSON and the mobile/desktop browser phrase scan pass.

## Screenshots

| Route | Screenshot |
| --- | --- |
| /uber.us | [1728×970](/Users/miki/GitHub/superinvestors-wt/value-m-design/test-results/complete-2/screenshots/1728x970_uber_us.png) |
| /azo.us | [1728×970](/Users/miki/GitHub/superinvestors-wt/value-m-design/test-results/complete-2/screenshots/1728x970_azo_us.png) |
| /zts.us | [1728×970](/Users/miki/GitHub/superinvestors-wt/value-m-design/test-results/complete-2/screenshots/1728x970_zts_us.png) |
| /9984.jp | [1728×970](/Users/miki/GitHub/superinvestors-wt/value-m-design/test-results/complete-2/screenshots/1728x970_9984_jp.png) |
| /inve-b.st | [1728×970](/Users/miki/GitHub/superinvestors-wt/value-m-design/test-results/complete-2/screenshots/1728x970_inve_b_st.png) |
| /exo.as | [1728×970](/Users/miki/GitHub/superinvestors-wt/value-m-design/test-results/complete-2/screenshots/1728x970_exo_as.png) |
| /055550.ko | [1728×970](/Users/miki/GitHub/superinvestors-wt/value-m-design/test-results/complete-2/screenshots/1728x970_055550_ko.png) |

Evidence directory: `/Users/miki/value-corpus/staging/release-8/complete-2`. Final logs: `final-unit-tests.log`, `final-publication-tests.log`, `final-calibrate.log`, `final-buffett.log`, `real-analyze-2.log`, `final-publish.log`, `final-build.log`, `final-screenshots.log`, `final-public-output.log`, `final-price-panels.log`, and `final-counts.json`, `price-splits-red.log`, `price-splits-green.log`, `price-split-affected.json`, and `final-price-split-analyze.log`.

Commit message: `value: complete data round 2 (undecided index members)`.
