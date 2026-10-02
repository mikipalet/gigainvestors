# Owner memo — local checkpoint, acceptance failed

As of 2026-10-02T00:35:20.927Z. Worktree `value-zh-memo`, base `dc5dd86`. Requested commit: `value: owner memo with computed lines for every company`.

## Result

**Not complete / do not treat as acceptance.** All 2,709 original published dossier IDs were processed and are present in the local `publish --out` snapshot. **1,299/2,709 (47.95%) have at least five lines**, below the 95% requirement. **3 of the 20 review companies have all seven lines**: LULU, GOOGL and KO. The remaining unsupported questions are omitted from the UI.

| Coverage | Private computed/research cache | Actual staged dossiers |
|---|---:|---:|
| At least 5 lines | 1692 | 1299 |
| All 7 lines | 3 | 3 |
| 3–4 lines | — | 1393 |
| Fewer than 3 | — | 17 |

| Question | Staged answers |
|---|---:|
| 1. How it makes money | 2680 |
| 2. Why customers stay | 2655 |
| 3. Can it raise prices | 8 |
| 4. Where the cash goes | 2699 |
| 5. Are managers owners | 2405 |
| 6. What could break it | 9 |
| 7. What the price says | 1499 |

The publish command reports 2,715 universe/analysis rows; the addressable dossier count is 2,709, matching the original scope. Publication withholds 427 private valuations (publication separately logged 425 share/data-quality residuals). The memo now drops their implied-growth answers too; counting those private calculations as published coverage would be misleading.

## Implemented

- Runs computed memo composition across all published IDs before the resumable filing queue. Five-line coverage no longer marks research complete; seven answers are required to leave that queue.
- Merges dated published quotes with the partial price cache. LULU was absent from the latter. Publication recomputes question 7 from the final public valuation and quote, including FX, tier, fade and terminal assumptions.
- Removes the arbitrary high/stable-margin gate. Reports actual 2021–23 margin ranges, the ROIC measurement window and median, and trusted, quoted moat readings. Banks use tangible-equity returns and their own perpetual model; NAV companies retain the ten-year NAV model.
- Adds EODHD insider percentages with linked-listing fallback and compact missing-data retrieval. Recovered 48 of 352 missing ownership cases; 306 requests failed (including alternative-listing attempts). Final ownership coverage is 2,405. Missing inputs are never made zero; explicit vendor zero observations remain vendor reports, not independently proxy-verified ownership.
- Adds current-year source-checked segment/category shares for 17 review companies and controls/shareholdings for Alphabet, Ferrari and Tencent. Other companies use literal description product phrases or industry, revenue scale and margins where supported. This is not a general SEC/EDINET/ESEF segment extractor.
- Publishes annual `capitalAllocation` rows: growth investment, incremental returns, buyback cash, dividends, and priced repurchase comparisons where actual paid-per-share facts exist. Cash-acquisition gaps are labeled as growth capex/earnings instead of being silently called total reinvestment. Goodwill changes are never cash acquisitions.
- Fetches bounded full filing text for all 20 review names, compressed to about 4 MB total. Splits reader input into overlapping bounded chunks; a first full-text attempt became CPU-heavy and was stopped after retaining completed per-company states, then resumed successfully for all 20.
- Adds typed Jev support checks over manually reconciled answers with literal short-span anchors. The selected answer remains at most 18 words and contains a number. No unsupported narrative answer is synthesized to fill a slot.
- Limits edits to the memo pipeline, its published fields, audit/review scripts, tests and artifact ignore entry. No components, CSS, layouts, quality verdicts, valuation formulas or core financial inputs were changed.

## Limits preventing acceptance

Private analyses lack a valuation for 724 companies:

| Reason | Companies |
|---|---:|
| owner earnings not positive | 516 |
| Local government bond yield unavailable | 98 |
| fewer than 7 annual periods | 77 |
| insufficient owner earnings history | 19 |
| book value not positive | 6 |
| justified price to book is zero | 5 |
| net cash unavailable | 2 |
| insufficient dividend payout history | 1 |

An initial growth solve cannot repair a non-positive normalized earnings base, an absent discount rate, or a withheld public valuation. The bank model also has a 4× book ceiling: a price at that ceiling does not identify a unique growth rate, and a price above it has no solution. Those cases are omitted rather than assigned a made-up growth rate. Ten-year earnings-per-share growth is only compared when the exact decade endpoints are positive.

Broader segment extraction, ownership from proxy/20-F/EDINET/ESEF/Wikidata, founder/family identification, and filing-supported pricing/risk answers remain incomplete. Actual repurchase prices were reconciled only for LULU and Apple; all other annual buyback cash observations do not claim below/above-value purchases. Their comparisons use the existing historical valuation series at **current** bond rates and FX, not values known at the historical purchase date. All-seven coverage for the other 17 review names remains unmet.

## Reader checks and tests

- Existing bounded-span reader v6 retains its inherited 25/27 development regression grade. The separate statement-support reader scored **20/22 (90.91%)** on 11 manually source-checked statements and 11 confusable negatives at the >0.5 decision boundary. It had one false positive (Ferrari total-revenue scope) and one false negative (ASML export-control statement). This is a development regression set, **not an independent holdout or a universe-wide accuracy claim**. The shipped Ferrari answer explicitly retains cars-and-spare-parts scope. The new path is restricted to the manually reviewed manifest and requires the calibration grade before publication.
- Full Vitest run: **157 files, 1,725 tests passed, 1 skipped**. After final targeted changes: **93 focused memo, claims, queue and publication tests passed**. Regression tests were observed failing before the corresponding changes.
- Final `tsc --noEmit --incremental false`: passed. An intermediate tuple-type error for optional seeded-price metadata was fixed and rechecked.
- `memo-audit.ts` on the actual local snapshot: **zero structural errors**; all 2,709 IDs retained; every line numbered 1–7, unique per question, single-line, at most 18 words, containing a number and HTTPS evidence; all published price answers match recomputation from the final public model and price.
- `git diff --check`: passed. No web build was run because this round does not change rendering/layout. No layout or release-gate approval is claimed.

## Manual filing checks

I personally read the relevant filing passages/tables for the following 18 companies. The scope is explicit: these checks reconcile the listed revenue, ownership, pricing, repurchase or risk facts. They do **not** claim a complete independent reconciliation of every historical ROIC, owner-earnings, reinvestment or valuation input for ten companies. That stronger seven-line-by-seven-line filing audit remains incomplete. Reliance and LVMH current-year facts were not reconciled; their inherited vendor calculations remain distinct from filing verification.

| Company | Facts checked | Filing |
|---|---|---|
| LULU.US | Americas generated 71% of sales. Filing reports 56.6% gross margin, down 260 basis points, and selective price increases. Repurchase table shows 4.964m shares and $1,178.349m cost including excise tax. Issuer fiscal 2025 ends February 2026; normalized series labels that end-year 2026. | [Annual filing](https://www.sec.gov/Archives/edgar/data/1397187/000139718726000020/lulu-20260201.htm) |
| ADBE.US | Digital Media revenue $17.65bn / total revenue $23.769bn = 74.3%. Both amounts matched the annual filing. No supported numeric realized-pricing answer was established. | [Annual filing](https://www.sec.gov/Archives/edgar/data/796343/000079634326000003/adbe-20251128.htm) |
| GOOGL.US | Google Services $342,721m / $402,836m = 85.1%. Search cost per click increased 7%; paid clicks increased 6%. Page/Brin voting power 52.7%; EC fine $3.5bn. | [Annual filing](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000018/goog-20251231.htm) |
| KO.US | Concentrate operations 59% of revenue. Consolidated price/mix contribution 4%; worldwide unit case volume flat. The IRS claim concerns 2007–09 tax of $3.3bn plus interest; this is the historical disputed amount, not an estimate of all current exposure. | [Annual filing](https://www.sec.gov/Archives/edgar/data/21344/000162828026010047/ko-20251231.htm) |
| AAPL.US | iPhone $209,586m / total sales $416,161m = 50.4%. Repurchases: 402m shares for $89.3bn. The derived average paid price is approximate because these disclosed inputs are rounded. | [Annual filing](https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm) |
| MSFT.US | Productivity and Business Processes $139,996m / $331,839m = 42.2%, slightly above Intelligent Cloud. Microsoft 365 commercial seats grew 6%; revenue per user grew. The filing does not isolate a pure list-price increase from product mix. | [Annual filing](https://www.sec.gov/Archives/edgar/data/789019/000119312526323660/msft-20260630.htm) |
| WKL.AS | Tax & Accounting €1,660m / total revenue €6,125m = 27.1%, larger than Health (€1,596m). Source also reports recurring revenue at 83%; no realized numeric pricing answer was established. | [Annual filing](https://assets.contenthub.wolterskluwer.com/api/public/content/3210406-wolters-kluwer-2025-annual-report-pdf-8bb01b4e47?v=ddef685b) |
| ACN.US | Consulting $35,106.786m / total $69,672.977m = 50.4%. This is the type-of-work revenue breakdown; it is distinct from geographical segments. | [Annual filing](https://www.sec.gov/Archives/edgar/data/1467373/000146737325000217/acn-20250831.htm) |
| JPM.US | Commercial & Investment Banking $78,454m / managed net revenue $185,581m = 42.3%. Memo explicitly says managed revenue. GAAP net revenue is $182,447m; normalized gross revenue is $279,745m and is not the segment denominator. Apple Card commitment provision is $2.2bn. | [Annual filing](https://www.sec.gov/Archives/edgar/data/19617/000162828026008131/jpm-20251231.htm) |
| BRK-B.US | Sales and service revenues $199,524m / total revenue $371,444m = 53.7%. This is a revenue category, not a claim that the whole conglomerate has one operating segment. Operating gross margin is suppressed. | [Annual filing](https://www.sec.gov/Archives/edgar/data/1067983/000119312526083899/brka-20251231.htm) |
| 7203.JP | EDINET table: automotive external revenue ¥45,201,924m / consolidated ¥50,684,952m = 89.2%. Segment sales including intercompany revenue are different and were not used. The staged price line is withheld with its public valuation. | [Annual filing](https://disclosure2dl.edinet-fsa.go.jp/searchdocument/pdf/S100Y8NY.pdf) |
| 6758.JP | EDINET G&NS external-customer revenue ¥4,570,053m / normalized consolidated ¥12,479,620m = 36.6%. Intersegment revenue is excluded. The staged price line is withheld with its public valuation. | [Annual filing](https://disclosure2dl.edinet-fsa.go.jp/searchdocument/pdf/S100YE2C.pdf) |
| 0700.HK | Replaced the inherited ESG source with the annual report. Value-added services RMB369,281m / total RMB751,766m = 49.1%. Directors table gives Ma Huateng beneficial corporate shareholding of 8.82%. | [Annual filing](https://static.www.tencent.com/uploads/2026/04/09/62d786fcf3d3c8cb7e54791ee95439ac.pdf) |
| 005930.KO | Samsung business report lists Device eXperience at 56.3% of group revenue, explicitly including interdivision transactions. The memo preserves that qualification rather than treating it as a clean external-revenue share. | [Annual filing](https://images.samsung.com/is/content/samsung/assets/global/ir/docs/2025_4Q_Interim_Report.pdf) |
| RACE.MI | Cars and spare parts €6,005.243m / €7,145.768m = 84.0%. Exor voting rights 32.32%. US exposure of 28% is specifically cars-and-spare-parts revenue, not total group revenue. | [Annual filing](https://filings.xbrl.org/549300RIVY5EX8RCON76/2025-12-31/ESEF/NL/0/race-2025-12-31-1-en/reports/race-2025-12-31-1-en.xhtml) |
| NESN.SW | Annual review shows powdered and liquid beverages at 28.1% of group sales. Total revenue CHF89,490m is also in the financial statements. This review does not establish a pure pricing/volume answer for the whole group. | [Annual filing](https://www.nestle.com/sites/default/files/2026-02/annual-review-2025-en.pdf) |
| ASML.AS | Net system sales €24,474.3m / total net sales €32,667.3m = 74.9%. China is 29.1% of 2025 sales. The proposed combined export-control claim did not clear the typed reader and is omitted. | [Annual filing](https://filings.xbrl.org/724500Y6DUVHQD6OXN27/2025-12-31/ESEF/NL/0/asml-2025-12-31-1-en/reports/asml-2025-12-31-1-en.xhtml) |
| CBG.LSE | Annual report states a £165m motor-finance commission provision charge. It is a provision, not £165m of cash redress paid. The latter was a deliberately false calibration case. | [Annual filing](https://www.closebrothers.com/system/files/rrp/reports/CBGAnnualReport2025.pdf) |

## Twenty review companies — all seven question slots

A dash below means the staged UI omits the answer. It is not placeholder text rendered on the site. `RELIANCE.NSE` resolves to `RIGD.LSE`.

### LULU.US

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Americas 71% of sales; gross margin 56.6%. |
| 2. Why customers stay | 2021–23 gross margins 55.4%–57.7%; 10-year median ROIC 47%; brand advantage. |
| 3. Can it raise prices | Selective price increases; gross margin fell 260 basis points to 56.6%. |
| 4. Where the cash goes | Reinvestment 5.9%; incremental return 30.6%; dividends 0/10 years; 2026 buybacks 10.5% below value. |
| 5. Are managers owners | Insiders own 4.5%. |
| 6. What could break it | Tariffs and de minimis changes threaten margins in 2026. |
| 7. What the price says | Price implies -12.8% initial growth over ten years; ten-year earnings/share growth 22%. |

### ADBE.US

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Digital Media 74.3% of sales; gross margin 89.3%. |
| 2. Why customers stay | 2021–23 gross margins 87.7%–88.2%; 10-year median ROIC 25.8%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | Growth capex/earnings 0%; incremental return 100%; dividends 0/10 years; buybacks 11.3bn. |
| 5. Are managers owners | Insiders own 0.2%. |
| 6. What could break it | — |
| 7. What the price says | Price implies 11.4% initial growth over ten years; ten-year earnings/share growth 31.8%. |

### GOOGL.US

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Google Services 85.1% of sales; gross margin 59.7%. |
| 2. Why customers stay | 2021–23 gross margins 55.4%–56.9%; 10-year median ROIC 42.4%; brand advantage. |
| 3. Can it raise prices | Search price per click rose 7%; paid clicks rose 6% in 2025. |
| 4. Where the cash goes | Growth capex/earnings 65.6%; incremental return 37.2%; dividends 2/10 years; buybacks 45.7bn. |
| 5. Are managers owners | Insiders own 1.6%; Page and Brin: 52.7% voting power. |
| 6. What could break it | EC fine accrued in 2025: $3.5 billion. |
| 7. What the price says | Price implies 31.6% initial growth over ten years; ten-year earnings/share growth 29.7%. |

### KO.US

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Concentrates 59% of sales; gross margin 61.6%. |
| 2. Why customers stay | 2021–23 gross margins 58.1%–60.3%; 10-year median ROIC 22.7%; brand advantage. |
| 3. Can it raise prices | 2025 price/mix added 4% to revenue; worldwide unit case volume was flat. |
| 4. Where the cash goes | Growth capex/earnings 1.7%; incremental return 195.1%; dividends 10/10 years; buybacks 746m. |
| 5. Are managers owners | Insiders own 9.9%. |
| 6. What could break it | IRS transfer-pricing litigation involves $3.3bn additional tax for 2007–09, plus interest. |
| 7. What the price says | Price implies 26.3% initial growth over ten years; ten-year earnings/share growth 6.4%. |

### AAPL.US

| Question | Staged memo line |
|---|---|
| 1. How it makes money | iPhone 50.4% of sales; gross margin 46.9%. |
| 2. Why customers stay | 2021–23 gross margins 41.8%–44.1%; 10-year median ROIC 70.4%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | Growth capex/earnings 1%; incremental return 563.9%; dividends 10/10 years; 2025 buybacks 82.2% above value. |
| 5. Are managers owners | Insiders own 1.6%. |
| 6. What could break it | — |
| 7. What the price says | Price implies 37.3% initial growth over ten years; ten-year earnings/share growth 11.5%. |

### MSFT.US

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Productivity and Business Processes 42.2% of sales; gross margin 67.9%. |
| 2. Why customers stay | 2021–23 gross margins 68.4%–68.9%; 10-year median ROIC 73%. |
| 3. Can it raise prices | Microsoft 365 commercial revenue per user grew; seats rose 6%. |
| 4. Where the cash goes | Growth capex/earnings 43.9%; incremental return 53.6%; dividends 10/10 years; buybacks 22.3bn. |
| 5. Are managers owners | Insiders own 0.1%. |
| 6. What could break it | — |
| 7. What the price says | Price implies 26.9% initial growth over ten years; ten-year earnings/share growth 17.7%. |

### WKL.AS

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Tax & Accounting 27.1% of sales; gross margin 73.5%. |
| 2. Why customers stay | 2021–23 gross margins 68.5%–71.8%; 10-year median ROIC 140.2%; brand advantage. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | Growth capex/earnings 0%; incremental return 100%; dividends 10/10 years; buybacks 1.1bn. |
| 5. Are managers owners | Insiders own 0.2%. |
| 6. What could break it | — |
| 7. What the price says | Price implies 0.5% initial growth over ten years; ten-year earnings/share growth 11.8%. |

### ACN.US

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Consulting 50.4% of sales; gross margin 31.9%. |
| 2. Why customers stay | 2021–23 gross margins 32%–32.4%; 10-year median ROIC 131.2%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | Growth capex/earnings 0%; incremental return 522.9%; dividends 10/10 years; buybacks 4.6bn. |
| 5. Are managers owners | Insiders own <0.1%. |
| 6. What could break it | — |
| 7. What the price says | Price implies 7.1% initial growth over ten years; ten-year earnings/share growth 11.6%. |

### JPM.US

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Commercial & Investment Banking 42.3% of managed revenue. |
| 2. Why customers stay | 10-year median return on tangible equity 18.4%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | dividends 10/10 years; buybacks 34.6bn. |
| 5. Are managers owners | Insiders own 0.4%. |
| 6. What could break it | Apple Card: $2.2 billion provision for lending-related commitments. |
| 7. What the price says | Price implies 6.3% perpetual growth in our book-value model. |

### BRK-B.US

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Sales and services 53.7% of sales. |
| 2. Why customers stay | 10-year median return on tangible equity 11.1%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | dividends 0/10 years. |
| 5. Are managers owners | Insiders own 0.3%. |
| 6. What could break it | — |
| 7. What the price says | Price implies 4.8% perpetual growth in our book-value model. |

### 7203.JP

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Automotive 89.2% of sales; gross margin 16.7%. |
| 2. Why customers stay | 2021–23 gross margins 17%–19%; 10-year median ROIC 4.7%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | Growth capex/earnings 40.5%; incremental return 4.2%; dividends 9/10 years. |
| 5. Are managers owners | Insiders own <0.1%. |
| 6. What could break it | — |
| 7. What the price says | — |

### 6758.JP

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Games and network services 36.6% of sales; gross margin 30.8%. |
| 2. Why customers stay | 2021–23 gross margins 34.6%–43.7%; 10-year median ROIC 17.3%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | Reinvestment 59.8%; incremental return 27.7%; dividends 10/10 years; buybacks 522.1bn. |
| 5. Are managers owners | Insiders own <0.1%. |
| 6. What could break it | — |
| 7. What the price says | — |

### RIGD.LSE

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Polymers comprising high-density; revenue INR 10.6tn; gross margin 29.4%. |
| 2. Why customers stay | 2021–23 gross margins 23.5%–27.4%; 10-year median ROIC 7.9%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | Growth capex/earnings 85.8%; incremental return 8.5%; dividends 10/10 years. |
| 5. Are managers owners | Insiders own 0%. |
| 6. What could break it | — |
| 7. What the price says | Price implies 10.9% initial growth over ten years. |

### 0700.HK

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Value-added services 49.1% of sales; gross margin 56.2%. |
| 2. Why customers stay | 10-year median ROIC 23.8%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | Reinvestment 30.5%; incremental return 104.8%; dividends 4/4 years; buybacks 73.3bn. |
| 5. Are managers owners | Insiders own 31.7%; Ma Huateng: 8.8% shareholding. |
| 6. What could break it | — |
| 7. What the price says | Price implies 11.7% initial growth over ten years; ten-year earnings/share growth 18.5%. |

### 005930.KO

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Device eXperience 56.3% of group revenue, including interdivision sales; gross margin 39.4%. |
| 2. Why customers stay | 2021–23 gross margins 29.4%–39%; 10-year median ROIC 17.6%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | Growth capex/earnings 12.1%; incremental return 13.3%; dividends 10/10 years; buybacks 8.2tn. |
| 5. Are managers owners | Insiders own 9.7%. |
| 6. What could break it | — |
| 7. What the price says | Price implies 22.7% initial growth over ten years; ten-year earnings/share growth 13%. |

### RACE.MI

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Cars and spare parts 84% of sales; gross margin 51.7%. |
| 2. Why customers stay | 2021–23 gross margins 48%–51.3%; 10-year median ROIC 35.5%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | Reinvestment 9.3%; dividends 7/10 years; buybacks 785.3m. |
| 5. Are managers owners | Insiders own 32.3%; Exor: 32.3% voting power. |
| 6. What could break it | US tariff exposure: 28% of car and spare-parts revenues came from America. |
| 7. What the price says | Price implies 33.4% initial growth over ten years; ten-year earnings/share growth 10.6%. |

### NESN.SW

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Powdered and liquid beverages 28.1% of sales; gross margin 45.6%. |
| 2. Why customers stay | 2021–23 gross margins 45.4%–48%; 10-year median ROIC 18.9%. |
| 3. Can it raise prices | 0.8% despite price by 60%, and the volume gap is now flat. |
| 4. Where the cash goes | Growth capex/earnings 0%; incremental return 7%; dividends 10/10 years; buybacks 213m. |
| 5. Are managers owners | Insiders own <0.1%. |
| 6. What could break it | — |
| 7. What the price says | Price implies 11.8% initial growth over ten years; ten-year earnings/share growth 1.8%. |

### MC.PA

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Wine; revenue EUR 80.8bn; gross margin 66.2%. |
| 2. Why customers stay | 2021–23 gross margins 68.3%–68.8%; 10-year median ROIC 24%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | Growth capex/earnings 0%; incremental return 124.1%; dividends 10/10 years; buybacks 1.6bn. |
| 5. Are managers owners | Insiders own 50.3%. |
| 6. What could break it | — |
| 7. What the price says | Price implies 6.2% initial growth over ten years; ten-year earnings/share growth 11.4%. |

### ASML.AS

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Lithography systems 74.9% of sales; gross margin 52.8%. |
| 2. Why customers stay | 2021–23 gross margins 49.5%–51.9%; 10-year median ROIC 85.6%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | Growth capex/earnings 5.8%; incremental return 55%; dividends 10/10 years; buybacks 6bn. |
| 5. Are managers owners | Insiders own <0.1%. |
| 6. What could break it | — |
| 7. What the price says | Price implies 52.2% initial growth over ten years; ten-year earnings/share growth 22.9%. |

### CBG.LSE

| Question | Staged memo line |
|---|---|
| 1. How it makes money | Commercial services comprises hire purchase; revenue GBP 1.2bn. |
| 2. Why customers stay | 10-year median return on tangible equity 14.4%. |
| 3. Can it raise prices | — |
| 4. Where the cash goes | dividends 9/10 years; buybacks 1.6m. |
| 5. Are managers owners | Insiders own 1.9%. |
| 6. What could break it | Motor-finance commissions: £165 million provision charge. |
| 7. What the price says | Price implies -21.5% perpetual growth in our book-value model. |

## Artifacts, disk and reproducibility

- Local publication: `/Users/miki/GitHub/superinvestors-wt/value-zh-memo/.memo-1/store` (about 127 MB). No remote repository or live store was written.
- Detailed audit, including all evidence and the 20 review memos: `.memo-1/audit.json`.
- Filing texts, compact ownership cache, computed memos, approved claims, calibration recordings and remaining queue: `~/value-corpus/business-backfill/`. The entire directory, including inherited files, is about 59 MB. Staging plus that entire directory totals under 200 MB, conservatively below the 3 GB new-use ceiling.
- Free space began near 7.5 GB and never reached the 6 GiB stop floor at guard checks. Other work freed disk during the run; final free space is about 19 GB. No subagents, push, deployment, remote publication or API-key output.
- Logs: `/tmp/memo-tests-verified.log`, `/tmp/memo-types-verified.log`, `/tmp/memo-vitest-final.log`, `/tmp/memo-corpus-verified.log`, `/tmp/memo-publish-verified.log`, `/tmp/memo-audit-verified.log`, `/tmp/memo-claims-calibration.log`, `/tmp/memo-ownership.log`.

```sh
npx tsx scripts/value/memo-review-sources.ts
npx tsx scripts/value/memo-claims-calibrate.ts
npx tsx scripts/value/memo-reviewed.ts
npx tsx scripts/value/cli.ts business-backfill --offline
npx tsx scripts/value/cli.ts publish --out=.memo-1/store --overwrite --force
npx tsx scripts/value/memo-audit.ts
```

For a fresh destination, omit `--overwrite`. The full 20-company online backfill was run with `--only` and `--force`; the remaining corpus research queue is resumable. Coverage acceptance remains **failed**.
