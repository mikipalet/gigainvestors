# India fundamentals — initial import report

Date: 2026-10-01. Repository: `/Users/miki/GitHub/superinvestors-wt/value-u-ops`; starting HEAD `d7673fa`; local commit title `value: India fundamentals from official filings`.

## Outcome: target not met

Implemented and ran a keyless official NSE importer for the 50 members in the local Nifty 50 universe. Wrote **41 local NSE fundamentals files**. Preserved seven existing canonical ADR/GDR histories; two insurance members yielded no qualifying consolidated annual results. **39/50 currently have at least ten annual rows**, versus 7/50 in the immutable pre-import snapshots. This falls short of the requested 40/50.

**Annual rows are not complete annual statements.** 43/50 yielded at least ten annual observations before the unchanged integrity rules; 37 official/Yahoo candidates retained at least ten after those rules. None of the newly generated candidates contains ten years with assets, equity, OCF and capex all present. Typical balance-sheet coverage is four years and cash-flow coverage five. Parent profit is unknown in some otherwise usable income rows. The requested ten-year complete fundamentals coverage has therefore not been achieved, even for many companies whose row count exceeds ten.

42/50 current corpus records pass the existing integrity gate (which requires at least seven periods); that does not certify complete statement coverage. No integrity thresholds or implementation were changed. No real-corpus analysis or publication was run, so downstream valuations and analysis fingerprints have not been refreshed.

Last full write pass: `2026-10-01T04:11:55.026Z`. Run manifest: `/Users/miki/value-corpus/raw/india/run-c6058d844d75.json`. All sources, exploratory downloads, backups, candidates and run records share `/Users/miki/value-corpus/raw/india` (53.0 MiB). Root free space at report generation: 7.79 GiB; remained above the 5 GiB stop threshold.

## Access attempts and results

All probes used ordinary unauthenticated requests, a browser User-Agent and, for exchange APIs, an exchange Referer. No credentials, captcha bypass or paid source was used.

1. BSE: `https://api.bseindia.com/BseIndiaAPI/api/FinancialResult/w?scripcode=500325`, `https://api.bseindia.com/BseIndiaAPI/api/AnnualReport/w?scripcode=500325`, and `https://api.bseindia.com/BseIndiaAPI/api/FinancialResult/w?scripcode=532540` returned HTTP 403. BSE home and `https://www.bseindia.com/corporates/Comp_Resultsnew.aspx` returned HTTP 200 application shells. No working machine-readable BSE endpoint was established.
2. MCA: `https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html` returned HTTP 403. This was the MCA entry page tested, not an exhaustive test of every MCA service. No keyless historical MCA filing-download route was established.
3. NSE date-only query: `https://www.nseindia.com/api/corporates-financial-results?index=equities&symbol=SYMBOL&from_date=01-04-2023&to_date=31-03-2024` returned HTTP 200 with `[]` for RELIANCE, TCS, HDFCBANK, INFY and ITC. A wider RELIANCE 2012–2026 date query also returned `[]`.
4. Working NSE annual query: `https://www.nseindia.com/api/corporates-financial-results?index=equities&symbol=SYMBOL&period=Annual` returned historical entries for all five pilots. The importer selects audited, consolidated, annual periods of 330–400 days, from FY2012 onward. This is the dependable keyless access path found in this environment. It is tested access, not a guaranteed exchange service-level commitment.
5. XBRL downloads use each listing's exact `xbrl` URL under `https://nsearchives.nseindia.com/corporate/xbrl/`. Old `xbrl/-` links are placeholders. The fallback `resultDetailedDataLink` points to official HTML; example: `https://nsearchives.nseindia.com/archives/financial_results/financial_res_RELIANCE_127132.html` (FY2015, income results in INR lakhs, no balance sheet/cash flow).
6. Official detail JSON: `https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=...&seq_id=...&industry=...&frOldNewFlag=...&ind=...&format=...`. Parameters come directly from annual listings. NSE's own corporate-filings JavaScript/renderers confirm the format3/4/5 field names and INR-lakh display units. Sequence, fiscal dates and annual/consolidated metadata are verified. This recovers missing/invalid XML years such as TCS FY2018.
7. `period=Quarterly` on the same listing endpoint recovered some explicitly audited annual XBRL columns (including HDFCBANK FY2021 and SUNPHARMA/TECHM gaps). Quarterly observations are never summed or relabelled as annual.
8. Since FY2025, `https://www.nseindia.com/api/integrated-filing-results?index=equities&symbol=SYMBOL&page=1&size=100` supplies newer financial-results XBRL. Pagination and explicit fiscal start/end dates are checked. An index entry can say unaudited for Q4 while the full-year column is audited; the parser verifies the annual column itself.
9. `https://www.nseindia.com/api/annual-reports-xbrl?index=equities&symbol=SYMBOL` was tested for all five pilots. RELIANCE, TCS, INFY and ITC exposed only FY2025/FY2026-era annual reports; HDFCBANK returned an empty list. A TCS full annual-report file (`AR_XBRL_TCS_14082025184751.xml`, approximately 3 MiB) was downloaded for inspection. An INFY report exceeded the 4 MiB response cap and was rejected. These are a different full-report taxonomy; this importer does not implement that parser. This endpoint did not establish access to ten historical years.
10. `https://www.nseindia.com/api/annual-reports?index=equities&symbol=TCS` returned historical report links. FY2018 result-detail attachment probes: RELIANCE ZIP downloaded (approximately 2.23 MB; one PDF, `1542_001.pdf`, approximately 2.31 MB); TCS attachment exceeded the 4 MiB cap. No bulk PDF extraction was run. Direct access to the Infosys IR annual-reports page returned 403 with the local HTTP client, although browser search could expose the page.
11. Final gap checks: no qualifying annual KOTAKBANK FY2017, ONGC FY2022, SHRIRAMFIN FY2019 or SBIN FY2018 records appeared in the tested lists. KOTAKBANK FY2017 had a quarterly HTML entry only; two adjacent public archive URL probes (`financial_res_KOTAKBANK_1020976.html`, `financial_res_KOTAKBANK_1020977.html`) returned 404. SBIN FY2018 entries were standalone. TRENT FY2022 detail JSON and XBRL repeated the same suspicious scale, so no unsupported ×100 correction was applied.
12. Corporate actions: `https://www.nseindia.com/api/corporates-corporateActions?index=equities&symbol=BAJFINANCE&from_date=01-01-2012&to_date=01-10-2026` confirms a 4:1 bonus plus a 2:1 split on 2025-06-16, a combined factor of 10. Yahoo contained only the factor-2 split. The importer combines recognized exchange actions by actual ex-date, without double-counting the Yahoo event.

**Jev fallback:** not invoked. The user made it conditional on no keyless official source working; NSE works. This run does not claim that IR/PDF backfill, Jev typed numeric questions, or evidence-quote extraction was completed. Full historical statements remain the principal unfinished requirement.

## Normalization and provenance

- NSE XBRL monetary values are absolute INR. `decimals` and a display label such as Crores are not multipliers. Legacy HTML/detail values are explicitly INR lakhs and are multiplied by 100,000. Missing/nil values remain null.
- Annual consolidated base contexts only; segment and other dimensional contexts are excluded. The NSE exporter sometimes gives the annual FourD context Q4 dates, or omits WEB base contexts entirely. Recovery is limited to reserved contexts with explicit reporting dates matching the selected annual period. Bank yearly reporting metadata can supply an omitted start date. Issuer, currency, unit, date and audit mismatches are rejected.
- Revenue: operations; bank revenue: total income, with interest income separately retained. Operating profit uses a reported bank operating-profit field or operations revenue minus expenses plus finance costs. Parent-attributable profit/equity take precedence; consolidated total profit is not substituted for missing parent profit.
- D&A, OCF, dividends, cash, goodwill, intangibles, inventory, banking deposits/advances/provisions and other recognized lines carry the source URL and taxonomy/HTML/detail field. Capex sums explicit tangible, intangible and reported development purchases; missing required components keep capex null. Borrowings exclude bank deposits. Parent tangible equity requires explicitly reported goodwill and other intangible amounts; no absent-intangible zero is invented.
- Diluted shares use a reported weighted-average field when available, otherwise explicitly derived parent profit / diluted EPS. This derived value inherits rounded EPS limitations and is marked derived; it is not a filing-date ordinary share count. Corporate actions corroborate share changes before the unchanged integrity check.
- When parent profit plus NCI fails to reconcile to group profit, profit fields and inferred shares are quarantined to null and raw values remain in `Year.sourceWarnings`. Revenue and independently valid statement lines remain usable. All statementCoverage flags stay false for incomplete result templates to prevent absent-concept zero defaults.
- Yahoo supplements null recent lines/appends newer annual periods only if every overlapping annual INR revenue and parent-profit pair agrees within 3%. No currency mixing, old-year invention, or historical share/EPS supplementation. INFY.NS Yahoo statements are USD, so the INR merge is rejected. Routine India Yahoo refresh now preserves existing official history rather than replacing it with four years.

## Identity and write scope

`INFY.NSE` selection resolves to existing `INFY.US`; both identify Infosys. Other canonical mappings are HDFCBANK → HDB.US, ICICIBANK → IBN.US, RELIANCE → RIGD.LSE, LT → LTOD.LSE, M&M → MHID.LSE, TATASTEEL → TTST.LSE. No duplicate local companies were created. Historical filing aliases are explicit: ZOMATO/ETERNAL, TATAMOTORS/TMPV, TATAGLOBAL or TATATEA/TATACONSUM, SRTRANSFIN/SHRIRAMFIN.

Seven existing ADR/GDR histories were preserved because a replacement would require verified currency and depositary-share reconciliation. In particular INFY.US remains its existing USD record; the INR NSE candidate is reviewable at `raw/india/result-INFY.US.json`. The preserved histories count toward the current-corpus total, not toward newly imported official coverage. No company/universe/classification records were changed; bank classification therefore remains whatever the existing corpus records specify.

Writes were confined to selected India fundamentals, the single India raw cache and this report/code work. Immutable `before-ID.json` backups enable restoration; `result-ID.json` contains the normalized candidate even when not activated. No real analysis/publish stages, web builds, subagents, push, deploy or remote publication were used. Existing regression tests exercise simulated analysis/publication only inside temporary fixtures.

## Per-company coverage

Fiscal years use the period end year. Obtained includes accepted official observations and consistent Yahoo supplementation before integrity trimming. Retained is the candidate after integrity. Current corpus may be an older preserved depositary record. BS/CF counts are pre-trim candidate years with assets + equity / OCF + capex respectively; these are minimum pairs, not completeness certifications.

| NSE symbol → canonical ID | Pre-import rows | Obtained years (count) | Candidate retained years (count) | Current corpus years (count) | BS / CF | Action |
|---|---:|---|---|---|---:|---|
| ADANIENT → ADANIENT.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| ADANIPORTS → ADANIPORTS.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| APOLLOHOSP → APOLLOHOSP.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| ASIANPAINT → ASIANPAINT.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| AXISBANK → AXISBANK.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 2 / 5 | written |
| BSE → BSE.NSE | 0 | 2016–2026 (11) | 2016–2026 (11) | 2016–2026 (11) | 4 / 5 | written |
| BAJAJ-AUTO → BAJAJ-AUTO.NSE | 0 | 2012–2025 (14) | 2012–2025 (14) | 2012–2025 (14) | 3 / 4 | written |
| BAJFINANCE → BAJFINANCE.NSE | 0 | 2015–2026 (12) | 2015–2026 (12) | 2015–2026 (12) | 3 / 5 | written |
| BAJAJFINSV → BAJAJFINSV.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 2 / 5 | written |
| BEL → BEL.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| BHARTIARTL → BHARTIARTL.NSE | 0 | 2016–2026 (11) | 2016–2026 (11) | 2016–2026 (11) | 4 / 5 | written |
| CIPLA → CIPLA.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| COALINDIA → COALINDIA.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| DRREDDY → DRREDDY.NSE | 0 | 2016–2026 (11) | 2016–2026 (11) | 2016–2026 (11) | 4 / 5 | written |
| EICHERMOT → EICHERMOT.NSE | 0 | 2012, 2014, 2017–2026 (12) | 2017–2026 (10) | 2017–2026 (10) | 4 / 5 | written |
| ETERNAL → ETERNAL.NSE | 0 | 2022–2026 (5) | 2022–2026 (5) | 2022–2026 (5) | 4 / 5 | written |
| GRASIM → GRASIM.NSE | 0 | 2012–2014, 2016–2026 (14) | 2016–2026 (11) | 2016–2026 (11) | 4 / 5 | written |
| HCLTECH → HCLTECH.NSE | 0 | 2012–2015, 2017–2026 (14) | 2017–2026 (10) | 2017–2026 (10) | 4 / 5 | written |
| HDFCLIFE → HDFCLIFE.NSE | 0 | — (0) | — (0) | — (0) | 0 / 0 | no qualifying results |
| HINDALCO → HINDALCO.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| HINDUNILVR → HINDUNILVR.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| ITC → ITC.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| INDIGO → INDIGO.NSE | 0 | 2017–2026 (10) | 2017–2026 (10) | 2017–2026 (10) | 4 / 5 | written |
| JSWSTEEL → JSWSTEEL.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| JIOFIN → JIOFIN.NSE | 0 | 2024–2026 (3) | 2024–2026 (3) | 2024–2026 (3) | 2 / 3 | written |
| KOTAKBANK → KOTAKBANK.NSE | 0 | 2012–2016, 2018–2026 (14) | 2018–2026 (9) | 2018–2026 (9) | 2 / 5 | written |
| MARUTI → MARUTI.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| MAXHEALTH → MAXHEALTH.NSE | 0 | 2021–2026 (6) | 2021–2026 (6) | 2021–2026 (6) | 4 / 5 | written |
| NTPC → NTPC.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| NESTLEIND → NESTLEIND.NSE | 0 | 2025–2026 (2) | 2025–2026 (2) | 2025–2026 (2) | 2 / 2 | written |
| ONGC → ONGC.NSE | 0 | 2012–2021, 2023–2026 (14) | 2023–2026 (4) | 2023–2026 (4) | 4 / 4 | written |
| POWERGRID → POWERGRID.NSE | 0 | 2012, 2014–2026 (14) | 2014–2026 (13) | 2014–2026 (13) | 4 / 5 | written |
| SBILIFE → SBILIFE.NSE | 0 | — (0) | — (0) | — (0) | 0 / 0 | no qualifying results |
| SHRIRAMFIN → SHRIRAMFIN.NSE | 0 | 2012–2018, 2020–2026 (14) | 2020–2026 (7) | 2020–2026 (7) | 2 / 5 | written |
| SBIN → SBIN.NSE | 0 | 2012–2017, 2019–2026 (14) | 2019–2026 (8) | 2019–2026 (8) | 2 / 5 | written |
| SUNPHARMA → SUNPHARMA.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| TCS → TCS.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| TATACONSUM → TATACONSUM.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| TMPV → TMPV.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| TECHM → TECHM.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| TITAN → TITAN.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| TRENT → TRENT.NSE | 0 | 2012–2026 (15) | 2022–2026 (5) | 2022–2026 (5) | 4 / 5 | written |
| ULTRACEMCO → ULTRACEMCO.NSE | 0 | 2012–2026 (15) | 2012–2026 (15) | 2012–2026 (15) | 4 / 5 | written |
| HDFCBANK → HDB.US | 27 | 2012–2026 (15) | 2012–2026 (15) | 2000–2026 (27) | 2 / 5 | preserved depositary |
| ICICIBANK → IBN.US | 18 | 2012–2026 (15) | 2012–2026 (15) | 2009–2026 (18) | 2 / 5 | preserved depositary |
| INFY → INFY.US | 28 | 2017–2026 (10) | 2017–2026 (10) | 1999–2026 (28) | 4 / 5 | preserved depositary |
| LT → LTOD.LSE | 25 | 2012–2026 (15) | 2012–2026 (15) | 2002–2026 (25) | 3 / 5 | preserved depositary |
| M&M → MHID.LSE | 22 | 2018–2026 (9) | 2018–2026 (9) | 2005–2026 (22) | 4 / 5 | preserved depositary |
| RELIANCE → RIGD.LSE | 22 | 2012–2021, 2023–2026 (14) | 2023–2026 (4) | 2005–2026 (22) | 4 / 4 | preserved depositary |
| TATASTEEL → TTST.LSE | 22 | 2012–2026 (15) | 2012–2026 (15) | 2005–2026 (22) | 4 / 5 | preserved depositary |

## Remaining members below ten current annual rows

| Member | Current rows | Limitation |
|---|---:|---|
| ETERNAL | 5 | Available consolidated history begins FY2022. |
| HDFCLIFE | 0 | No qualifying consolidated annual results in the tested feeds; insurance template not supported. |
| JIOFIN | 3 | Available independent consolidated history begins FY2024. |
| KOTAKBANK | 9 | Missing FY2017 forces unchanged gap trimming to FY2018 onward. |
| MAXHEALTH | 6 | Available history begins FY2021. |
| NESTLEIND | 2 | Only FY2025–2026 qualifying consolidated results; older standalone periods were not substituted. |
| ONGC | 4 | Missing FY2022 forces gap trimming to FY2023 onward. |
| SBILIFE | 0 | No qualifying consolidated annual results in the tested feeds; insurance template not supported. |
| SHRIRAMFIN | 7 | Missing FY2019 forces gap trimming to FY2020 onward. |
| SBIN | 8 | FY2018 available entries are standalone; gap trimming retains FY2019 onward. |
| TRENT | 5 | FY2022 source scale yields a 0.01× share jump; unchanged integrity trims to FY2022. Detail JSON repeats the values; no guessed repair. |

## Candidate field availability after integrity

Counts below refer to non-null fields in the generated candidates, including preserved-but-unactivated depositary candidates. They quantify why annual row count alone overstates coverage.

| Field | Companies with ≥10 reported/derived years | Maximum years in one candidate |
|---|---:|---:|
| revenue | 37 | 15 |
| operatingIncome | 31 | 15 |
| netIncome | 31 | 15 |
| da | 34 | 15 |
| capex | 0 | 5 |
| ocf | 0 | 5 |
| cash | 0 | 4 |
| totalDebt | 0 | 7 |
| equity | 0 | 4 |
| goodwill | 0 | 4 |
| intangibles | 0 | 4 |
| receivables | 0 | 4 |
| inventory | 0 | 4 |
| dilutedShares | 0 | 9 |
| dividendsPaid | 0 | 5 |
| interestIncome | 3 | 15 |
| deposits | 0 | 7 |
| loans | 0 | 3 |
| creditLossProvision | 3 | 15 |
| tangibleEquity | 0 | 4 |

## Per-company diagnostic notes

Each subsection includes merge decisions, source warnings, integrity trims and document failures from the full write run. Complete source URLs and field provenance remain in the candidate JSON. A missing listing is not a download failure and can therefore coexist with zero failed requests.

### ADANIENT (ADANIENT.NSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023
- 2021: NSE profit attribution does not reconcile: parent=-7120870000, NCI=2270000, total=10457600000; profit fields quarantined

### ADANIPORTS (ADANIPORTS.NSE)

Selected annual listings: 17; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2026
- 2019: NSE profit attribution does not reconcile: parent=0, NCI=0, total=40447500000; profit fields quarantined
- 2026: NSE profit attribution does not reconcile: parent=9148300000, NCI=3225100000, total=127820300000; profit fields quarantined

### APOLLOHOSP (APOLLOHOSP.NSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration

### ASIANPAINT (ASIANPAINT.NSE)

Selected annual listings: 19; parsed documents including integrated/recovered annuals: 16; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration
- 2022: NSE profit attribution does not reconcile: parent=30305700000, NCI=542400000, total=91673700000; profit fields quarantined

### AXISBANK (AXISBANK.NSE)

Selected annual listings: 18; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Recovered 31-Mar-2018 through https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=01-Apr-201731-Mar-2018ANABCCAEAXISBANK&seq_id=1041197&industry=-&frOldNewFlag=&ind=A&format=New; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/corporate/xbrl/BANKING_35409_10279_21052018105358_WEB.xml
- Yahoo not merged: conflicting annual totals/currency in 2023

### BSE (BSE.NSE)

Selected annual listings: 9; parsed documents including integrated/recovered annuals: 11; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2025

### BAJAJ-AUTO (BAJAJ-AUTO.NSE)

Selected annual listings: 16; parsed documents including integrated/recovered annuals: 14; failed source attempts: 1.

- Yahoo not merged: conflicting annual totals/currency in 2023
- Failed `https://nsearchives.nseindia.com/corporate/xbrl/INTEGRATED_FILING_INDAS_1664225_06052026082335_WEB.xml`: Error: NSE filing identity mismatch

### BAJFINANCE (BAJFINANCE.NSE)

Selected annual listings: 9; parsed documents including integrated/recovered annuals: 12; failed source attempts: 0.

- Recovered audited annual column for 2021-03-31 from quarterly-indexed filing https://nsearchives.nseindia.com/corporate/xbrl/NBFC_INDAS_69475_444206_28042021010850_WEB.xml
- Yahoo not merged: conflicting annual totals/currency in 2023
- 2018: NSE detail does not report parent-attributable profit; left unknown
- 2019: NSE detail does not report parent-attributable profit; left unknown
- 2020: NSE profit attribution does not reconcile: parent=0, NCI=0, total=52637600000; profit fields quarantined
- 2021: NSE profit attribution does not reconcile: parent=0, NCI=0, total=44198200000; profit fields quarantined
- 2023: NSE profit attribution does not reconcile: parent=0, NCI=0, total=115076900000; profit fields quarantined
- Split/bonus factors corroborated with NSE corporate actions: https://www.nseindia.com/api/corporates-corporateActions?index=equities&symbol=BAJFINANCE&from_date=01-01-2012&to_date=01-10-2026

### BAJAJFINSV (BAJAJFINSV.NSE)

Selected annual listings: 15; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Recovered 31-Mar-2018 through https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=01-Apr-201731-Mar-2018ANANCCAEBAJAJFINSV&seq_id=1040882&industry=-&frOldNewFlag=N&ind=A&format=New; first source failed: Error: No matching audited annual context
- Recovered audited annual column for 2021-03-31 from quarterly-indexed filing https://nsearchives.nseindia.com/corporate/xbrl/NBFC_INDAS_69501_444497_29042021115227_WEB.xml
- Yahoo not merged: conflicting annual totals/currency in 2023
- 2019: NSE detail does not report parent-attributable profit; left unknown
- Split/bonus factors corroborated with NSE corporate actions: https://www.nseindia.com/api/corporates-corporateActions?index=equities&symbol=BAJAJFINSV&from_date=01-01-2012&to_date=01-10-2026

### BEL (BEL.NSE)

Selected annual listings: 17; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration

### BHARTIARTL (BHARTIARTL.NSE)

Selected annual listings: 12; parsed documents including integrated/recovered annuals: 12; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration

### CIPLA (CIPLA.NSE)

Selected annual listings: 17; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration

### COALINDIA (COALINDIA.NSE)

Selected annual listings: 14; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023

### DRREDDY (DRREDDY.NSE)

Selected annual listings: 14; parsed documents including integrated/recovered annuals: 11; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023
- 2024: NSE profit attribution does not reconcile: parent=0, NCI=0, total=55779000000; profit fields quarantined

### EICHERMOT (EICHERMOT.NSE)

Selected annual listings: 14; parsed documents including integrated/recovered annuals: 12; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023
- gap year 2013; history retained from 2014
- gap years 2015, 2016; history retained from 2017

### ETERNAL (ETERNAL.NSE)

Selected annual listings: 3; parsed documents including integrated/recovered annuals: 5; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration
- fewer than 7 annual periods

### GRASIM (GRASIM.NSE)

Selected annual listings: 19; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration
- gap year 2015; history retained from 2016

### HCLTECH (HCLTECH.NSE)

Selected annual listings: 19; parsed documents including integrated/recovered annuals: 14; failed source attempts: 0.

- Recovered 31-Mar-2019 through https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=01-Apr-201831-Mar-2019ANANCCNEHCLTECH&seq_id=1059930&industry=-&frOldNewFlag=N&ind=N&format=New; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/corporate/xbrl/INDAS_43975_101166_10052019010546_WEB_2.xml
- Yahoo not merged: conflicting annual totals/currency in 2024
- 2024: NSE profit attribution does not reconcile: parent=0, NCI=0, total=157100000000; profit fields quarantined
- gap year 2016; history retained from 2017

### HDFCLIFE (HDFCLIFE.NSE)

Selected annual listings: 0; parsed documents including integrated/recovered annuals: 0; failed source attempts: 3.

- Failed `https://nsearchives.nseindia.com/corporate/xbrl/INTEGRATED_FILING_LI_1417727_17042025062333_WEB.xml`: Error: No recognized annual income facts
- Failed `https://nsearchives.nseindia.com/corporate/xbrl/INTEGRATED_FILING_LI_1652667_16042026072910_WEB.xml`: Error: No recognized annual income facts
- Failed `https://nsearchives.nseindia.com/corporate/xbrl/INTEGRATED_FILING_LI_1700856_24072026044854_WEB.xml`: Error: No recognized annual income facts

### HINDALCO (HINDALCO.NSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration

### HINDUNILVR (HINDUNILVR.NSE)

Selected annual listings: 18; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2025

### ITC (ITC.NSE)

Selected annual listings: 19; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023

### INDIGO (INDIGO.NSE)

Selected annual listings: 8; parsed documents including integrated/recovered annuals: 10; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2025
- 2022: NSE profit attribution does not reconcile: parent=61618450000, NCI=0, total=-61618450000; profit fields quarantined

### JSWSTEEL (JSWSTEEL.NSE)

Selected annual listings: 18; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration

### JIOFIN (JIOFIN.NSE)

Selected annual listings: 1; parsed documents including integrated/recovered annuals: 3; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2024
- fewer than 7 annual periods

### KOTAKBANK (KOTAKBANK.NSE)

Selected annual listings: 17; parsed documents including integrated/recovered annuals: 14; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023
- Split/bonus factors corroborated with NSE corporate actions: https://www.nseindia.com/api/corporates-corporateActions?index=equities&symbol=KOTAKBANK&from_date=01-01-2012&to_date=01-10-2026
- gap year 2017; history retained from 2018

### MARUTI (MARUTI.NSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023
- 2018: NSE detail profit attribution does not reconcile: parent=0, NCI=0, total=78807000000; profit fields quarantined

### MAXHEALTH (MAXHEALTH.NSE)

Selected annual listings: 4; parsed documents including integrated/recovered annuals: 6; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023
- 2023: NSE profit attribution does not reconcile: parent=0, NCI=0, total=11035100000; profit fields quarantined
- fewer than 7 annual periods

### NTPC (NTPC.NSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Recovered 31-Mar-2017 through https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=01-Apr-201631-Mar-2017ANANCCNENTPC&seq_id=1046325&industry=-&frOldNewFlag=N&ind=N&format=New; first source failed: Error: No matching audited annual context
- Recovered 31-Mar-2018 through https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=01-Apr-201731-Mar-2018ANANCCNENTPC&seq_id=1046324&industry=-&frOldNewFlag=N&ind=N&format=New; first source failed: Error: No matching audited annual context
- Yahoo latest years merged after annual INR revenue and parent-profit corroboration

### NESTLEIND (NESTLEIND.NSE)

Selected annual listings: 0; parsed documents including integrated/recovered annuals: 2; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2025
- 2025: NSE profit attribution does not reconcile: parent=0, NCI=0, total=32075900000; profit fields quarantined
- 2026: NSE profit attribution does not reconcile: parent=0, NCI=0, total=34990770000; profit fields quarantined
- fewer than 7 annual periods

### ONGC (ONGC.NSE)

Selected annual listings: 19; parsed documents including integrated/recovered annuals: 14; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023
- gap year 2022; history retained from 2023
- fewer than 7 annual periods

### POWERGRID (POWERGRID.NSE)

Selected annual listings: 14; parsed documents including integrated/recovered annuals: 14; failed source attempts: 2.

- Yahoo not merged: conflicting annual totals/currency in 2023
- gap year 2013; history retained from 2014
- Failed `https://nsearchives.nseindia.com/archives/financial_results/financial_res_POWERGRID_108040.html`: Error: Legacy identity/annual/consolidated mismatch
- Failed `https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=01-Apr-201231-Mar-2013ANANCCAEPOWERGRID&seq_id=108040&industry=-&frOldNewFlag=N&ind=-&format=Old`: Error: Unsupported NSE detail format

### SBILIFE (SBILIFE.NSE)

Selected annual listings: 0; parsed documents including integrated/recovered annuals: 0; failed source attempts: 0.

- No qualifying consolidated annual statements were obtained.

### SHRIRAMFIN (SHRIRAMFIN.NSE)

Selected annual listings: 14; parsed documents including integrated/recovered annuals: 14; failed source attempts: 0.

- Recovered 31-Mar-2012 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_SRTRANSFIN_94006.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_SHRIRAMFIN_94006.html
- Recovered 31-Mar-2013 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_SRTRANSFIN_104661.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_SHRIRAMFIN_104661.html
- Recovered 31-Mar-2014 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_SRTRANSFIN_116748.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_SHRIRAMFIN_116748.html
- Recovered 31-Mar-2015 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_SRTRANSFIN_127394.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_SHRIRAMFIN_127394.html
- Recovered 31-Mar-2016 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_SRTRANSFIN_1008219.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_SHRIRAMFIN_1008219.html
- Recovered 31-Mar-2017 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_SRTRANSFIN_1021019.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_SHRIRAMFIN_1021019.html
- Yahoo not merged: conflicting annual totals/currency in 2023
- 2020: NSE profit attribution does not reconcile: parent=0, NCI=0, total=25122700000; profit fields quarantined
- 2021: NSE profit attribution does not reconcile: parent=0, NCI=0, total=24988300000; profit fields quarantined
- Split/bonus factors corroborated with NSE corporate actions: https://www.nseindia.com/api/corporates-corporateActions?index=equities&symbol=SHRIRAMFIN&from_date=01-01-2012&to_date=01-10-2026
- gap year 2019; history retained from 2020

### SBIN (SBIN.NSE)

Selected annual listings: 19; parsed documents including integrated/recovered annuals: 14; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023
- gap year 2018; history retained from 2019

### SUNPHARMA (SUNPHARMA.NSE)

Selected annual listings: 16; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Recovered audited annual column for 2021-03-31 from quarterly-indexed filing https://nsearchives.nseindia.com/corporate/xbrl/INDAS_70565_452424_28052021020136_WEB.xml
- Yahoo latest years merged after annual INR revenue and parent-profit corroboration

### TCS (TCS.NSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration

### TATACONSUM (TATACONSUM.NSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Recovered 31-Mar-2012 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATAGLOBAL_95279.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATACONSUM_95279.html
- Recovered 31-Mar-2013 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATAGLOBAL_107293.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATACONSUM_107293.html
- Recovered 31-Mar-2014 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATAGLOBAL_120395.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATACONSUM_120395.html
- Recovered 31-Mar-2015 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATAGLOBAL_130666.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATACONSUM_130666.html
- Recovered 31-Mar-2016 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATAGLOBAL_1026201.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATACONSUM_1026201.html
- Recovered 31-Mar-2017 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATAGLOBAL_1026200.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATACONSUM_1026200.html
- Yahoo latest years merged after annual INR revenue and parent-profit corroboration
- 2018: NSE profit attribution does not reconcile: parent=4363000000, NCI=690100000, total=5565000000; profit fields quarantined
- 2019: NSE profit attribution does not reconcile: parent=705800000, NCI=32800000, total=4569800000; profit fields quarantined

### TMPV (TMPV.NSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Recovered 31-Mar-2012 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATAMOTORS_95777.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_TMPV_95777.html
- Recovered 31-Mar-2013 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATAMOTORS_106472.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_TMPV_106472.html
- Recovered 31-Mar-2014 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATAMOTORS_118611.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_TMPV_118611.html
- Recovered 31-Mar-2015 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATAMOTORS_129137.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_TMPV_129137.html
- Recovered 31-Mar-2016 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATAMOTORS_1027030.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_TMPV_1027030.html
- Recovered 31-Mar-2017 through https://nsearchives.nseindia.com/archives/financial_results/financial_res_TATAMOTORS_1027029.html; first source failed: Error: NSE HTTP 404: https://nsearchives.nseindia.com/archives/financial_results/financial_res_TMPV_1027029.html
- Yahoo not merged: conflicting annual totals/currency in 2025
- 2018: NSE profit attribution does not reconcile: parent=385245200000, NCI=1293500000, total=90913600000; profit fields quarantined
- 2019: NSE profit attribution does not reconcile: parent=-344017300000, NCI=1017600000, total=-287242000000; profit fields quarantined

### TECHM (TECHM.NSE)

Selected annual listings: 15; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Recovered audited annual column for 2021-03-31 from quarterly-indexed filing https://nsearchives.nseindia.com/corporate/xbrl/INDAS_69440_443815_26042021082727_WEB.xml
- Yahoo not merged: conflicting annual totals/currency in 2025
- 2025: NSE profit attribution does not reconcile: parent=2411000000, NCI=50000000, total=42530000000; profit fields quarantined

### TITAN (TITAN.NSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration

### TRENT (TRENT.NSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023
- 2023: NSE profit attribution does not reconcile: parent=4446900000, NCI=510000000, total=3936900000; profit fields quarantined
- Split/bonus factors corroborated with NSE corporate actions: https://www.nseindia.com/api/corporates-corporateActions?index=equities&symbol=TRENT&from_date=01-01-2012&to_date=01-10-2026
- share count jumped 0.01x in 2022; history retained from 2022
- fewer than 7 annual periods

### ULTRACEMCO (ULTRACEMCO.NSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023

### HDFCBANK (HDB.US)

Selected annual listings: 15; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Recovered audited annual column for 2021-03-31 from quarterly-indexed filing https://nsearchives.nseindia.com/corporate/xbrl/BANKING_69364_440079_19042021064746_WEB.xml
- Yahoo not merged: conflicting annual totals/currency in 2023
- Preserved canonical HDB.US existing INR history; official INR ordinary-share candidate requires explicit depositary-basis reconciliation.

### ICICIBANK (IBN.US)

Selected annual listings: 19; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Recovered audited annual column for 2021-03-31 from quarterly-indexed filing https://nsearchives.nseindia.com/corporate/xbrl/BANKING_69434_443531_24042021083448_WEB.xml
- Yahoo not merged: conflicting annual totals/currency in 2023
- Preserved canonical IBN.US existing INR history; official INR ordinary-share candidate requires explicit depositary-basis reconciliation.

### INFY (INFY.US)

Selected annual listings: 14; parsed documents including integrated/recovered annuals: 10; failed source attempts: 0.

- Yahoo not merged: conflicting annual totals/currency in 2023
- 2018: NSE detail profit attribution does not reconcile: parent=0, NCI=0, total=160290000000; profit fields quarantined
- Preserved canonical INFY.US existing USD history; official INR ordinary-share candidate requires explicit depositary-basis reconciliation.

### LT (LTOD.LSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 1.

- Yahoo not merged: conflicting annual totals/currency in 2025
- Preserved canonical LTOD.LSE existing INR history; official INR ordinary-share candidate requires explicit depositary-basis reconciliation.
- Failed `https://nsearchives.nseindia.com/corporate/xbrl/INTEGRATED_FILING_INDAS_1477033_03072025073621_WEB.xml`: Error: NSE HTTP 404: https://nsearchives.nseindia.com/corporate/xbrl/INTEGRATED_FILING_INDAS_1477033_03072025073621_WEB.xml

### M&M (MHID.LSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 9; failed source attempts: 12.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration
- Preserved canonical MHID.LSE existing INR history; official INR ordinary-share candidate requires explicit depositary-basis reconciliation.
- Failed `https://nsearchives.nseindia.com/archives/financial_results/financial_res_M&M_96637.html`: Error: Legacy identity/annual/consolidated mismatch
- Failed `https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=01-Apr-201131-Mar-2012ANANCCAEM%26M&seq_id=96637&industry=-&frOldNewFlag=&ind=-&format=Old`: Error: NSE detail identity/annual mismatch
- Failed `https://nsearchives.nseindia.com/archives/financial_results/financial_res_M&M_107649.html`: Error: Legacy identity/annual/consolidated mismatch
- Failed `https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=01-Apr-201231-Mar-2013ANANCCAEM%26M&seq_id=107649&industry=-&frOldNewFlag=N&ind=-&format=Old`: Error: NSE detail identity/annual mismatch
- Failed `https://nsearchives.nseindia.com/archives/financial_results/financial_res_M&M_120409.html`: Error: Legacy identity/annual/consolidated mismatch
- Failed `https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=01-Apr-201331-Mar-2014ANANCCAEM%26M&seq_id=120409&industry=-&frOldNewFlag=N&ind=-&format=Old`: Error: NSE detail identity/annual mismatch
- Failed `https://nsearchives.nseindia.com/archives/financial_results/financial_res_M&M_130148.html`: Error: Legacy identity/annual/consolidated mismatch
- Failed `https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=01-Apr-201431-Mar-2015ANANCCAEM%26M&seq_id=130148&industry=-&frOldNewFlag=N&ind=-&format=Old`: Error: NSE detail identity/annual mismatch
- Failed `https://nsearchives.nseindia.com/archives/financial_results/financial_res_M&M_1009649.html`: Error: Legacy identity/annual/consolidated mismatch
- Failed `https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=01-Apr-201531-Mar-2016ANANCCAEM%26M&seq_id=1009649&industry=-&frOldNewFlag=N&ind=-&format=Old`: Error: NSE detail identity/annual mismatch
- Failed `https://nsearchives.nseindia.com/archives/financial_results/financial_res_M&M_1027145.html`: Error: Legacy identity/annual/consolidated mismatch
- Failed `https://www.nseindia.com/api/corporates-financial-results-data?index=equities&params=01-Apr-201631-Mar-2017ANANCCNEM%26M&seq_id=1027145&industry=-&frOldNewFlag=N&ind=N&format=Old`: Error: NSE detail identity/annual mismatch

### RELIANCE (RIGD.LSE)

Selected annual listings: 19; parsed documents including integrated/recovered annuals: 14; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration
- Preserved canonical RIGD.LSE existing INR history; official INR ordinary-share candidate requires explicit depositary-basis reconciliation.
- gap year 2022; history retained from 2023
- fewer than 7 annual periods

### TATASTEEL (TTST.LSE)

Selected annual listings: 20; parsed documents including integrated/recovered annuals: 15; failed source attempts: 0.

- Yahoo latest years merged after annual INR revenue and parent-profit corroboration
- Split/bonus factors corroborated with NSE corporate actions: https://www.nseindia.com/api/corporates-corporateActions?index=equities&symbol=TATASTEEL&from_date=01-01-2012&to_date=01-10-2026
- Preserved canonical TTST.LSE existing INR history; official INR ordinary-share candidate requires explicit depositary-basis reconciliation.

## Reproduction and validation

```sh
npx tsx scripts/value/india-fundamentals.ts --dry-run
npx tsx scripts/value/india-fundamentals.ts --only=RELIANCE.NSE,TCS.NSE,HDFCBANK.NSE,INFY.US,ITC.NSE
npx tsx scripts/value/india-fundamentals.ts
```

The dedicated entry point writes no company metadata and runs no downstream stages. `scripts/value/cli.ts india` is also available as an explicitly invoked stage; it is not added to the daily analysis/publication pipeline.

Validation: **103 tests passed across seven files**; focused TypeScript compilation passed; `git diff --check` passed. No web build was run. The new tests include recorded XML/HTML/JSON from the five pilots, exporter defects, issuer mismatch, period/consolidation rejection, bank fields, unknown parent profit, profit reconciliation, simultaneous bonus/split actions, Yahoo conflict rejection, the 5 GiB threshold and canonical identity. An offline temporary-corpus integration test verifies unrelated fundamentals and analysis remain byte-identical. A regression test first reproduced Yahoo overwriting a 2014-onward official history with four years, then verified preservation after the fix.

```sh
npx vitest run tests/unit/value-india.test.ts tests/unit/value-india-write.test.ts tests/unit/value/yahoo-fundamentals.test.ts tests/unit/value/ops.test.ts tests/unit/value/ops-integration.test.ts tests/unit/value/fundamentals-stage.test.ts tests/unit/value/integrity.test.ts
npx tsc --noEmit --incremental false --skipLibCheck --esModuleInterop --target es2022 --module nodenext --moduleResolution nodenext lib/value/india/filings.ts lib/value/india/importer.ts scripts/value/india-fundamentals.ts scripts/value/stages/india.ts scripts/value/stages/fundamentals.ts tests/unit/value-india.test.ts tests/unit/value-india-write.test.ts tests/unit/value/fundamentals-stage.test.ts
```

Code review was performed inline because the user explicitly prohibited subagents. Remaining work is historical full-statement backfill, missing-year/source-scale resolution, insurance support, and depositary-basis reconciliation—not relaxing integrity checks. The available annual-report links are a starting point for that work; this report makes no claim that it has been completed.
