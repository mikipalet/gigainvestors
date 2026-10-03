# Nightly 5 — KEEP HOLD

**KEEP HOLD.** Final replay has **107 verdict changes**: **8 APPROVED**, **1 with causal inputs fixed**, and **98 residual source-agreement reviews**. Another **38 original changes no longer occur**. The requested commit title is the task label, not a blanket approval claim.

Evidence is committed beside the [worktree report](/Users/miki/GitHub/superinvestors-wt/value-zp-nightly/.superpowers/sdd/2026-09-29-value/nightly-5-report.md), including the [source-check ledger](/Users/miki/GitHub/superinvestors-wt/value-zp-nightly/.superpowers/sdd/2026-09-29-value/nightly-5-source-checks.json.gz) and [filing reviews](/Users/miki/GitHub/superinvestors-wt/value-zp-nightly/.superpowers/sdd/2026-09-29-value/nightly-5-filing-reviews.json).

The controller ruling is applied: missing old release-time source bodies are **not blockers**. The original 19 historical-code cases are judged on current inputs; residuals below concern present values, definitions, independent-source coverage or new-side attribution. Every checked observation is recorded with fiscal year, named field, current value, comparison value, source and tolerance in `nightly-5-source-checks.json.gz`. The complete counterfactual ledger is `nightly-5-attribution.json.gz`.

## Changes and limits

Refreshes retain omitted annual periods and prior numeric facts, with a content-addressed pre-refresh snapshot. SEC completion now uses the same destructive-share-replacement safeguard as other secondary inputs. Rejected replacement shares retain prior provenance, and refresh retention links each retained share fact to its snapshot. Japan persists source years and checks integrity on a working copy, preventing irreversible source-history truncation.

The seven requested history-start checks are listed below. Evolution FY2005 uses filed **year-end shares as an explicit estimate**, not a claimed weighted denominator. Hammerson FY1996–98 uses filed basic-weighted counts as explicit proxies; the filing says dilution had no material EPS effect for FY1996/97, and FY1998 basic/diluted EPS agree. Rounded filed rights factors are declared. These limitations remain visible in provenance.

| Company | Released first–last | Replay first–last | Result |
|---|---|---|---|
| EQNR.OL | 1998–2025 | 1998–2025 | RESTORED |
| 4043.JP | 2013–2026 | 2013–2026 | RESTORED |
| 3457.JP | 2013–2026 | 2013–2026 | RESTORED |
| EVN.AU | 2005–2026 | 2005–2026 | RESTORED |
| NTRS.US | 1996–2025 | 1996–2025 | RESTORED |
| AENA.MC | 2011–2025 | 2011–2025 | RESTORED |
| HMSO.LSE | 1996–2025 | 1996–2025 | RESTORED |

- **Equinor:** FY2000 weighted shares corrected from a spurious fivefold value to 1,975,885,600, matching its issuer annual report.
- **Tokuyama / &Do / Aena:** reconcile the filed 1-for-5, later 2-for-1, and 10-for-1 comparative bases respectively. **Northern Trust:** reject the destructive SEC share replacement while keeping other new financial facts.
- **Evolution:** FY2005 issued-share proxy and FY2006/07 weighted shares come from Westonia's 2007 report, converted by the documented 2009 1-for-11 consolidation. **Hammerson:** visually read the 1997 Companies House filing, combined later comparative EPS disclosures with the 2009/2020 rights factors and 2024 consolidation.
- **Shionogi / Denso:** issuer-confirmed 3-for-1 (2024-10-01) and 4-for-1 (2023-10-01) actions now align older mixed comparative rows; two regression tests cover the previously unconverted older block.
- **EMEIS:** the recapitalisation is distinct from the March 2024 1-for-1,000 reverse split. Filed FY2022/23 potential diluted weighted shares become 68,400.833 and 10,374,827.35 on the current basis; FY2024/25 are 159,062,400 and 162,789,272. Real dilution remains in the series and does not erase the earlier operating record. Earlier vendor share observations are converted, not represented as independently verified weighted counts. The FY2025 issuer release is syndicated and its OCR arithmetic was checked; some issuer PDF fetches returned 403.
- **Credit Saison:** approve the internal lending classification and its three classification-driven flips. Its integrated report supports the verified secondary-listing credit-services metadata; the internal bank category covers lenders. **Schwab:** its savings-and-loan holding-company status independently supports its classification flip.
- **Statement disagreements:** Tyler gross profit, Omnicom and Weyerhaeuser operating income, and matching annual reported SEC profit/cash/revenue/SBC fields for twelve more companies replace conflicting vendor totals. Only matching dates, currency and reported tags were used for those additional corrections. Composite balance fields, inferred zeroes and unmatched definitions were not promoted to audited facts. All corrections, sources and original conflicting values are in `nightly-5-input-corrections.json` and `nightly-5-sec-flow-corrections.json`.

## Source-agreement checks

Financial amounts use **1% relative tolerance**; share counts use **2%**, after period/currency/basis matching. Year-end proxies do not count as independent weighted-share agreement. EODHD versus another EODHD listing does not count as an independent provider. A direct issuer correction records the conflicting provider value and the authoritative replacement. A proxy or disputed accounting definition remains explicit.

**7 of 8 approved flips** have a recorded direct issuer check (minimum required: 2). Checks are in `nightly-5-filing-reviews.json`; this includes more than the required one in five. Prior nightly-4 samples are retained as historical evidence but do not automatically approve unchecked current values.

## Final verdict changes

| Company | Test | Old → new | One-line cause | Check type / decision |
|---|---|---|---|---|
| 002236.SHE — Zhejiang Dahua Technology Co Ltd | management | fail → pass | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| 086280.KO — Hyundai Glovis | management | fail → pass | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 10; **RESIDUAL** |
| 1093.HK — CSPC Pharmaceutical Group Ltd | management | fail → pass | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 10; **RESIDUAL** |
| 138040.KO — Meritz Financi | management | pass → fail | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 4; **RESIDUAL** |
| 139130.KO — Dgb Financial | management | pass → fail | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| 2269.HK — WuXi Biologics | management | fail → pass | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 9; **RESIDUAL** |
| 2269.JP — Meiji Holdings Co., Ltd. | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 4; **RESIDUAL** |
| 2413.JP — M3, Inc. | management | pass → fail | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 2; **RESIDUAL** |
| 267270.KO — Hyundai Construction Equipment Co Ltd | management | pass → fail | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 4; **RESIDUAL** |
| 300124.SHE — Shenzhen Inovance Tech | management | pass → fail | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| 3092.JP — ZOZO, Inc. | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 4; **RESIDUAL** |
| 3457.JP — &Do Holdings Co.,Ltd. | management | pass → fail | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 5; **RESIDUAL** |
| 3659.JP — NEXON Co., Ltd. | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 3; **RESIDUAL** |
| 4208.JP — UBE Corporation | understandable | pass → fail | Fiscal-year set changes 2018–2026 to 2014–2026. Named new-side fields: revenue, operatingIncome, netIncome. | NO_SECOND_SOURCE: 33; **RESIDUAL** |
| 4507.JP — Shionogi & Co.,Ltd. | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 7; AGREES: 2; **RESIDUAL** |
| 4751.JP — CyberAgent,Inc. | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 8; **RESIDUAL** |
| 5019.JP — Idemitsu Kosan Co.,Ltd. | management | fail → pass | Two-way counterfactual isolates dilutedShares. | CORRECTED_TO_ISSUER: 4; NO_SECOND_SOURCE: 4; **RESIDUAL** |
| 5713.JP — Sumitomo Metal Mining Co., Ltd. | management | fail → pass | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 2; **RESIDUAL** |
| 5714.JP — DOWA HOLDINGS CO.,LTD. | management | fail → pass | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 1; **RESIDUAL** |
| 600000.SHG — Shanghai Pudong Development Bank Co Ltd | management | pass → fail | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 3; **RESIDUAL** |
| 600089.SHG — Tbea Co Ltd | management | pass → fail | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| 600426.SHG — Shandong Hualu Hengsheng Chemical Co Ltd | management | pass → fail | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| 600875.SHG — Dongfang Electric Corp Ltd Class A | management | fail → pass | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| 601066.SHG — China Securities Co Ltd | management | pass → fail | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| 601169.SHG — Bank of Beijing Co Ltd | management | pass → fail | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| 601229.SHG — Bank of Shanghai Co Ltd | management | pass → fail | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| 601788.SHG — Everbright Securities Co Ltd | management | pass → fail | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| 601988.SHG — Bank of China Limited | management | pass → fail | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| 601998.SHG — China Citic Bank Corp Ltd Class A | management | pass → fail | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| 6963.JP — ROHM COMPANY LIMITED | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 4; **RESIDUAL** |
| 6971.JP — KYOCERA CORPORATION | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 5; **RESIDUAL** |
| 6988.JP — NITTO DENKO CORPORATION | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 2; AGREES: 2; **RESIDUAL** |
| 7012.JP — Kawasaki Heavy Industries,Ltd. | understandable | pass → fail | Two-way counterfactual isolates operatingIncome, revenue. | CORRECTED_TO_ISSUER: 1; DISAGREES: 5; **RESIDUAL** |
| 7267.JP — HONDA MOTOR CO., LTD. | management | fail → pass | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 2; AGREES: 4; **RESIDUAL** |
| 7269.JP — suzuki motor corporation | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 3; DISAGREES: 1; AGREES: 1; **RESIDUAL** |
| 7936.JP — ASICS Corporation | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 4; **RESIDUAL** |
| 7951.JP — YAMAHA CORPORATION | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 6; **RESIDUAL** |
| 8015.JP — TOYOTA TSUSHO CORPORATION | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 2; AGREES: 2; **RESIDUAL** |
| 8253.JP — Credit Saison Co.,Ltd. | management | fail → pass | Verified EODHD secondary listing QC9.F credit-services metadata agrees with issuer finance, credit-guarantee, real-estate finance and lending businesses. Internal bank rules cover lenders, not solely deposit banks. | Issuer filing + current input comparison; **APPROVED** |
| 8253.JP — Credit Saison Co.,Ltd. | accounting | fail → pass | Verified EODHD secondary listing QC9.F credit-services metadata agrees with issuer finance, credit-guarantee, real-estate finance and lending businesses. Internal bank rules cover lenders, not solely deposit banks. | Issuer filing + current input comparison; **APPROVED** |
| 8253.JP — Credit Saison Co.,Ltd. | economics | fail → pass | Verified EODHD secondary listing QC9.F credit-services metadata agrees with issuer finance, credit-guarantee, real-estate finance and lending businesses. Internal bank rules cover lenders, not solely deposit banks. | Issuer filing + current input comparison; **APPROVED** |
| 8697.JP — Japan Exchange Group, Inc. | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 2; AGREES: 2; **RESIDUAL** |
| 9009.JP — Keisei Electric Railway Co., Ltd. | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 1; AGREES: 3; **RESIDUAL** |
| 9020.JP — East Japan Railway Company | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 3; AGREES: 1; **RESIDUAL** |
| 9101.JP — Nippon Yusen Kabushiki Kaisha | management | pass → fail | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 1; **RESIDUAL** |
| 9202.JP — ANA HOLDINGSINC. | economics | fail → pass | Fiscal-year set changes 2018–2026 to 2014–2026. Named new-side fields: netIncome, revenue, operatingIncome, ocf, capex, equity, totalDebt, cash. | NO_SECOND_SOURCE: 66; AGREES: 22; **RESIDUAL** |
| 9433.JP — KDDI CORPORATION | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 5; **RESIDUAL** |
| 9532.JP — OSAKA GAS CO.,LTD. | understandable | pass → fail | Fiscal-year set changes 2018–2026 to 2014–2026. Named new-side fields: revenue, operatingIncome, netIncome. | NO_SECOND_SOURCE: 33; **RESIDUAL** |
| 9735.JP — SECOM CO., LTD. | management | fail → pass | Two-way counterfactual isolates dilutedShares. | NO_SECOND_SOURCE: 4; **RESIDUAL** |
| AMCR.US — Amcor PLC | economics | pass → fail | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | NO_SECOND_SOURCE: 21; CORRECTED_TO_ISSUER: 6; AGREES: 69; DISAGREES: 14; **RESIDUAL** |
| AXP.US — American Express Company | moat | pass → fail | Two-way counterfactual isolates nonInterestExpense, netRevenue. | NO_SECOND_SOURCE: 21; CORRECTED_TO_ISSUER: 1; **RESIDUAL** |
| BX.US — Blackstone Group Inc | management | fail → pass | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 7; AGREES: 4; **RESIDUAL** |
| CBG.LSE — Close Brothers Group plc | moat | pass → fail | FY2026 addition is sufficient in both directions. Filed FY2025/26 losses -77.9m/-63.4m agree with new inputs, second negative year causes earnings-consistency failure. FY2026 positive equity 1651.6m agrees and negative returns breach the tangible-return floor; parent-total proxy remains disclosed. | Issuer filing + current input comparison; **APPROVED** |
| CBG.LSE — Close Brothers Group plc | understandable | pass → fail | FY2026 addition is sufficient in both directions. Filed FY2025/26 losses -77.9m/-63.4m agree with new inputs, second negative year causes earnings-consistency failure. FY2026 positive equity 1651.6m agrees and negative returns breach the tangible-return floor; parent-total proxy remains disclosed. | Issuer filing + current input comparison; **APPROVED** |
| COALINDIA.NSE — Coal India Ltd. | management | pass → fail | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 10; **RESIDUAL** |
| DLTR.US — Dollar Tree Inc | management | fail → pass | Two-way counterfactual isolates acquisitions. | DISAGREES: 1; AGREES: 1; **RESIDUAL** |
| DVP.AU — Develop Global Ltd | accounting | fail → pass | Fiscal-year set changes 2012–2025 to 2012–2026. Named new-side fields: netIncome, revenue, operatingIncome, ocf, capex, equity, totalDebt, cash. | NO_SECOND_SOURCE: 86; CORRECTED_TO_ISSUER: 2; **RESIDUAL** |
| HBAN.US — Huntington Bancshares Incorporated | accounting | pass → fail | Two-way counterfactual isolates peerCreditLossRate. | NO_SECOND_SOURCE: 10; **RESIDUAL** |
| HDB.US — HDFC Bank Limited ADR | accounting | pass → fail | Two-way counterfactual isolates peerCreditLossRate. | NO_SECOND_SOURCE: 9; **RESIDUAL** |
| IBKR.US — Interactive Brokers Group Inc | moat | fail → pass | EODHD new equity agrees with independent SEC parent StockholdersEquity for every checked FY2015-25 observation (11/11, 1% tolerance). | Independent EODHD / SEC agreement; **APPROVED** |
| INVP.LSE — Investec PLC | understandable | fail → pass | Two-way counterfactual isolates operatingIncome. | NO_SECOND_SOURCE: 5; **RESIDUAL** |
| IR5B.IR — Irish Continental Group PLC | economics | pass → fail | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | NO_SECOND_SOURCE: 105; **RESIDUAL** |
| ITC.NSE — ITC Ltd. | management | pass → fail | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 10; **RESIDUAL** |
| KIM.US — Kimco Realty Corporation | economics | fail → pass | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | AGREES: 65; DISAGREES: 19; NO_SECOND_SOURCE: 25; CORRECTED_TO_ISSUER: 1; **RESIDUAL** |
| LEN-B.US — Lennar Corporation | moat | pass → fail | New-side netIncome, operatingIncome, revenue, grossProfit, equity, totalDebt, cash evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | AGREES: 48; CORRECTED_TO_ISSUER: 5; NO_SECOND_SOURCE: 9; DISAGREES: 15; **RESIDUAL** |
| LEN-B.US — Lennar Corporation | economics | fail → pass | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | AGREES: 65; CORRECTED_TO_ISSUER: 7; DISAGREES: 23; NO_SECOND_SOURCE: 15; **RESIDUAL** |
| LHX.US — L3Harris Technologies Inc | moat | fail → pass | Two-way counterfactual isolates revenue. | NO_SECOND_SOURCE: 1; **RESIDUAL** |
| MEGACPO.MX — Megacable Holdings S. A. B. de C. V | management | fail → pass | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 4; **RESIDUAL** |
| MGM.US — MGM Resorts International | economics | fail → pass | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | AGREES: 98; NO_SECOND_SOURCE: 1; DISAGREES: 9; CORRECTED_TO_ISSUER: 2; **RESIDUAL** |
| MS.US — Morgan Stanley | moat | pass → fail | Two-way counterfactual isolates nonInterestExpense, netRevenue. | NO_SECOND_SOURCE: 22; **RESIDUAL** |
| MTB.US — M&T Bank Corporation | accounting | pass → fail | Two-way counterfactual isolates peerCreditLossRate. | NO_SECOND_SOURCE: 10; **RESIDUAL** |
| MU.US — Micron Technology Inc | economics | fail → pass | FY2026 addition is the two-way sufficient counterfactual. New critical economics fields agree with issuer annual statements within 1%; operating income 99,907m vs filed 99,340m differs 0.571%, other numeric observations exact. Provider Aug31 label is three days before Sep3 annual end. | Issuer filing + current input comparison; **APPROVED** |
| NDSN.US — Nordson Corporation | economics | fail → pass | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | AGREES: 98; NO_SECOND_SOURCE: 8; CORRECTED_TO_ISSUER: 2; DISAGREES: 2; **RESIDUAL** |
| OMV.VI — OMV Aktiengesellschaft | economics | pass → fail | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | NO_SECOND_SOURCE: 71; AGREES: 28; DISAGREES: 4; **RESIDUAL** |
| ONGC.NSE — Oil & Natural Gas Corporation Ltd. | management | pass → fail | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 10; **RESIDUAL** |
| PFD.LSE — Premier Foods PLC | management | fail → pass | New-side netIncome, dividendsPaid, marketCap, dilutedShares evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | NO_SECOND_SOURCE: 42; **RESIDUAL** |
| PINFRA.MX — Promotora y Operadora de Infraestructura S. A. B. de C. V | management | fail → pass | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 4; **RESIDUAL** |
| PTC.US — PTC Inc | moat | fail → pass | New-side netIncome, operatingIncome, revenue, grossProfit, equity, totalDebt, cash evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | CORRECTED_TO_ISSUER: 4; AGREES: 58; DISAGREES: 15; **RESIDUAL** |
| RA.MX — Regional S.A.B. de C.V | management | pass → fail | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| RF.US — Regions Financial Corporation | accounting | pass → fail | Two-way counterfactual isolates peerCreditLossRate. | NO_SECOND_SOURCE: 10; **RESIDUAL** |
| SANB3.SA — Banco Santander Brasil SA ADR | management | fail → pass | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 4; **RESIDUAL** |
| SCHW.US — Charles Schwab Corp | moat | fail → pass | Issuer 2025 Form 10-K identifies CSC as a savings and loan holding company; confirms financial classification rather than generic operating-company rules. | Issuer filing + current input comparison; **APPROVED** |
| SHC.LSE — Shaftesbury Capital PLC | economics | pass → fail | Two-way counterfactual isolates operatingIncome. | NO_SECOND_SOURCE: 5; **RESIDUAL** |
| SSPG.LSE — SSP Group PLC | economics | pass → fail | Two-way counterfactual isolates operatingIncome. | NO_SECOND_SOURCE: 1; CORRECTED_TO_ISSUER: 3; **RESIDUAL** |
| STE.US — STERIS plc | moat | pass → fail | New-side netIncome, operatingIncome, revenue, grossProfit, equity, totalDebt, cash evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | NO_SECOND_SOURCE: 10; AGREES: 61; DISAGREES: 6; **RESIDUAL** |
| STE.US — STERIS plc | management | pass → fail | Fiscal-year set changes 2017–2026 to 1997–2026. Named new-side fields: dilutedShares, netIncome, dividendsPaid, marketCap. | NO_SECOND_SOURCE: 13; INCOMPARABLE_BASIS: 6; AGREES: 24; **RESIDUAL** |
| TFC.US — Truist Financial Corp | accounting | pass → fail | Two-way counterfactual isolates peerCreditLossRate. | NO_SECOND_SOURCE: 10; **RESIDUAL** |
| TMPV.NSE — Tata Motors Passenger Vehicles Ltd. | management | pass → fail | Two-way counterfactual isolates marketCap. | NO_SECOND_SOURCE: 10; **RESIDUAL** |
| TPL.US — Texas Pacific Land Corporation | economics | fail → pass | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | NO_SECOND_SOURCE: 72; AGREES: 33; DISAGREES: 5; **RESIDUAL** |
| TROW.US — T. Rowe Price Group Inc | moat | pass → fail | New-side netIncome, operatingIncome, revenue, grossProfit, equity, totalDebt, cash evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | AGREES: 54; NO_SECOND_SOURCE: 8; CORRECTED_TO_ISSUER: 5; DISAGREES: 10; **RESIDUAL** |
| TSCO.US — Tractor Supply Company | management | fail → pass | Two-way counterfactual isolates dilutedShares. | Issuer corrections / independent source agreement; **FIXED — causal inputs corrected** |
| TSCO.US — Tractor Supply Company | economics | fail → pass | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | CORRECTED_TO_ISSUER: 7; AGREES: 90; NO_SECOND_SOURCE: 9; DISAGREES: 4; **RESIDUAL** |
| UHS.US — Universal Health Services Inc | economics | fail → pass | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | AGREES: 91; CORRECTED_TO_ISSUER: 4; DISAGREES: 8; NO_SECOND_SOURCE: 7; **RESIDUAL** |
| UOB.F — United Overseas Bank Limited | understandable | fail → pass | Two-way counterfactual isolates operatingIncome. | AGREES: 1; DISAGREES: 2; **RESIDUAL** |
| USB.US — U.S. Bancorp | accounting | pass → fail | Two-way counterfactual isolates peerCreditLossRate. | NO_SECOND_SOURCE: 10; **RESIDUAL** |
| VTRS.US — Viatris Inc | management | pass → fail | Fiscal-year set changes 2018–2025 to 1996–2025. Named new-side fields: dilutedShares, netIncome, dividendsPaid, marketCap. | NO_SECOND_SOURCE: 19; INCOMPARABLE_BASIS: 6; AGREES: 14; DISAGREES: 4; **RESIDUAL** |
| VTRS.US — Viatris Inc | economics | pass → fail | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | NO_SECOND_SOURCE: 37; AGREES: 59; CORRECTED_TO_ISSUER: 6; DISAGREES: 8; **RESIDUAL** |
| WFC.US — Wells Fargo & Company | moat | pass → fail | Two-way counterfactual isolates nonInterestExpense, netRevenue. | NO_SECOND_SOURCE: 22; **RESIDUAL** |
| WSM.US — Williams-Sonoma Inc | management | fail → pass | Two-way counterfactual isolates dilutedShares. | INCOMPARABLE_BASIS: 7; **RESIDUAL** |
| WTW.US — Willis Towers Watson PLC | economics | fail → pass | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | AGREES: 79; DISAGREES: 21; CORRECTED_TO_ISSUER: 5; NO_SECOND_SOURCE: 5; **RESIDUAL** |
| WYNN.US — Wynn Resorts Limited | economics | fail → pass | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | AGREES: 80; NO_SECOND_SOURCE: 10; DISAGREES: 12; CORRECTED_TO_ISSUER: 8; **RESIDUAL** |
| AMCR.US — Amcor PLC | management | pass → fail | Fiscal-year set changes 2017–2026 to 1997–2026. Named new-side fields: dilutedShares, netIncome, dividendsPaid, marketCap. | NO_SECOND_SOURCE: 13; DISAGREES: 8; CORRECTED_TO_ISSUER: 2; AGREES: 19; INCOMPARABLE_BASIS: 1; **RESIDUAL** |
| DBV.PA — DBV Technologies S.A. | moat | na → fail | New-side netIncome, operatingIncome, revenue, grossProfit, equity, totalDebt, cash evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | NO_SECOND_SOURCE: 10; AGREES: 27; DISAGREES: 7; **RESIDUAL** |
| DBV.PA — DBV Technologies S.A. | management | na → fail | New-side netIncome, dividendsPaid, marketCap, dilutedShares evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | NO_SECOND_SOURCE: 12; AGREES: 11; INCOMPARABLE_BASIS: 2; DISAGREES: 3; **RESIDUAL** |
| DBV.PA — DBV Technologies S.A. | understandable | na → fail | New-side revenue, operatingIncome, netIncome evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | NO_SECOND_SOURCE: 3; AGREES: 15; DISAGREES: 3; **RESIDUAL** |
| DBV.PA — DBV Technologies S.A. | accounting | na → pass | New-side netIncome, ocf, totalAssets, receivables, revenue, nonRecurring, sbc evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | NO_SECOND_SOURCE: 11; AGREES: 29; DISAGREES: 9; **RESIDUAL** |
| DBV.PA — DBV Technologies S.A. | economics | na → fail | New-side netIncome, ocf, capex, sbc, leaseCash, operatingIncome, revenue, ppe, receivables, inventory, payables evaluated under current code; current source checks remain incomplete. Old-code reproduction is waived. | NO_SECOND_SOURCE: 16; AGREES: 38; DISAGREES: 16; **RESIDUAL** |

## Exact residuals

The following current-side observations still lack approval. `DISAGREES` means the numeric comparison exceeds tolerance; the precise candidate source/field is retained, and a different accounting/share definition must be reconciled before treating it as a replacement value. `NO_SECOND_SOURCE` means no independent same-period/currency value is available in the preserved second-source caches. `INCOMPARABLE_BASIS` means the only candidate is an issued/year-end share proxy, not a weighted denominator. Confirmed matching-definition statement bugs identified in this pass were corrected. Full candidate amounts and sources are recorded in the compressed check ledger; no residual asks for unavailable old-release bodies.

- **002236.SHE / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **086280.KO / management**: marketCap FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE.
- **1093.HK / management**: marketCap FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE.
- **138040.KO / management**: marketCap FY2022,2023,2024,2025: NO_SECOND_SOURCE.
- **139130.KO / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **2269.HK / management**: marketCap FY2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE.
- **2269.JP / management**: dilutedShares FY2019,2020,2021,2022: NO_SECOND_SOURCE.
- **2413.JP / management**: marketCap FY2017,2018: NO_SECOND_SOURCE.
- **267270.KO / management**: marketCap FY2022,2023,2024,2025: NO_SECOND_SOURCE.
- **300124.SHE / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **3092.JP / management**: dilutedShares FY2021,2022,2023,2024: NO_SECOND_SOURCE.
- **3457.JP / management**: marketCap FY2017,2019,2020,2021,2022: NO_SECOND_SOURCE.
- **3659.JP / management**: dilutedShares FY2015,2016,2017: NO_SECOND_SOURCE.
- **4208.JP / understandable**: revenue FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; operatingIncome FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; netIncome FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE.
- **4507.JP / management**: dilutedShares FY2016,2017,2018,2019,2020,2021,2022: NO_SECOND_SOURCE.
- **4751.JP / management**: dilutedShares FY2017,2018,2019,2020,2021,2022,2023,2024: NO_SECOND_SOURCE.
- **5019.JP / management**: dilutedShares FY2020,2021,2022,2023: NO_SECOND_SOURCE.
- **5713.JP / management**: marketCap FY2017,2018: NO_SECOND_SOURCE.
- **5714.JP / management**: marketCap FY2017: NO_SECOND_SOURCE.
- **600000.SHG / management**: dilutedShares FY2022,2023,2025: INCOMPARABLE_BASIS.
- **600089.SHG / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **600426.SHG / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **600875.SHG / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **601066.SHG / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **601169.SHG / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **601229.SHG / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **601788.SHG / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **601988.SHG / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **601998.SHG / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **6963.JP / management**: dilutedShares FY2020,2021,2022,2023: NO_SECOND_SOURCE.
- **6971.JP / management**: dilutedShares FY2018,2020,2021,2022,2023: NO_SECOND_SOURCE.
- **6988.JP / management**: dilutedShares FY2021,2022: NO_SECOND_SOURCE.
- **7012.JP / understandable**: operatingIncome FY2022,2023,2024,2025,2026: DISAGREES.
- **7267.JP / management**: dilutedShares FY2020,2021: INCOMPARABLE_BASIS.
- **7269.JP / management**: dilutedShares FY2020,2021,2022: NO_SECOND_SOURCE; dilutedShares FY2023: DISAGREES.
- **7936.JP / management**: dilutedShares FY2020,2021,2022,2023: NO_SECOND_SOURCE.
- **7951.JP / management**: dilutedShares FY2018,2019,2021,2022,2023,2024: NO_SECOND_SOURCE.
- **8015.JP / management**: dilutedShares FY2021,2022: NO_SECOND_SOURCE.
- **8697.JP / management**: dilutedShares FY2021,2022: NO_SECOND_SOURCE.
- **9009.JP / management**: dilutedShares FY2021: NO_SECOND_SOURCE.
- **9020.JP / management**: dilutedShares FY2020,2021,2022: NO_SECOND_SOURCE.
- **9101.JP / management**: marketCap FY2022: NO_SECOND_SOURCE.
- **9202.JP / economics**: netIncome FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; revenue FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; operatingIncome FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; ocf FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; capex FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; equity FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE.
- **9433.JP / management**: dilutedShares FY2021,2022,2023,2024,2025: NO_SECOND_SOURCE.
- **9532.JP / understandable**: revenue FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; operatingIncome FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; netIncome FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE.
- **9735.JP / management**: dilutedShares FY2021,2022,2023,2024: NO_SECOND_SOURCE.
- **AMCR.US / economics**: netIncome FY2016: NO_SECOND_SOURCE; ocf FY2016: NO_SECOND_SOURCE; capex FY2016: NO_SECOND_SOURCE; sbc FY2016: NO_SECOND_SOURCE; operatingIncome FY2016: NO_SECOND_SOURCE; revenue FY2016: NO_SECOND_SOURCE; ppe FY2016,2017,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; receivables FY2016,2017: NO_SECOND_SOURCE; inventory FY2016,2017: NO_SECOND_SOURCE; payables FY2016,2017: NO_SECOND_SOURCE; capex FY2018,2020,2021,2022,2023,2024,2025,2026: DISAGREES; receivables FY2018: DISAGREES; payables FY2018: DISAGREES; inventory FY2023,2024,2025,2026: DISAGREES.
- **AXP.US / moat**: nonInterestExpense FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; netRevenue FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024: NO_SECOND_SOURCE.
- **BX.US / management**: dilutedShares FY2015,2016,2017,2018,2019,2020,2021: INCOMPARABLE_BASIS.
- **COALINDIA.NSE / management**: marketCap FY2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE.
- **DLTR.US / management**: acquisitions FY2016: DISAGREES.
- **DVP.AU / accounting**: netIncome FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; revenue FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; operatingIncome FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; ocf FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; capex FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; equity FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; totalDebt FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; cash FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE.
- **HBAN.US / accounting**: peerCreditLossRate FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024: NO_SECOND_SOURCE.
- **HDB.US / accounting**: peerCreditLossRate FY2016,2017,2018,2019,2020,2021,2022,2023,2024: NO_SECOND_SOURCE.
- **INVP.LSE / understandable**: operatingIncome FY2021,2022,2023,2024,2026: NO_SECOND_SOURCE.
- **IR5B.IR / economics**: netIncome FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; ocf FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; capex FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; operatingIncome FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; revenue FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; ppe FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; inventory FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; payables FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; receivables FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; sbc FY2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE.
- **ITC.NSE / management**: marketCap FY2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE.
- **KIM.US / economics**: capex FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: DISAGREES; ppe FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; receivables FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; inventory FY2015,2016,2017,2018,2020,2021,2022: DISAGREES; payables FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; inventory FY2019,2023,2024,2025: NO_SECOND_SOURCE; receivables FY2024: DISAGREES.
- **LEN-B.US / moat**: grossProfit FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; totalDebt FY2015,2016,2017,2018,2020,2021,2022,2023,2024,2025: DISAGREES; cash FY2015,2016,2020: DISAGREES; operatingIncome FY2021: NO_SECOND_SOURCE; cash FY2021: NO_SECOND_SOURCE; operatingIncome FY2023: DISAGREES; grossProfit FY2023: DISAGREES.
- **LEN-B.US / economics**: ppe FY2015,2016,2017,2018,2020,2021,2022,2023,2024,2025: DISAGREES; receivables FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; inventory FY2015,2016,2017,2018,2019,2020,2021,2022: DISAGREES; payables FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; operatingIncome FY2021: NO_SECOND_SOURCE; receivables FY2022,2023,2024,2025: DISAGREES; operatingIncome FY2023: DISAGREES.
- **LHX.US / moat**: revenue FY2019: NO_SECOND_SOURCE.
- **MEGACPO.MX / management**: marketCap FY2022,2023,2024,2025: NO_SECOND_SOURCE.
- **MGM.US / economics**: ocf FY2015: NO_SECOND_SOURCE; receivables FY2015,2017,2018,2019,2020,2021: DISAGREES; ppe FY2019,2020,2021: DISAGREES.
- **MS.US / moat**: nonInterestExpense FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; netRevenue FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE.
- **MTB.US / accounting**: peerCreditLossRate FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024: NO_SECOND_SOURCE.
- **NDSN.US / economics**: ocf FY2015: NO_SECOND_SOURCE; receivables FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; ppe FY2020,2021: DISAGREES.
- **OMV.VI / economics**: netIncome FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; ocf FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; capex FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; sbc FY2015,2016,2017,2018,2019,2020,2021,2022: NO_SECOND_SOURCE; operatingIncome FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; revenue FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; receivables FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; inventory FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; payables FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; ppe FY2019,2020,2021: NO_SECOND_SOURCE; ocf FY2023: DISAGREES; capex FY2023: DISAGREES; ppe FY2024,2025: DISAGREES.
- **ONGC.NSE / management**: marketCap FY2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE.
- **PFD.LSE / management**: netIncome FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; dividendsPaid FY2016,2017,2018,2019,2020,2021,2022,2024,2025,2026: NO_SECOND_SOURCE; dilutedShares FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; marketCap FY2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE.
- **PINFRA.MX / management**: marketCap FY2022,2023,2024,2025: NO_SECOND_SOURCE.
- **PTC.US / moat**: equity FY2015: DISAGREES; totalDebt FY2015,2016,2017,2020,2021,2022,2023,2024,2025: DISAGREES; cash FY2016,2017,2018,2019,2020: DISAGREES.
- **RA.MX / management**: dilutedShares FY2021,2022,2023,2025: INCOMPARABLE_BASIS.
- **RF.US / accounting**: peerCreditLossRate FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024: NO_SECOND_SOURCE.
- **SANB3.SA / management**: dilutedShares FY2022,2023,2024,2025: INCOMPARABLE_BASIS.
- **SHC.LSE / economics**: operatingIncome FY2019,2020,2021,2022,2025: NO_SECOND_SOURCE.
- **SSPG.LSE / economics**: operatingIncome FY2020: NO_SECOND_SOURCE.
- **STE.US / moat**: netIncome FY2016: NO_SECOND_SOURCE; operatingIncome FY2016: NO_SECOND_SOURCE; revenue FY2016: NO_SECOND_SOURCE; grossProfit FY2016: NO_SECOND_SOURCE; equity FY2016,2017: NO_SECOND_SOURCE; totalDebt FY2016,2017: NO_SECOND_SOURCE; cash FY2016,2022: NO_SECOND_SOURCE; totalDebt FY2018,2019,2020,2021,2022,2023: DISAGREES.
- **STE.US / management**: dilutedShares FY2016: NO_SECOND_SOURCE; netIncome FY2016: NO_SECOND_SOURCE; dividendsPaid FY2016: NO_SECOND_SOURCE; dilutedShares FY2017,2018,2019,2020,2021,2022: INCOMPARABLE_BASIS; marketCap FY2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE.
- **TFC.US / accounting**: peerCreditLossRate FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024: NO_SECOND_SOURCE.
- **TMPV.NSE / management**: marketCap FY2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE.
- **TPL.US / economics**: netIncome FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; ocf FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; capex FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; sbc FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; operatingIncome FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; revenue FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; ppe FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; receivables FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; inventory FY2015,2016,2017,2018,2019,2020,2023,2024,2025: NO_SECOND_SOURCE; payables FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; capex FY2023,2024,2025: DISAGREES; ppe FY2025: DISAGREES; payables FY2025: DISAGREES.
- **TROW.US / moat**: revenue FY2015: NO_SECOND_SOURCE; grossProfit FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; totalDebt FY2016,2017,2018,2019,2020,2021,2025: DISAGREES; grossProfit FY2022,2023,2025: DISAGREES.
- **TSCO.US / economics**: revenue FY2015,2016: NO_SECOND_SOURCE; receivables FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; ppe FY2019,2020,2021: DISAGREES; receivables FY2022: DISAGREES.
- **UHS.US / economics**: capex FY2015,2016,2017,2018,2019: DISAGREES; inventory FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; ppe FY2019,2020,2021: DISAGREES.
- **UOB.F / understandable**: operatingIncome FY2017,2018: DISAGREES.
- **USB.US / accounting**: peerCreditLossRate FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024: NO_SECOND_SOURCE.
- **VTRS.US / management**: dilutedShares FY2015,2016,2017: NO_SECOND_SOURCE; netIncome FY2015,2016,2017: NO_SECOND_SOURCE; dividendsPaid FY2015,2016,2017: NO_SECOND_SOURCE; marketCap FY2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; dilutedShares FY2018,2019,2020,2021,2024,2025: INCOMPARABLE_BASIS; dividendsPaid FY2018,2019,2020,2021: DISAGREES.
- **VTRS.US / economics**: netIncome FY2015,2016,2017: NO_SECOND_SOURCE; ocf FY2015,2016,2017: NO_SECOND_SOURCE; capex FY2015,2016,2017: NO_SECOND_SOURCE; sbc FY2015,2016,2017: NO_SECOND_SOURCE; operatingIncome FY2015,2016,2017: NO_SECOND_SOURCE; revenue FY2015,2016,2017: NO_SECOND_SOURCE; ppe FY2015,2016,2017,2018: NO_SECOND_SOURCE; receivables FY2015,2016,2017,2018: NO_SECOND_SOURCE; inventory FY2015,2016,2017,2018: NO_SECOND_SOURCE; payables FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; capex FY2019,2020,2021,2022,2023: DISAGREES; ppe FY2019,2020,2021: DISAGREES.
- **WFC.US / moat**: nonInterestExpense FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; netRevenue FY2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE.
- **WSM.US / management**: dilutedShares FY2016,2017,2018,2019,2020,2021,2022: INCOMPARABLE_BASIS.
- **WTW.US / economics**: capex FY2015,2016,2017,2018,2019,2020,2021: DISAGREES; inventory FY2015,2016,2017,2018,2019,2020,2021,2022,2023: DISAGREES; payables FY2017,2018: DISAGREES; ppe FY2019,2020,2021: DISAGREES; payables FY2019,2020,2021: NO_SECOND_SOURCE; inventory FY2024,2025: NO_SECOND_SOURCE.
- **WYNN.US / economics**: receivables FY2015,2016,2017,2018,2019,2020,2021: NO_SECOND_SOURCE; payables FY2015: DISAGREES; capex FY2016,2017,2018,2021,2022,2023: DISAGREES; revenue FY2019,2020,2021: NO_SECOND_SOURCE; ppe FY2019,2020,2021,2025: DISAGREES; receivables FY2025: DISAGREES.
- **AMCR.US / management**: dilutedShares FY2016: NO_SECOND_SOURCE; netIncome FY2016: NO_SECOND_SOURCE; dividendsPaid FY2016: NO_SECOND_SOURCE; dilutedShares FY2017,2018,2019,2020,2021,2022,2023,2025: DISAGREES; marketCap FY2017,2018,2019,2020,2021,2022,2023,2024,2025,2026: NO_SECOND_SOURCE; dilutedShares FY2026: INCOMPARABLE_BASIS.
- **DBV.PA / moat**: netIncome FY2019: NO_SECOND_SOURCE; operatingIncome FY2019: NO_SECOND_SOURCE; revenue FY2019: NO_SECOND_SOURCE; grossProfit FY2019,2025: NO_SECOND_SOURCE; equity FY2019: NO_SECOND_SOURCE; totalDebt FY2019,2020,2021: NO_SECOND_SOURCE; cash FY2019: NO_SECOND_SOURCE; operatingIncome FY2020,2021: DISAGREES; revenue FY2021: DISAGREES; totalDebt FY2022,2023,2024,2025: DISAGREES.
- **DBV.PA / management**: netIncome FY2019: NO_SECOND_SOURCE; dividendsPaid FY2019,2023,2024: NO_SECOND_SOURCE; marketCap FY2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; dilutedShares FY2019: NO_SECOND_SOURCE; dilutedShares FY2020,2021: INCOMPARABLE_BASIS; dilutedShares FY2022,2024,2025: DISAGREES.
- **DBV.PA / understandable**: revenue FY2019: NO_SECOND_SOURCE; operatingIncome FY2019: NO_SECOND_SOURCE; netIncome FY2019: NO_SECOND_SOURCE; operatingIncome FY2020,2021: DISAGREES; revenue FY2021: DISAGREES.
- **DBV.PA / accounting**: netIncome FY2019: NO_SECOND_SOURCE; ocf FY2019: NO_SECOND_SOURCE; totalAssets FY2019: NO_SECOND_SOURCE; receivables FY2019: NO_SECOND_SOURCE; revenue FY2019: NO_SECOND_SOURCE; nonRecurring FY2019,2022,2023,2024,2025: NO_SECOND_SOURCE; sbc FY2019: NO_SECOND_SOURCE; ocf FY2020,2021,2022,2023,2024: DISAGREES; nonRecurring FY2020: DISAGREES; receivables FY2021,2022: DISAGREES; revenue FY2021: DISAGREES.
- **DBV.PA / economics**: netIncome FY2019: NO_SECOND_SOURCE; ocf FY2019: NO_SECOND_SOURCE; capex FY2019: NO_SECOND_SOURCE; sbc FY2019: NO_SECOND_SOURCE; operatingIncome FY2019: NO_SECOND_SOURCE; revenue FY2019: NO_SECOND_SOURCE; ppe FY2019: NO_SECOND_SOURCE; receivables FY2019: NO_SECOND_SOURCE; inventory FY2019,2020,2021,2022,2023,2024,2025: NO_SECOND_SOURCE; payables FY2019: NO_SECOND_SOURCE; ocf FY2020,2021,2022,2023,2024: DISAGREES; operatingIncome FY2020,2021: DISAGREES; ppe FY2020,2021,2022,2023,2024,2025: DISAGREES; revenue FY2021: DISAGREES; receivables FY2021,2022: DISAGREES.

## Replay and verification

- Dossiers: **2708 → 2708**; added **0**, removed **0**.
- Pipeline **26**, **38,056** current analyses; no missing analyses, fingerprints or stale member snapshots. The existing insufficient-data member with an empty snapshot remains explicitly recorded.
- Exact baseline **634f80f3**, recovered from local git: **5,081 files**, all 2,708 release timestamps agree with the old inventory. A later live commit was deliberately excluded from this comparison. No remote git operation was used.
- The first pass was invalidated after discovering 24,103 dangling raw/source file links to deleted nightly-2 staging. They were repaired to the hash-verified original corpus, a broken-link preflight was added, and a complete replacement replay was run. It retained a 12,034-company completed checkpoint and finished the remaining 26,022 companies in four disjoint batches after a fingerprint-resume attempt; a manifest records every company and batch. The final targeted run includes all code changes made during replay. Superseded output staging was deleted; only the newest comparison output remains.
- **26,801 source files hash-verified, zero changed or missing**. Hold SHA-256 remains `a5defda8067e82dee447d696da4a00975a7e05fe1b5a785a8f1059ccf7a6de0e`. Replay writes were restricted to this staging tree; no push, deployment, remote publication or hold removal occurred. A diagnostic command initially hit the write guard due to the tsx cache; it was rerun with caching disabled.
- All **173 focused tests in 10 files passed**, and the scoped TypeScript check passed; logs are attached. The complete repository suite is not claimed. Final `git diff --check` passed.
- Exact diff: **5081 → 5079 files**, **627,867 changed JSON leaves**, **240,813 exact price exclusions**, **387,054 residual leaves**. See `nightly-5-exact-summary.json` and the compressed JSON-path ledger. Exit 1 from the diff means differences exist, not an execution failure. Financial changes are not excluded by tolerance. All four remaining history-start shifts (CBG, MU, JBL, FDS) accompany a new fiscal year and retain 30 years. There are **105** same-year numeric-to-null observations; these are recorded as additional unresolved data-quality observations, not silently excluded. They and the all-company history checks are independently recorded in `nightly-5-final-evidence.json` and `nightly-5-same-year-series-nulls.json`.
- Free disk at report generation: **31.41 GiB**; monitored throughout with a 4 GiB stop threshold. No disk stop occurred. No subagents or keys printed.

**Recommendation: KEEP HOLD.** 98 verdict-change reviews still require current-side source agreement; the exact residuals above prevent a LIFT recommendation.
