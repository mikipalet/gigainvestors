# Berkshire purchase calibration — research proposal, live defaults unchanged
Run date: 2026-09-30. Code baseline: `da56aec`, isolated branch `value-r-buffett`. Output directory: `/Users/miki/value-corpus/staging/buffett-1`. No build, deployment, push, or write to live corpus analysis files. The numerical current-corpus snapshot is recorded in `input-manifest.json`; another analysis job was active, so this is a captured read interval, not an atomic database snapshot.

**Finding:** the current method misses Apple at the estimated 2016 purchase prices, even though Apple passes all five numeric quality tests. A limited durable-grower proposal admits the initial manager purchase and puts Buffett’s later general-account purchase within 20% of the buy price. It does not make most Berkshire purchases buys. The evidence does **not** justify claiming that parameter tuning alone repairs the checklist, or changing live defaults yet.

**Important scope limit:** this is a dated-fiscal-prefix replay using currently restated fundamentals, **not a certified point-in-time backtest**. The requested “only information available then” standard cannot be established from this corpus: it lacks archived as-filed financial vintages, historical report-reading outputs, and a consistently reconciled historical share basis. Those gaps are reported rather than replaced with current data disguised as historical knowledge. No claim that the full strict point-in-time request is complete is made here.

## Evidence and method
- Downloaded 131 SEC 13F-HR/13F-HR-A documents for CIK 0001067983, consolidated into every quarter from 2004 Q1 to 2025 Q4 (88 quarters). The 2004 baseline prevents preexisting holdings being mislabeled 2005 first buys. Amendments are applied in filing order: restatements replace, new-holdings amendments supplement. Confidential-treatment amendments reveal historical holdings; their later publication is acquisition evidence, not a fundamental input to the historical decision.
- `holding-events.json` contains 649 positive reported share deltas, with CUSIP, date, shares, mapped issuer, and original accession URLs. These are **net holdings changes**, not trade records. Splits, mergers and custodian/manager changes can cause adds without purchases. The scored sample uses first observations plus the requested documented supplemental cases, and labels known special/corporate-action cases. Repeated CUSIPs can describe one issuer; the all-record score is a coverage diagnostic, not a count of independent Buffett decisions.
- The two legacy entry-count discrepancies (2006 Q2 original: stated 83, parsed 84; JNJ amendment: stated 4, visibly two rows) reconcile to each filing’s stated market value. `sec/manifest.json` also records one $8,000 legacy value-total discrepancy and all unresolved totals; none is silently corrected. Raw filings remain in `sec/` for audit.
- A purchase quarter uses only fiscal annual reports with a provider filing date **strictly before the quarter starts**. We take the latest valid filing date across financial tables, reject fiscal-end placeholders, truncate the raw input before normalization, run the existing integrity suffix logic, and use no current TTM or current-share override. Missing-date Japanese inputs receive an explicitly marked 183-day lag; `filing-lag-sensitivity.json` separately measures that fallback for the named set. These date rules reduce look-ahead but cannot undo restatements.
- Historical quality means the five current **numeric** tests. Historical Jev/report readings do not exist; today’s qualitative answers are not reused. Current-corpus comparison preserves all cached numeric/qualitative quality results and publication data-quality gates.
- The corpus’s monthly tuples have closing price only. Quarter price is the mean of all three monthly closes, never labeled VWAP or Berkshire’s execution cost. Missing months are not interpolated. The monthly-close minimum/maximum are recorded, but are not the quarter’s actual trading range. KO 1988 uses disclosed cost; Snowflake uses its $120 offering/private-placement price; BYD records HKD 8 on the original share basis. Year-only AXP 1994 uses an annual mean and a start-of-year information cutoff.
- Monthly local government yields preceding the purchase quarter come from [FRED US](https://fred.stlouisfed.org/series/GS10), [Japan](https://fred.stlouisfed.org/series/IRLTLT01JPM156N), [UK](https://fred.stlouisfed.org/series/IRLTLT01GBM156N) and [Switzerland](https://fred.stlouisfed.org/series/IRLTLT01CHM156N). TSMC uses a labeled US-listed ADR hurdle proxy (the 10% floor binds), and lagged [TWD/USD](https://fred.stlouisfed.org/series/EXTAUS). Its provider share series is about 5.186bn ADR equivalents, not 25.93bn ordinary shares: no second 5× adjustment is applied. FX for other unmatched reporting/trading currencies remains unavailable.
- Buy requires all five passes, integrity and comparison checks, price ≤ intrinsic midpoint × (1−MOS), **and** modeled owner yield + stage-one growth ≥ required return. “Within 20%” uses price/buy-price ≤1.20 with the same quality and return gates. Financial valuations have no operating-owner-return estimate, so the current publication gate cannot approve them. Expected return here is the live yield-plus-growth metric, not a DCF IRR or realized return.

## Before / after scores
| Cohort | Records | Quality pass | Quality unknown | Comparable price/value | Buy before → after | Within 20% before → after |
| --- | --- | --- | --- | --- | --- | --- |
| All evidence/scenario records | 195 | 14 / 71 decidable | 124 | 66 | 1 → 2 | 2 → 4 |
| Ordinary, excluding documented managers, specials and end-window sensitivities | 170 | 12 / 63 decidable | 107 | 59 | 1 → 1 | 2 → 3 |
| Requested names (including special/window scenarios) | 55 | 7 / 29 decidable | 26 | 29 | 0 → 1 | 0 → 2 |
| Documented manager picks | 5 | 2 / 3 decidable | 2 | 3 | 0 → 1 | 0 → 1 |
| Regretted set | 7 | 0 / 4 decidable | 3 | 4 | 0 → 0 | 0 → 0 |

Under the current method, the historical buy is Exxon Mobil’s 2009 Q2 first observation; the proposal adds Apple 2016 Q1. The proposal’s only additional named buy is explicitly a manager pick, not Buffett’s own first decision. Thus the ordinary cohort’s buy count does not improve. Missing data is neither a successful rejection nor a missed buy. The sample includes survivorship and availability bias and cannot supply a population precision/recall estimate.

Apple’s early-quarter close proxy is 25.25, versus a proposed buy price of 27.06; the three monthly closes span 24.17–27.25. The highest monthly close exceeds the proposed buy price, so the new buy classification is sensitive to execution-price uncertainty.

Regretted purchases: IBM, Delta, United and Southwest are explicitly rejected by at least one numeric quality test (4/7). KHC, AAL and Tesco are unknown under known-date coverage. The 183-day missing-date sensitivity also rejects AAL and Tesco (6/7); KHC remains unknown. That sensitivity is weaker evidence, and legacy predecessor/restatement problems remain. None is newly admitted by the proposal.

## Requested purchase table
Tests are **understandable / moat / economics / management / accounting**, with P=pass, F=fail, U=unavailable/unclear. Values are in the indicated trading units, on the available price series’ share basis; `—` means unavailable, not zero. A=add to a preexisting position; †=special structure/corporate action; M=documented manager; S=end-window sensitivity for the same Japanese accumulation. BAC/OXY preferred rows show a common-share counterfactual, not the package’s cost or valuation. Full reasons, metrics, source URLs, fiscal years, normalization bridges and hashes are in `purchases.json`.

| Company | Purchase window | Price | Our buy price | Price/buy | Proposed buy | Proposed ratio | Expected return before → after | Tests | Blocked by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| US Bancorp (USB.US) | 2006 Q1 | 30.44 USD | 11.54 | 2.64× | 11.54 | 2.64× | — → — | PPUPP | economics:unclear; price; return |
| Bank of America (BAC.US) | 2007 Q2 | 50.17 USD | 15.16 | 3.31× | 15.16 | 3.31× | — → — | PPUFP | economics:unclear; management:fail; price; return |
| IBM (IBM.US) | 2011 Q1 | 155.18 USD | 56.84 | 2.73× | 56.84 | 2.73× | 5.9% → 5.9% | PPPFP | management:fail; price; return |
| Mastercard (MA.US) | 2011 Q1 M | 24.29 USD | 2.51 | 9.68× | 2.51 | 9.68× | 0.9% → 0.9% | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; price; return |
| Visa (V.US) | 2011 Q3 M | 21.59 USD | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| DaVita (DVA.US) | 2011 Q4 M | 37.00 USD | 3.11 | 11.91× | 18.33 | 2.02× | 4.8% → 14.8% | PPPPP | price; return |
| General Motors (GM.US) | 2012 Q1 | 25.23 USD | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| Precision Castparts (PCP.US) | 2012 Q3 | 159.99 USD | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| VeriSign (VRSN.US) | 2012 Q4 | 36.68 USD | — | — | — | — | — → — | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; <7 years; owner earnings not positive; return |
| Charter (CHTR.US) | 2014 Q2 | 145.68 USD | — | — | — | — | — → — | FFPPP | understandable:fail; moat:fail; owner earnings not positive; return |
| Kraft Heinz (KHC.US) | 2015 Q3 † | 74.24 USD | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| Apple (AAPL.US) | 2016 Q1 M | 25.25 USD | 19.70 | 1.28× | 27.06 | 0.93× | 14.4% → 18.1% | PPPPP | price |
| Charter (CHTR.US) | 2016 Q2 † | 219.94 USD | — | — | — | — | — → — | FFUFP | understandable:fail; moat:fail; economics:unclear; management:fail; owner earnings not positive; return |
| Delta (DAL.US) | 2016 Q3 | 38.29 USD | 5.21 | 7.35× | 5.21 | 7.35× | 3.5% → 3.5% | FPPPP | understandable:fail; price; return |
| United Airlines (UAL.US) | 2016 Q3 | 49.92 USD | 8.28 | 6.03× | 8.28 | 6.03× | 5.5% → 5.5% | FFPFP | understandable:fail; moat:fail; management:fail; price; return |
| American Airlines (AAL.US) | 2016 Q3 | 36.14 USD | — | — | — | — | — → — | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; owner earnings not positive; return |
| Southwest (LUV.US) | 2016 Q4 | 45.50 USD | 9.65 | 4.72× | 9.65 | 4.72× | 10.2% → 10.2% | FFPPP | understandable:fail; moat:fail; price |
| Sirius XM (SIRI.US) | 2016 Q4 | 43.97 USD | 4.18 | 10.52× | 4.18 | 10.52× | 8.4% → 8.4% | FFPFP | understandable:fail; moat:fail; management:fail; price; return |
| Amazon (AMZN.US) | 2019 Q1 M | 85.66 USD | — | — | — | — | — → — | FPFFP | understandable:fail; economics:fail; management:fail; owner earnings not positive; return |
| Occidental (OXY.US) | 2019 Q3 | 46.44 USD | 0.97 | 47.67× | 0.97 | 47.67× | 2.0% → 2.0% | FFFFP | Unverified ratio: price / value is outside 0.2×–20×; understandable:fail; moat:fail; economics:fail; management:fail; price; return |
| Kroger (KR.US) | 2019 Q4 | 26.99 USD | 7.03 | 3.84× | 7.03 | 3.84× | 9.6% → 9.6% | PFFFP | moat:fail; economics:fail; management:fail; price; return |
| Chevron (CVX.US) | 2020 Q3 | 79.96 USD | 28.51 | 2.80× | 28.51 | 2.80× | 6.9% → 6.9% | FFFPP | understandable:fail; moat:fail; economics:fail; price; return |
| Snowflake (SNOW.US) | 2020 Q3 † | 120.00 USD | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| TSMC ADR (TSM.US) | 2022 Q3 | 80.13 USD | 36.67 | 2.19× | 43.86 | 1.83× | 11.0% → 8.6% | PPPPP | price |
| Lennar B (LEN-B.US) | 2023 Q2 | 96.75 USD | 100.68 | 0.96× | 100.68 | 0.96× | 16.6% → 16.6% | PFPFP | moat:fail; management:fail |
| D.R. Horton (DHI.US) | 2023 Q2 | 112.78 USD | 71.88 | 1.57× | 71.88 | 1.57× | 13.5% → 13.5% | PFPFF | moat:fail; management:fail; accounting:fail; price |
| Chubb (CB.US) | 2023 Q3 | 204.49 USD | 77.80 | 2.63× | 77.80 | 2.63× | — → — | PPFFP | economics:fail; management:fail; price; return |
| Ulta Beauty (ULTA.US) | 2024 Q2 | 395.27 USD | 261.61 | 1.51× | 261.61 | 1.51× | 13.6% → 13.6% | PPPPP | price |
| Sirius XM (SIRI.US) | 2024 Q3 † | 30.35 USD | 11.40 | 2.66× | 11.40 | 2.66× | 12.9% → 12.9% | PPPFP | management:fail; price |
| Domino’s (DPZ.US) | 2024 Q3 | 424.35 USD | 80.61 | 5.26× | 105.13 | 4.04× | 11.1% → 12.2% | PPPPP | price |
| Pool (POOL.US) | 2024 Q3 | 367.49 USD | 136.16 | 2.70× | 201.75 | 1.82× | 11.4% → 15.4% | PPPPP | price |
| Lennar A (LEN.US) | 2025 Q1 | 121.88 USD | 174.43 | 0.70× | 174.43 | 0.70× | 19.1% → 19.1% | PFPPP | moat:fail |
| Nucor (NUE.US) | 2025 Q1 | 128.75 USD | 124.80 | 1.03× | 124.80 | 1.03× | 17.5% → 17.5% | FFPPP | understandable:fail; moat:fail; price |
| Wells Fargo (WFC.US) | 2005 Q3 A | 29.92 USD | 18.18 | 1.65× | 18.18 | 1.65× | — → — | PPUPP | economics:unclear; price; return |
| Moody’s (MCO.US) | 2005 Q2 A | 43.10 USD | 8.65 | 4.98× | 8.65 | 4.98× | 2.3% → 2.3% | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; price; return |
| Apple (AAPL.US) | 2016 Q4 | 28.32 USD | 19.70 | 1.44× | 27.06 | 1.05× | 13.7% → 17.4% | PPPPP | price |
| Bank of America (BAC.US) | 2011 Q3 † | 8.00 USD | 22.22 | 0.36× | 22.22 | 0.36× | — → — | FFFFP | Unverified ratio: price / value is outside 0.2×–20×; understandable:fail; moat:fail; economics:fail; management:fail; return |
| Occidental (OXY.US) | 2019 Q2 † | 52.98 USD | 0.97 | 54.38× | 0.97 | 54.38× | 1.8% → 1.8% | FFFFP | Unverified ratio: price / value is outside 0.2×–20×; understandable:fail; moat:fail; economics:fail; management:fail; price; return |
| Occidental (OXY.US) | 2022 Q1 | 46.05 USD | — | — | — | — | — → — | FFFFP | understandable:fail; moat:fail; economics:fail; management:fail; owner earnings not positive; return |
| D.R. Horton (DHI.US) | 2025 Q2 | 124.44 USD | 175.50 | 0.71× | 175.50 | 0.71× | 19.4% → 19.4% | PFPPP | moat:fail |
| Coca-Cola (KO.US) | 1988 | 2.61 USD | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| American Express (AXP.US) | 1994 | 8.11 USD | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| Moody’s (MCO.US) | 2000 Q3 † | 12.17 USD | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| Tesco (TSCO.LSE) | 2006 Q1 | 416.31 GBX | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; historical FX / ADR basis unavailable; insufficient owner earnings history; return |
| BYD H (1211.HK) | 2008 Q3 † | 8.00 CNY | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| Itochu (8001.JP) | 2019 Q3 | 428.77 JPY | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| Itochu (8001.JP) | 2020 Q2 S | 450.43 JPY | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; insufficient owner earnings history; return |
| Marubeni (8002.JP) | 2019 Q3 | 701.93 JPY | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| Marubeni (8002.JP) | 2020 Q2 S | 511.60 JPY | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; insufficient owner earnings history; return |
| Mitsubishi (8058.JP) | 2019 Q3 | 908.06 JPY | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| Mitsubishi (8058.JP) | 2020 Q2 S | 787.22 JPY | — | — | — | — | — → — | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; insufficient owner earnings history; return |
| Mitsui (8031.JP) | 2019 Q3 | 868.33 JPY | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| Mitsui (8031.JP) | 2020 Q2 S | 790.67 JPY | — | — | — | — | — → — | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; insufficient owner earnings history; return |
| Sumitomo (8053.JP) | 2019 Q3 | 408.67 JPY | — | — | — | — | — → — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| Sumitomo (8053.JP) | 2020 Q2 S | 313.42 JPY | — | — | — | — | — → — | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; insufficient owner earnings history; return |

Purchase-date corrections and attribution:
- **Apple:** [Berkshire’s 2020 letter](https://www.berkshirehathaway.com/2020ar/2020ar.pdf) distinguishes Buffett’s late-2016 general-account buying from a small separately managed earlier holding. Both are evaluated, and only the latter is excluded as a documented manager pick.
- **PCP:** the SEC sequence first shows Precision Castparts in **2012 Q3**, not 2011. **Charter** first appears in 2014 Q2; the 2016 CUSIP transition is tagged separately. **Sirius** first appears in 2016 Q4; its 2024 reorganization is separate. **Nucor** appears in a subsequently amended 2025 Q1 filing, earlier than its broad public disclosure. The quarter/accession trail is retained in the dataset.
- **Japanese trading houses:** [Berkshire’s announcement](https://www.berkshirehathaway.com/news/aug3020.pdf) describes purchases over approximately twelve months through August 2020, not an exact single quarter or disclosed average price. Start/end-window scenarios are shown separately. Their short available financial history prevents decisive ten-year quality scores.
- **Early buys:** [KO 1988](https://www.berkshirehathaway.com/letters/1988.html) discloses $592.54m for 14,172,500 shares, or $41.81 then / $2.613 after subsequent 16:1 splits. [AXP 1994](https://www.berkshirehathaway.com/letters/1994.html) documents additions. MCO 2000 is inherited via the Dun & Bradstreet spin-off, not a separately priced ordinary purchase. Price history alone does not supply the missing pre-purchase accounts for these cases.
- **Specials:** [BAC 2011](https://www.berkshirehathaway.com/2011ar/2011ar.pdf) was $5bn of preferred plus warrants; [OXY 2019](https://www.berkshirehathaway.com/2019ar/2019ar.pdf) included preferred financing and warrants. [BYD’s 2008 annual report](https://www.hkexnews.hk/listedco/listconews/sehk/2009/0419/ltn20090419045.pdf) gives HKD 8 for 225m subscribed H shares. [Snowflake’s prospectus](https://www.sec.gov/Archives/edgar/data/1640147/000162828020013667/snowflake424b4.htm) gives $120; a quarter-average traded price would misstate that transaction. KHC’s formation and predecessor investments are not a normal first open-market buy.
- **Managers:** [Amazon is directly attributed by Buffett to one of the two managers](https://buffett.cnbc.com/video/2019/05/06/berkshires-amazon-buy-isnt-a-shift-away-from-value-investing.html); [Visa/Mastercard reporting identifies Combs](https://fortune.com/2012/02/25/dont-believe-every-buffett-buys-headline/); [DaVita reporting identifies Weschler](https://www.forbes.com/sites/steveschaefer/2013/07/08/after-obamacare-hit-davita-gets-berkshire-bump/). Other positions remain unattributed; small size alone does not prove Todd/Ted ownership. Snowflake is labeled attribution unresolved and special, rather than assigned on speculation.

## Diagnosis and measured component sensitivities
Current valuation already calculates ten-year per-share owner-earnings growth. Its effective growth is the **minimum** of that rate, per-share revenue CAGR, an acquisition-adjusted revenue proxy, and ROIIC × reinvestment, capped at 8%. Raising only the cap will not fix a zero-growth result from another estimate. The following are one-component sensitivities, **not alternative approved buys**; quality tests and the expected-return gate can still reject the name.

| Company | Date | Current buy | 8% hurdle floor | 15% MOS | OE CAGR ≤8% | OE CAGR ≤12% | No maintenance floor | Latest OE | No net-cash adjustment |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Apple | 2016 Q1 M | 19.70 | 28.25 | 25.76 | 19.70 | 24.69 | 19.70 | 27.44 | 20.37 |
| IBM | 2011 Q1 | 56.84 | 81.45 | 74.33 | 85.50 | 89.52 | 62.33 | 83.20 | 62.72 |
| DaVita | 2011 Q4 M | 3.11 | 9.47 | 3.52 | 12.35 | 18.64 | 5.16 | 4.10 | 16.45 |
| Domino’s | 2024 Q3 | 80.61 | 143.83 | 91.36 | 80.61 | 126.99 | 80.61 | 80.61 | 189.36 |
| Pool | 2024 Q3 | 136.16 | 188.90 | 178.05 | 136.16 | 174.85 | 136.16 | 136.16 | 157.99 |
| Ulta Beauty | 2024 Q2 | 261.61 | 361.59 | 342.10 | 261.61 | 329.54 | 307.76 | 317.34 | 277.40 |

1. **Required-return floor and margin of safety compound.** Apple’s 2016 op-margin CV is 25.35%, so the live method applies **35%**, not 25%, MOS. Margin expansion across a decade can produce moderate CV even when the business is improving. Lowering the hurdle to 8% or lowering MOS alone is a sensitivity, not a reason to admit all cheap securities. The proposal retains the 10% hurdle.
2. **Normalization adds another lag.** The live method uses the lesser of five-year median aggregate OE, latest OE and complete TTM OE, then divides by the valuation share count. That can mix older aggregate earnings with a newer share base. The proposed three-year **per-share** normalization reduces that mismatch. It is not universally higher: mature businesses or slowing growth can receive lower values.
3. **The maintenance-capex floor is not the single explanation.** Its removal is measured above. It protects against treating replacement spending as growth. The proposal leaves the floor, stock compensation, lease cash costs and minority allocation intact.
4. **ROIC and ROIIC need separate scrutiny.** Current ROIC subtracts all cash and goodwill from capital and treats positive profit on nonpositive capital as unlimited returns. Economic ROIIC is also applied to financials. This can both flatter asset-light/negative-capital firms and reject businesses whose investment proxy is incomplete. The proposal requires at least eight finite ROIC observations and a finite median ≥20%; it does not weaken any quality test.
5. **The $1 retained-earnings test rejects IBM at the actual decision era.** IBM 2011’s market-cap gain over the available ten-year window is below cumulative retained earnings. It can also penalize a temporarily derated wonderful business, and depends critically on historical price/share compatibility. That is a distinct checklist design issue, not repairable merely by raising DCF growth.
6. **The moat check has fixed calendar years.** Its gross-margin comparison uses FY2019/FY2020 against FY2023. Before those years exist, it is missing; the available-fraction rule can still let the other two moat checks pass. This is not future data leakage in this replay (future years are removed), but it means historical and current tests are not temporally equivalent. A rolling structural margin test deserves a separate calibration.
7. **Financial companies have an outright publication mismatch.** Book-value valuation can produce a price, but the owner-return helper only returns an estimate for operating OE valuations. The additional required-return gate therefore prevents every bank/insurer from becoming a published buy. The proposal leaves this unchanged; a financial return model should be designed and tested separately.
8. **Share, ADR and currency bases can swamp parameters.** The initial TSMC comparison mixed TWD value with USD price; it is converted here using ADR-equivalent shares and historical FX. IBM’s series includes the Kyndryl adjustment; SIRI underwent a reverse split/reorganization. The corpus does not certify every historical share basis. These caveats remain attached to the results; they are not evidence that a 4×–10× ratio is intrinsically correct.
9. **Equity earnings versus debt treatment warrants review.** OE starts from net income, already after interest, while valuation also adds net cash (subtracting debt). That mixes an equity-earnings starting point with an enterprise-value bridge. The last sensitivity column removes the bridge; it is not adopted. A coherent alternative must choose equity cash flow plus appropriate debt service, or unlevered cash flow with an enterprise discount rate and debt subtraction. Simply deleting debt for every leveraged company would not be a validated fix.

## Proposed isolated method
`proposeValuation()` applies only to operating companies with all five existing quality passes, eleven consecutive positive annual OE/share observations, at least eight finite annual ROIC observations and a finite median ROIC ≥20%. Stable margins mean CV ≤20%. A moderate-CV firm (≤35%) qualifies only when its latest operating margin is at least its ten-year median; this distinguishes improving margins from accepting deterioration. The quality gates, integrity, currency, comparison flags and required-return gate still apply.

- Growth = `max(0, min(12%, 75% × ten-year OE/share CAGR, 75% × five-year OE/share CAGR))`. Falling three-year revenue, unavailable history, or nonpositive growth do not qualify. No company name, Berkshire ownership, market-cap rank or subsequent outcome is an input.
- Normalized OE/share = lesser of the last three-year median and latest observation, preserving a binding lower complete TTM observation. Existing maintenance capex, SBC, lease and minority treatment is retained.
- MOS = 15% for stable qualifying businesses, 25% for qualifying moderate businesses with nondeclining margins. All other valuations and margins remain exactly as supplied. Discount floor stays 10%, bond spread 4pp, terminal growth 3%, and the existing ten-year fade stays unchanged.

These choices were revised after inspecting this same sample (in particular the distinction between growing and deteriorating moderate margins). They are **in-sample hypotheses**, not holdout-validated parameters. The measured improvement is small, and concentrated in Apple. Keep this module as a research proposal until tested on archived financial vintages and an independently selected historical control set. Existing junk-calibration labels supply a guardrail, but do not prove that every newly admitted small company is high quality.

## Full current-corpus buy zone
Scanned **19,056** existing analysis records. **373** have five cached quality passes; **148** qualify for the valuation proposal. Buy zone: **19 → 31**; 12 additions, 0 removals. Western list: **3 → 7**. This applies the same publication gates on both sides; annual fundamentals feed the experimental growth estimator. Cached analyses are never overwritten.

| Company | ID | Western listing | Current price/buy | Proposed price/buy | Change |
| --- | --- | --- | --- | --- | --- |
| Luzhou Lao Jiao Co Ltd | 000568.SHE | — | 1.07× | 0.52× | ADDED |
| Dongfang Electronics Co Ltd | 000682.SHE | — | 1.23× | 0.77× | ADDED |
| Beijing New Building Materials Public Ltd Co | 000786.SHE | — | 0.70× | 0.70× | retained |
| Hisense Kelon Electrical Holdings Co Ltd | 000921.SHE | — | 0.74× | 0.74× | retained |
| Worldex Industry & Trading Co. Ltd | 101160.KQ | — | 0.81× | 0.81× | retained |
| Humedix Co Ltd | 200670.KQ | — | 0.67× | 0.67× | retained |
| Channel Well Technology Co Ltd | 3078.TWO | — | 0.74× | 0.69× | retained |
| 104 Corporation | 3130.TW | — | 0.91× | 0.91× | retained |
| TAIDOC TECHNOLOGY CORP | 4736.TW | — | 0.93× | 0.93× | retained |
| Henan Lingrui Pharmaceutical Co Ltd | 600285.SHG | — | 1.34× | 0.80× | ADDED |
| Shanxi Xinghuacun Fen Wine Factory Co Ltd | 600809.SHG | — | 0.99× | 0.60× | retained |
| G-bits Network Technology Xiamen Co Ltd | 603444.SHG | — | 0.94× | 0.99× | retained |
| Proya Cosmetics Co Ltd Class A | 603605.SHG | — | 1.03× | 0.64× | ADDED |
| Beijing United Information Technology Co Ltd | 603613.SHG | — | 0.84× | 0.69× | retained |
| KIMURA CHEMICAL PLANTS CO., LTD. | 6378.JP | — | 0.88× | 0.88× | retained |
| Global Mixed-Mode Technology Inc | 8081.TW | — | 1.02× | 1.00× | ADDED |
| Fujii Sangyo Corporation | 9906.JP | — | 0.69× | 0.69× | retained |
| Taiwan Sakura Corp | 9911.TW | — | 1.18× | 0.94× | ADDED |
| Precia S.A. | ALPM.PA | ALPM.PA | 0.98× | 0.98× | retained |
| Ambra SA | AMB.WAR | AMB.WAR | 0.92× | 0.92× | retained |
| Jumbo S.A. | BELA.AT | — | 0.77× | 0.77× | retained |
| Dermapharm Holding SE | DMP.XETRA | DMP.XETRA | 1.50× | 0.99× | ADDED |
| Infosys Ltd ADR | INFY.US | INFY.US | 0.97× | 0.92× | retained |
| Neurones | NRO.PA | NRO.PA | 1.15× | 0.98× | ADDED |
| Olympia Financial Group Inc | OLY.TO | OLY.TO | 1.16× | 0.79× | ADDED |
| Premier Marketing Public Company Limited | PM.BK | — | 1.57× | 0.84× | ADDED |
| Sido Muncul PT | SIDO.JK | — | 1.20× | 0.80× | ADDED |
| Selamat Sempurna Tbk | SMSM.JK | — | 0.85× | 0.64× | retained |
| Siantar Top Tbk | STTP.JK | — | 0.97× | 0.52× | retained |
| Tigaraksa Satria Tbk | TGKA.JK | — | 0.87× | 0.87× | retained |
| Wolters Kluwer N.V. | WKL.AS | WKL.AS | 2.27× | 0.97× | ADDED |

Western additions are **Dermapharm, Neurones, Olympia Financial and Wolters Kluwer**. Ambra, Infosys and Precia remain. “Western” follows the existing venue whitelist; for example Jumbo on Athens is not classified Western by that code. The output is a model screen, not a claim of independent fundamental due diligence on the added names.

| Current franchise | Current ratio | Proposed ratio |
| --- | --- | --- |
| AAPL.US | 4.12× | 3.66× |
| DPZ.US | 3.02× | 3.07× |
| KO.US | 5.65× | 3.25× |
| MA.US | 3.26× | 2.04× |
| MCO.US | 4.64× | 3.47× |
| POOL.US | 3.90× | 3.90× |
| V.US | 2.65× | 2.02× |

Today’s Apple/KO gaps do not establish that the model would reject their original purchases. The separate purchase-quarter replay supplies that evidence for Apple; the available pre-1988 KO financial data does not. The proposed method still leaves these current famous franchises outside the buy zone.

## Verification and reproducibility
Validation: 104 TypeScript unit tests across the new module and calibration rounds 1–4 pass; two Python SEC parser tests pass; a scoped TypeScript `--noEmit --incremental false` check (1GB heap cap) passes. The real existing calibration command below exits 0: 9 true positives, 15 true negatives, 0 false positives, 0 false negatives, 1 unclear (AXP), 3 missing (NCLH/LCID/RIVN), 8 exceptions. The cached full-corpus summary differs because the command recomputes against this branch’s code; neither unclear nor missing is counted as success. No production valuation/config file changed, so the proposed variant preserves those quality labels by construction.

```sh
python3 scripts/value/buffett-filings.py
python3 scripts/value/buffett-sources.py
npx tsx scripts/value/buffett-calibrate.ts
# Fast historical rerun without replacing the current-corpus snapshot:
npx tsx scripts/value/buffett-calibrate.ts --purchases-only
npx tsx scripts/value/buffett-calibration-fixture.ts
VALUE_CORPUS_DIR=$HOME/value-corpus/staging/buffett-1/calibration npm run value -- calibrate
npx vitest run tests/unit/value/buffett-calibration.test.ts tests/unit/value/calibration-round-{1,2,3,4}.test.ts
python3 tests/unit/value/buffett_filings_test.py
python3 scripts/value/buffett-report.py
```

`buffett-sources.py` uses the existing local EODHD credential for eight small supplemental issuer fetches, never prints it, and writes only the staging cache. The fixture is one small independent staging copy, not a symlink to mutable live inputs. No web build was run. Every runner checks disk free space against 5 GiB before outputs. Disk was above 9 GiB at verification; generated artifacts total about 100 MB including that fixture. A replay on a changing corpus can differ; the saved JSON outputs, hashes and logs are the evidence for this report.

Remaining work for the strict question: archived as-filed accounts at each purchase, known historical filing dates for early/foreign issuers, transaction-level or genuine volume-weighted price evidence, complete corporate-action/share reconciliation, historical report interpretation, and manager attribution beyond documented cases. In particular KO 1988, early AXP, the Japanese trading houses, BYD and PCP cannot be declared checklist misses from the available data. No live-default change is recommended on this evidence alone.

## Appendix: all scored evidence records
This preserves every first-CUSIP observation and supplemental case, including unresolved issuers and special structures. The larger SEC holdings-change dataset is `holding-events.json`. A missing value prevents a price verdict; it is not a rejection.

| Issuer / CUSIP | Date | Price | Buy price | Ratio | Proposed ratio | Tests | Blocked by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PG.US | 2005 Q1 | 53.11 | 10.28 | 5.16× | 1.80× | PPPPP | price; return |
| HD.US | 2005 Q2 | 37.87 | 17.53 | 2.16× | 2.16× | PPPPP | price |
| LXK.US | 2005 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| LOW.US | 2005 Q2 | 27.92 | 1.89 | 14.75× | 14.75× | PFFPP | moat:fail; economics:fail; price; return |
| TYC.US | 2005 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| WMT.US | 2005 Q2 | 15.84 | 5.77 | 2.74× | 2.74× | PFFPP | moat:fail; economics:fail; price |
| AMP.US | 2005 Q3 | — | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; purchase price unavailable; no share count; return |
| COP.US | 2005 Q4 | 46.77 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| GE.US | 2006 Q1 | 160.39 | — | — | — | PFFPP | moat:fail; economics:fail; debt exceeds the value of owner earnings; return |
| JNJ.US | 2006 Q1 | 58.14 | 32.12 | 1.81× | 1.81× | PPPPP | price |
| USB.US | 2006 Q1 | 30.44 | 11.54 | 2.64× | 2.64× | PPUPP | economics:unclear; price; return |
| UPS.US | 2006 Q1 | 76.33 | 24.70 | 3.09× | 3.09× | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; <7 years; price; return |
| OSI.US | 2006 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| SNY.US | 2006 Q2 | — | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; purchase price unavailable; no share count; return |
| TGT.US | 2006 Q2 | 50.30 | 4.10 | 12.27× | 12.27× | PFFPP | moat:fail; economics:fail; price; return |
| NSC.US | 2006 Q3 | 43.40 | 11.43 | 3.80× | 3.80× | PFPPP | moat:fail; price; return |
| UNP.US | 2006 Q3 | 21.11 | 3.84 | 5.49× | 5.49× | FFFPP | understandable:fail; moat:fail; economics:fail; price; return |
| WU.US | 2006 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| BNI.US | 2006 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| IR.US | 2006 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| UNH.US | 2006 Q4 | 50.53 | 11.57 | 4.37× | 4.37× | FPUPP | understandable:fail; economics:unclear; price |
| DJ.US | 2007 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| BAC.US | 2007 Q2 | 50.17 | 15.16 | 3.31× | 3.31× | PPUFP | economics:unclear; management:fail; price; return |
| KFT.US | 2007 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| KMX.US | 2007 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| WBC.US | 2007 Q3 † | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| IR.US | 2007 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| 892893108 | 2007 Q4 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| GSK.US | 2007 Q4 | — | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; historical FX / ADR basis unavailable; purchase price unavailable; no share count; return |
| WBC.US | 2007 Q4 † | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| NRG.US | 2008 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| ETN.US | 2008 Q3 | 33.40 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| CEG-2008.US | 2008 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| NLC.US | 2008 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| BDX.US | 2009 Q2 | 51.00 | 42.68 | 1.19× | 1.19× | PPPPP | price |
| XOM.US | 2009 Q2 | 68.64 | 100.84 | 0.68× | 0.68× | PPPPP | none |
| NSRGY.US | 2009 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| RSG.US | 2009 Q3 | 26.26 | — | — | — | PFFFP | moat:fail; economics:fail; management:fail; debt exceeds the value of owner earnings; return |
| TRV.US | 2009 Q3 | 47.57 | 29.67 | 1.60× | 1.60× | FFFFP | understandable:fail; moat:fail; economics:fail; management:fail; price; return |
| ELV.US | 2009 Q3 | 50.95 | 37.92 | 1.34× | 1.34× | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; price |
| FISV.US | 2010 Q2 | 12.03 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| BK.US | 2010 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| IBM.US | 2011 Q1 | 155.18 | 56.84 | 2.73× | 2.73× | PPPFP | management:fail; price; return |
| MA.US | 2011 Q1 M | 24.29 | 2.51 | 9.68× | 9.68× | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; price; return |
| DG.US | 2011 Q2 | 33.85 | — | — | — | PFPUP | moat:fail; management:unclear; debt exceeds the value of owner earnings; return |
| VRSK.US | 2011 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| CVS.US | 2011 Q3 | 35.28 | 18.77 | 1.88× | 1.88× | PPPFP | management:fail; price; return |
| GD.US | 2011 Q3 | 63.04 | 84.31 | 0.75× | 0.75× | PPPFP | management:fail |
| INTC.US | 2011 Q3 | 21.27 | 7.04 | 3.02× | 3.02× | FPFFP | understandable:fail; economics:fail; management:fail; price; return |
| DTV.US | 2011 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| V.US | 2011 Q3 M | 21.59 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| LMCA.US | 2011 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| DVA.US | 2011 Q4 M | 37.00 | 3.11 | 11.91× | 2.02× | PPPPP | price; return |
| LEE.US | 2012 Q1 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| GM.US | 2012 Q1 | 25.23 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| VIAB.US | 2012 Q1 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| IR.US | 2012 Q1 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| NOV.US | 2012 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| PSX.US | 2012 Q2 | — | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; purchase price unavailable; no share count; return |
| DE.US | 2012 Q3 | 78.13 | 22.95 | 3.40× | 3.40× | PFFPP | moat:fail; economics:fail; price |
| MEG.US | 2012 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| PCP.US | 2012 Q3 | 159.99 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| DTV.US | 2012 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| MDLZ.US | 2012 Q4 † | 25.96 | 3.19 | 8.14× | 8.14× | PPFFP | economics:fail; management:fail; price; return |
| ADM.US | 2012 Q4 | 26.98 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| KRFT.US | 2012 Q4 † | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| VRSN.US | 2012 Q4 | 36.68 | — | — | — | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; <7 years; owner earnings not positive; return |
| CBI.US | 2013 Q1 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| LMCA.US | 2013 Q1 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| STRZA.US | 2013 Q1 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| SU.US | 2013 Q2 | — | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; historical FX / ADR basis unavailable; purchase price unavailable; no share count; return |
| DISH.US | 2013 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| GHC.US | 2013 Q4 | 395.46 | 177.31 | 2.23× | 2.23× | FFFFP | understandable:fail; moat:fail; economics:fail; management:fail; price; return |
| GS.US | 2013 Q4 | 169.02 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient return on tangible equity history; return |
| LBTYA.US | 2013 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| VZ.US | 2014 Q1 | 47.72 | — | — | — | PPFPP | economics:fail; owner earnings not positive; return |
| LBTYK.US | 2014 Q1 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| CHTR.US | 2014 Q2 | 145.68 | — | — | — | FFPPP | understandable:fail; moat:fail; owner earnings not positive; return |
| DNOW.US | 2014 Q2 | — | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; purchase price unavailable; no share count; return |
| LMCK.US | 2014 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| ESRX.US | 2014 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| MEG.US | 2014 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| QSR.US | 2014 Q4 | — | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; historical FX / ADR basis unavailable; purchase price unavailable; no share count; return |
| FOXA.US | 2014 Q4 | — | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; purchase price unavailable; no share count; return |
| AXTA.US | 2015 Q2 | — | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; purchase price unavailable; insufficient owner earnings history; return |
| KHC.US | 2015 Q3 † | 74.24 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| T.US | 2015 Q3 | 25.31 | 0.28 | 89.92× | 89.92× | UUUUP | Unverified ratio: price / value is outside 0.2×–20×; understandable:unclear; moat:unclear; economics:unclear; management:unclear; <7 years; price; return |
| G5480U138 | 2015 Q3 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| G5480U153 | 2015 Q3 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| KMI.US | 2015 Q4 | 21.95 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| AAPL.US | 2016 Q1 M | 25.25 | 19.70 | 1.28× | 0.93× | PPPPP | price |
| 531229409 | 2016 Q2 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| 531229607 | 2016 Q2 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| 531229854 | 2016 Q2 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| 531229870 | 2016 Q2 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| CHTR.US | 2016 Q2 † | 219.94 | — | — | — | FFUFP | understandable:fail; moat:fail; economics:unclear; management:fail; owner earnings not positive; return |
| DAL.US | 2016 Q3 | 38.29 | 5.21 | 7.35× | 7.35× | FPPPP | understandable:fail; price; return |
| UAL.US | 2016 Q3 | 49.92 | 8.28 | 6.03× | 6.03× | FFPFP | understandable:fail; moat:fail; management:fail; price; return |
| AAL.US | 2016 Q3 | 36.14 | — | — | — | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; owner earnings not positive; return |
| LUV.US | 2016 Q4 | 45.50 | 9.65 | 4.72× | 4.72× | FFPPP | understandable:fail; moat:fail; price |
| MON.US | 2016 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| SIRI.US | 2016 Q4 | 43.97 | 4.18 | 10.52× | 10.52× | FFPFP | understandable:fail; moat:fail; management:fail; price; return |
| STOR.US | 2017 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| SYF.US | 2017 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| TEVA.US | 2017 Q4 | 15.86 | — | — | — | FFPFP | understandable:fail; moat:fail; management:fail; debt exceeds the value of owner earnings; return |
| LILA.US | 2018 Q1 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| LILAK.US | 2018 Q1 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| PNC.US | 2018 Q3 | 141.52 | 81.77 | 1.73× | 1.73× | PPFPP | economics:fail; price; return |
| JPM.US | 2018 Q3 | 114.12 | 45.72 | 2.50× | 2.50× | FPFPF | understandable:fail; economics:fail; accounting:fail; price; return |
| ORCL.US | 2018 Q3 | 49.27 | 8.69 | 5.67× | 5.67× | PPPFP | management:fail; price; return |
| RHT.US | 2018 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| STNE.US | 2018 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| AMZN.US | 2019 Q1 M | 85.66 | — | — | — | FPFFP | understandable:fail; economics:fail; management:fail; owner earnings not positive; return |
| OXY.US | 2019 Q3 | 46.44 | 0.97 | 47.67× | 47.67× | FFFFP | Unverified ratio: price / value is outside 0.2×–20×; understandable:fail; moat:fail; economics:fail; management:fail; price; return |
| GL.US | 2019 Q3 | 92.11 | 22.06 | 4.18× | 4.18× | PPFFP | economics:fail; management:fail; price; return |
| RH.US | 2019 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| KR.US | 2019 Q4 | 26.99 | 7.03 | 3.84× | 3.84× | PFFFP | moat:fail; economics:fail; management:fail; price; return |
| VOO.US | 2019 Q4 † | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| BIIB.US | 2019 Q4 | 298.42 | 237.22 | 1.26× | 1.26× | PPPPP | price |
| SPY.US | 2019 Q4 † | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| GOLD.US | 2020 Q2 | — | — | — | — | UUUUF | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:fail; <7 years; historical FX / ADR basis unavailable; purchase price unavailable; debt exceeds the value of owner earnings; return |
| BMY.US | 2020 Q3 | 60.38 | 6.44 | 9.38× | 9.38× | PPFPP | economics:fail; price; return |
| CVX.US | 2020 Q3 | 79.96 | 28.51 | 2.80× | 2.80× | FFFPP | understandable:fail; moat:fail; economics:fail; price; return |
| MRSH.US | 2020 Q3 | 115.40 | — | — | — | PPPUP | management:unclear; historical FX / ADR basis unavailable; return |
| PFE.US | 2020 Q3 | 35.73 | 18.20 | 1.96× | 1.96× | FPPPP | understandable:fail; price; return |
| SNOW.US | 2020 Q3 † | 120.00 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| TMUS.US | 2020 Q3 | 112.81 | — | — | — | FFFFP | understandable:fail; moat:fail; economics:fail; management:fail; debt exceeds the value of owner earnings; return |
| ABBV.US | 2020 Q3 | 92.76 | 22.46 | 4.13× | 4.13× | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; price; return |
| MRK.US | 2020 Q3 | 79.03 | 20.27 | 3.90× | 3.90× | PFPPP | moat:fail; price; return |
| AON.US | 2021 Q1 | 220.31 | 43.66 | 5.05× | 5.05× | PPFPP | economics:fail; price; return |
| OGN.US | 2021 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| FND.US | 2021 Q3 | — | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; purchase price unavailable; insufficient owner earnings history; return |
| RPRX.US | 2021 Q3 | 37.66 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| ATVI.US | 2021 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| NU.US | 2021 Q4 | — | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; purchase price unavailable; no share count; return |
| CE.US | 2022 Q1 | 145.95 | 38.16 | 3.82× | 3.82× | FPFPF | understandable:fail; economics:fail; accounting:fail; price; return |
| C.US | 2022 Q1 | 59.25 | 40.85 | 1.45× | 1.45× | FFFFF | understandable:fail; moat:fail; economics:fail; management:fail; accounting:fail; price; return |
| MKL.US | 2022 Q1 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| ALLY.US | 2022 Q1 | 47.03 | 14.23 | 3.31× | 3.31× | FFFPP | understandable:fail; moat:fail; economics:fail; price; return |
| HPQ.US | 2022 Q1 | 35.80 | 13.98 | 2.56× | 2.56× | FPPFP | understandable:fail; management:fail; price; return |
| MCK.US | 2022 Q1 | 279.27 | — | — | — | PPPPP | owner earnings not positive; return |
| PARA.US | 2022 Q1 † | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| LPX.US | 2022 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| TSM.US | 2022 Q3 | 80.13 | 36.67 | 2.19× | 1.83× | PPPPP | price |
| JEF.US | 2022 Q3 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| NU.US | 2022 Q4 | 4.51 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient return on tangible equity history; return |
| COF.US | 2023 Q1 | 108.08 | 241.83 | 0.45× | 0.45× | FFPFP | understandable:fail; moat:fail; management:fail |
| DEO.US | 2023 Q1 | — | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; purchase price unavailable; no share count; return |
| VTS.US | 2023 Q1 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| LEN-B.US | 2023 Q2 | 96.75 | 100.68 | 0.96× | 0.96× | PFPFP | moat:fail; management:fail |
| DHI.US | 2023 Q2 | 112.78 | 71.88 | 1.57× | 1.57× | PFPFF | moat:fail; management:fail; accounting:fail; price |
| NVR.US | 2023 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| 531229722 | 2023 Q3 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| 531229748 | 2023 Q3 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| 531229789 | 2023 Q3 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| 531229813 | 2023 Q3 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| 047726302 | 2023 Q3 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| CB.US | 2023 Q3 | 204.49 | 77.80 | 2.63× | 2.63× | PPFFP | economics:fail; management:fail; price; return |
| HEI-A.US | 2024 Q2 | — | 18.06 | — | — | PPFUP | economics:fail; management:unclear; purchase price unavailable; return |
| ULTA.US | 2024 Q2 | 395.27 | 261.61 | 1.51× | 1.51× | PPPPP | price |
| SIRI.US | 2024 Q3 † | 30.35 | 11.40 | 2.66× | 2.66× | PPPFP | management:fail; price |
| DPZ.US | 2024 Q3 | 424.35 | 80.61 | 5.26× | 4.04× | PPPPP | price |
| POOL.US | 2024 Q3 | 367.49 | 136.16 | 2.70× | 1.82× | PPPPP | price |
| STZ.US | 2024 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| LEN.US | 2025 Q1 | 121.88 | 174.43 | 0.70× | 0.70× | PFPPP | moat:fail |
| NUE.US | 2025 Q1 | 128.75 | 124.80 | 1.03× | 1.03× | FFPPP | understandable:fail; moat:fail; price |
| LAMR.US | 2025 Q2 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| ALLE.US | 2025 Q2 | — | 47.11 | — | — | PPPUP | management:unclear; purchase price unavailable; return |
| GOOGL.US | 2025 Q3 | 215.97 | 54.86 | 3.94× | 3.94× | PPFPP | economics:fail; price; return |
| LLYVA.US | 2025 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| 530909308 | 2025 Q4 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| 531229755 | 2025 Q4 | — | — | — | — | UUUUU | No mapped issuer or dated event |
| NYT.US | 2025 Q4 | — | — | — | — | UUUUU | Corpus fundamentals / company unavailable |
| WFC.US | 2005 Q3 A | 29.92 | 18.18 | 1.65× | 1.65× | PPUPP | economics:unclear; price; return |
| MCO.US | 2005 Q2 A | 43.10 | 8.65 | 4.98× | 4.98× | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; price; return |
| AAPL.US | 2016 Q4 | 28.32 | 19.70 | 1.44× | 1.05× | PPPPP | price |
| BAC.US | 2011 Q3 † | 8.00 | 22.22 | 0.36× | 0.36× | FFFFP | Unverified ratio: price / value is outside 0.2×–20×; understandable:fail; moat:fail; economics:fail; management:fail; return |
| OXY.US | 2019 Q2 † | 52.98 | 0.97 | 54.38× | 54.38× | FFFFP | Unverified ratio: price / value is outside 0.2×–20×; understandable:fail; moat:fail; economics:fail; management:fail; price; return |
| OXY.US | 2022 Q1 | 46.05 | — | — | — | FFFFP | understandable:fail; moat:fail; economics:fail; management:fail; owner earnings not positive; return |
| DHI.US | 2025 Q2 | 124.44 | 175.50 | 0.71× | 0.71× | PFPPP | moat:fail |
| KO.US | 1988 | 2.61 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| AXP.US | 1994 | 8.11 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| MCO.US | 2000 Q3 † | 12.17 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| TSCO.LSE | 2006 Q1 | 416.31 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; historical FX / ADR basis unavailable; insufficient owner earnings history; return |
| 1211.HK | 2008 Q3 † | 8.00 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; no share count; return |
| 8001.JP | 2019 Q3 | 428.77 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| 8001.JP | 2020 Q2 S | 450.43 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; insufficient owner earnings history; return |
| 8002.JP | 2019 Q3 | 701.93 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| 8002.JP | 2020 Q2 S | 511.60 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; insufficient owner earnings history; return |
| 8058.JP | 2019 Q3 | 908.06 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| 8058.JP | 2020 Q2 S | 787.22 | — | — | — | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; insufficient owner earnings history; return |
| 8031.JP | 2019 Q3 | 868.33 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| 8031.JP | 2020 Q2 S | 790.67 | — | — | — | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; insufficient owner earnings history; return |
| 8053.JP | 2019 Q3 | 408.67 | — | — | — | UUUUU | understandable:unclear; moat:unclear; economics:unclear; management:unclear; accounting:unclear; <7 years; insufficient owner earnings history; return |
| 8053.JP | 2020 Q2 S | 313.42 | — | — | — | UUUUP | understandable:unclear; moat:unclear; economics:unclear; management:unclear; insufficient owner earnings history; return |
