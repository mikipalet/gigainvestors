READY

Fix and target proof ready for integration on `value-calib`. **This is not a clearance to publish the whole nightly unchanged.** CB and DPZ both pass all five tests again with the corrected, primary-source share counts; calibration expectations are unchanged. More freezes/source repairs are needed elsewhere, listed below. No push, deployment, publication, paid API call, or subagent. The source `~/value-corpus` was read-only; its daily-runner lock was not accessed by this task.

## Exact failure and decision

The released local store is dated **2026-10-05 00:48:32Z**; CB and DPZ's live analyses were made October 4. Today's failed analyses were made **October 6 06:15:00Z / 06:15:38Z**. The publication log records 8 true positives / 2 false negatives and aborts at 08:46:09Z. This comparison covers the actual released dossiers and today's persisted analysis inputs, not a fresh API response.

| Input or subtest | CB live → nightly | DPZ live → nightly |
|---|---|---|
| Management | pass → fail | pass → fail |
| Trigger | financial-company dilution, 10-year growth >2% | buyback timing: Spearman <−0.5, ≥6 years, average yield >1% |
| Ten-year diluted share CAGR | −1.061675% → **+2.016905%** | −4.338763% → −4.721412%; passes |
| Five-year diluted share CAGR | not used by financial test | −2.801106% → −2.888130%; passes |
| Buyback timing correlation | financial test does not use it | −0.430303 → **−0.624242** |
| Buyback yield / observations | not a failing subtest | 4.520930% → 4.511574%; 10 years both |
| Capital creation | book gain 118.480546 → **95.096945/share**; retained 67.754843 → **68.176023/share**, still passes | cap gain $6.453809bn → **$5.557226bn** vs retained **−$2.017102bn**, still passes |
| Acquisitions / capital allocation | retained-book test passes at 1.394874× | $125.38m vs $4.414282bn ten-year net income (2.84%); passes |
| SBC | not a financial management subtest | accounting SBC/OCF **5.635922%**, below 15%; accounting passes |
| Insider ownership | no numeric ownership subtest in this implementation | same; not the cause |
| Judgement | no override; repeats numeric failure | no override; repeats numeric failure |

Neither failure means the system compared actual repurchase prices with intrinsic value. DPZ's failing test is a correlation of annual buyback yield and earnings yield. Debt-funded buybacks are informational, not a failure. The stored allocation evidence/qualitative readings did not cause either flip. Historical monthly closes overlapping live through 2025 are **identical for both issuers**. The changed price input for DPZ is the selected month, not a newly changed quote.

### CB: correct new data, defective treatment of an old acquisition

The cached fundamentals still contain the same legacy vendor share proxies used by live. During re-analysis, `correctCachedAnnualSources` replaces them with SEC weighted-average diluted counts. The material baseline changes from **446,739,600 to 328,835,378 shares for FY2015**; FY2025 remains **401,513,338**. The new 2.016905% calculation is mathematically correct. Restoring the old denominator would be wrong.

The [2015 10-K EPS note](https://www.sec.gov/Archives/edgar/data/896159/000089615916000027/R26.htm) reports 328,835,378 diluted shares. ACE acquired Chubb in January 2016 for approximately $29.5bn, including approximately $15.2bn in newly issued shares ([2016 10-K](https://www.sec.gov/Archives/edgar/data/896159/000089615917000004/cb-12312016x10k.htm)). The [issuance legal exhibit](https://www.sec.gov/Archives/edgar/data/896159/000119312516430022/d100449dex51.htm) identifies **136,951,452 new shares**. This explains the step into the combined company, rather than recurrent compensation dilution. The [2025 EPS note](https://www.sec.gov/Archives/edgar/data/896159/000089615926000005/R28.htm) confirms diluted shares of 414,202,568 / 408,486,435 / 401,513,338 for 2023–2025.

The recent five-year record is **453,441,512 (2020) → 401,513,338 (2025), −2.403164% annually**. The old financial rule rejected this sustained shrinkage solely because the ten-year window straddled the acquisition; the operating-company test already checks either five or ten years. The fix brings financial dilution onto that same two-window approach while retaining its existing 2% threshold, crisis handling, complete observations, and independent retained-book test. It is a general rule change, not a CB exception, and its wider effects are recorded separately. **No acquisition shares are silently subtracted from EPS, book value, or valuations.**

### DPZ: fiscal dates and stock-versus-flow denominators

The new SEC diluted shares are correct: **49,923,859 (2016), 37,691,351 (2021), 34,237,646 (2025)**, replacing live's 49,090,100 / 36,668,300 / 34,237,600 proxies. The [2025 10-K EPS table](https://www.sec.gov/Archives/edgar/data/1286681/000119312526062321/dpz-20251228.htm) confirms the current diluted counts; these remain the EPS and dilution denominators.

The annual-source correction also reconciles nominal December dates to the actual 52/53-week fiscal dates. Taking `end.slice(0,7)` then selects prices almost a month after first-week January year-ends:

| Fiscal year | Actual fiscal end | Live/appropriate month close | Nightly selected close |
|---|---|---:|---:|
| 2016 | 2017-01-01 | Dec 2016: $159.240005 | Jan 2017: $174.539993 |
| 2020 | 2021-01-03 | Dec 2020: $383.459991 | Jan 2021: $370.760010 |
| 2021 | 2022-01-02 | Dec 2021: $564.330017 | Jan 2022: $454.649994 |
| 2022 | 2023-01-01 | Dec 2022: $346.399994 | Jan 2023: $353.00 |

Fixing the month alone leaves rho **−0.551515**, still failing: the second defect is multiplying a point-in-time price by an annual weighted-average EPS share count. The correct fiscal-end shares are **48,100,143 (2016), 36,138,273 (2021), 33,627,992 (2025)**. The [2022 10-Q](https://www.sec.gov/Archives/edgar/data/1286681/000095017022012843/R9.htm) confirms the January 2, 2022 opening balance; the [2025 capital-structure note](https://www.sec.gov/Archives/edgar/data/1286681/000119312526062321/R22.htm) confirms the 2025/2024 ending counts. Exact annual SEC facts and accession numbers for every tested year are committed in the regression fixture.

The cash-buyback inputs are unchanged: **$1.320902bn (2021), $293.740m (2022), $269.025m (2023), $329.557m (2024), $357.697m (2025)**. The [2022 annual report](https://www.sec.gov/Archives/edgar/data/1286681/000119312523071985/d409740dars.pdf) corroborates 2,912,558 shares repurchased for approximately $1.32bn in 2021. The 2025 capital note reports 785,280 shares for $354.7m in 2025; the [parent/cash-flow disclosure](https://www.sec.gov/Archives/edgar/data/1286681/000119312526062321/R25.htm) explains the additional roughly $3.0m excise-tax payment in the consolidated cash outflow. This is not an invented increase in buyback activity.

With both corrections: **rho −0.454545**, average buyback yield **4.661419%**, market-cap gain **$6.357353bn**, and **all five tests pass**. No rho/yield/sample-size threshold was relaxed. These filings establish the source data; passing this screening heuristic is not a claim that every repurchase was below intrinsic value.

## Implementation and proof

- Fiscal years ending in the first week use the preceding month-end close. The same fiscal month drives annual average-price estimates and LTM capitalization. Monthly prices remain an approximation for other fiscal-end days.
- Annual source correction separately captures exact fiscal-instant `CommonStockSharesOutstanding`; cover-page dates, annual averages, conflicts, future filings, and unevidenced ADR conversions do not qualify. Only provenance-marked counts replace the capitalization proxy. Split/ADS conversions keep the two share bases coherent, including differing comparative filing dates.
- Financial management considers complete full/five-year dilution windows, preserving actual share counts and the retained-book core check. Rule explanations, metric labels, tiles, and split replays understand the extra metric; old frozen dossiers retain their old rule interpretation.
- Pipeline version **27 → 28** invalidates cached fingerprints. Regression fixtures are today's real annual inputs, not ticker-specific passes.

Red tests reproduced the CB failure, DPZ's wrong FY2021 capitalization, missing fiscal-instant sourcing, and differing-filing-date split-basis defect before their fixes. Final focused validation: **228 passed / 1 existing skip across 12 files**, plus **4 split-scope tests passed**; scoped TypeScript and `git diff --check` passed.

Actual `scripts/value/stages/analyze.ts` replay, using cached report readings, with external network blocked and source writes guarded: **2 written, 0 unchanged, 0 failed**. CB and DPZ each have five passes. Applying the existing release freeze and universe alias resolution to the production `calibrationSummary` gives **10 TP, 16 TN, 0 FP, 0 FN, 0 unclear, 2 missing, 8 exceptions**. The two pre-existing missing controls are GT and LCID; VALE.US resolves to VALE3.SA and BHC.US to BHC.TO. No calibration fixture expectations changed.

The full value unit suite initially produced 2,116 passes, 6 skips, and 16 failures. One was the new metric's missing label and is fixed/retested. The other 15 concerned runner/filing disk floors (5–6 GiB), a design-snapshot test requiring `/tmp` while this task requires `~/data/calib`, and price-stage fixtures. The same failing tests fail on an unchanged HEAD archive under the same restrictions (additional price tests hit their disk floor as free space declined). **A completely green unrestricted suite is not claimed.**

The attempted full analysis-stage cohort replay was terminated with exit 143 before producing outputs. It is not presented as a successful 3,899-company analysis. A bounded management-only replay instead compares saved annual inputs and old/new functions; its scope and results are appended below. This leaves all peer/economic/judgement inputs fixed and avoids rerunning providers or publication.

## Other nightly changes the controller must handle

Compared all **3,899 live dossier records** with their October 6 analysis records: none missing. The store's funnel covers 3,892 rows; dossier count includes records outside that funnel. Comparisons match series by fiscal year, not array position. This is a raw-analysis audit plus a freeze projection, not a newly built/published store.

- **479 companies** have at least one changed quality subtest, including **24 quality losses and 14 gains** before this patch/freeze projection.
- Effective current preservation is **154 IDs**: 151 explicit freezes plus unchanged coverage baselines (four baseline matches, one overlapping).
- After those existing freezes, **374 companies** still have changed quality subtests; raw quality changes reaching publication would be **12 losses and one gain**. CB/DPZ account for two losses and this patch repairs those.
- **723 explicit numeric→null fields across 86 companies**, including repeated exposed/raw metrics. After existing freezes: **512 fields across 38 companies**. Whole-object valuation losses are counted separately, not hidden inside that count.
- **Nine unfrozen valuation→null regressions:** BRO, COP, EG, GRMN, HST, MCD, MRK.XETRA, VIVT3.SA, WRB. Full old midpoints and reasons are in `audit-additional.json`.

The remaining unfrozen quality losses from tonight are:

| Company | Changed subtest / reason |
|---|---|
| MCD, WRB, GRMN | all five become unclear: fewer than seven analyzed years |
| DVA | management: market-cap gain below retained earnings |
| SBSI, BOKF | accounting: persistent excess credit provisions versus peers |
| LAMR | management: acquisitions >50% of profits with low/deteriorating ROIC |
| VCTR, NOVT | accounting: repeated special charges plus SBC >15% of OCF |
| CFG-PH | moat: common-equity return below threshold |

HON is the unfrozen raw quality gain (management changes fail→pass). These additional changes have not received issuer-by-issuer primary-source approval in this task. Preserve their live decisions pending review rather than assuming calibration clearance approves them.

**Confirmed source-scale regression examples:** MCD's latest SEC companyfacts comparisons switch from 750,100,000 diluted shares (2020) to **751.8 (2021)** and 716.4 (2025). WRB switches from **419,192 (2022)** to **409,948,000 (2023)**. GRMN switches from **193,043 (2021)** to **193,042,000 (2022)**. The current source-selection path treats those tagged units literally, after which integrity truncates the history. The cached fundamentals still have 30/30/27 years, but analyzed inputs retain only **5/3/4 years** respectively. These require a separately evidenced unit-scale repair or immediate freeze; adding fake years is not a fix.

**CEG is already protected by its explicit freeze.** SEC companyfacts carries zero diluted shares for pre-spin 2020 and 2021 (accessions 0001868275-23-000014 and 0001868275-24-000014). Annual-source correction overwrites the prior **326,664,000** pro-forma counts; `checkIntegrity` converts zero to null. This removes 2020/2021 per-share series, five-year share CAGR (previously −0.787664%), and the long per-share endpoint test (growth previously 7.294944%). Keep its freeze until predecessor/pro-forma capitalization is reconciled. Do not treat those zeros as evidence of no shares or restore counts without their basis.

All 38 unfrozen companies with explicit numeric losses are listed in `audit-additional.json`, with per-field values in `numeric-nulls.json`. Several are benign/nonapplicable ratios, so that list is a review queue rather than a claim that every null is a defect. The nine lost valuations and the three proven scale/history truncations are the immediate preservation priorities.

No freeze file was changed. The controller should integrate the code, re-analyze with pipeline 28, retain existing freezes, and review/preserve the remaining losses before attempting the ordinary publication gate. Publication itself has not been run here.

## Final bounded replay and integration scope

The final offline management replay covered **3608 scored live-dossier companies**, with **zero mismatches** between recomputed pre-fix management and today's saved numeric verdict. The other 291 records were already insufficient-data/no-usable-input records, not newly failed replays. It holds the saved annual numerators, judgement inputs and other subtests fixed, feeds only the relevant share concepts to source selection, and changes only capitalization inputs and the financial dilution rule. **Zero previously numeric management metrics became null.** All 38 changed management verdicts are enumerated below; these are intentional consequences to review, not a claim that only CB/DPZ changes.

Among these changes, the all-five quality transitions relative to tonight are: NMIH.US fail→pass, CB.US fail→pass, DPZ.US fail→pass. Any newly changed quality name beyond CB/DPZ needs controller review/preservation; the patch is not an authorization to publish it automatically. No new negative calibration control passes all five.

| Company | Management tonight → patched | Publication protection |
|---|---|---|
| OMC.US | fail → pass | unfrozen: review |
| POW.TO | fail → pass | unfrozen: review |
| HBAN.SW | fail → pass | unfrozen: review |
| TFC.US | fail → pass | already frozen |
| HXL.US | pass → fail | unfrozen: review |
| LAD.US | pass → fail | unfrozen: review |
| KDP.US | pass → fail | unfrozen: review |
| ABCB.US | fail → pass | unfrozen: review |
| DNOW.US | fail → pass | unfrozen: review |
| KOD.US | pass → fail | unfrozen: review |
| CNR.US | pass → fail | unfrozen: review |
| VMRK.US | pass → fail | unfrozen: review |
| FUTU.US | fail → pass | unfrozen: review |
| CRC.US | fail → pass | unfrozen: review |
| LVS.US | pass → fail | unfrozen: review |
| SD.US | pass → fail | unfrozen: review |
| 601995.SHG | fail → pass | unfrozen: review |
| DAN.US | pass → fail | unfrozen: review |
| ESTC.US | pass → fail | unfrozen: review |
| PBFS.US | fail → pass | unfrozen: review |
| UVSP.US | fail → pass | unfrozen: review |
| OPLN.US | pass → fail | unfrozen: review |
| TILE.US | pass → fail | unfrozen: review |
| NMIH.US | fail → pass | unfrozen: review |
| 600015.SHG | fail → pass | unfrozen: review |
| FND.US | pass → fail | unfrozen: review |
| KLIC.US | pass → fail | unfrozen: review |
| TREX.US | fail → pass | unfrozen: review |
| AXISBANK.NSE | fail → pass | unfrozen: review |
| UCG.MI | fail → pass | unfrozen: review |
| OZK.US | fail → pass | unfrozen: review |
| 601998.SHG | fail → pass | already frozen |
| 601988.SHG | fail → pass | already frozen |
| 600000.SHG | fail → pass | already frozen |
| CB.US | fail → pass | unfrozen: review |
| INTC.US | fail → pass | unfrozen: review |
| DPZ.US | fail → pass | unfrozen: review |
| 032830.KO | fail → pass | unfrozen: review |

Machine-readable complete verdict/null diffs, source hashes, regression logs, replay code and per-company before/after metrics are committed under `docs/value/calib-1/`. Full scratch work and the isolated two-company analysis outputs are `/Users/miki/data/calib/`; original source mounts were guarded read-only. Final disk observed before commit: root about 4.07 GiB, data about 139.52 GiB. No production build was attempted.
