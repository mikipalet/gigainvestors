# Calibration round 4

Date: 2026-09-29. Base: `8e30052`, branch/worktree `value`. Corpus: `$HOME/value-corpus`. Pipeline version: **5**.

## Changes and root cause

- **M1:** Fiscal-end month lookup, cache loading, and USD currency conversion were already working. KO's pre-change analysis contained 2016–2025 market caps; `marketCapGain` was null because `retainedTest` required an unpriced FY2015 baseline. The 120 monthly closes start in October 2016. AAPL also lacks its September 2016 close. No price or market cap has been invented.
- **M1 window qualification:** The test now uses the earliest priced baseline within the trailing ten years and the latest fiscal endpoint, requiring at least seven complete, consecutive years. Retained earnings exclude the baseline year and cover exactly the same interval as the cap gain. The dates appear in metrics and reasons. This intentionally changes the prior fixed-ten-year requirement: these live tests span nine years (eight for AAPL and V), not ten. A question about backfilling versus using the available window was offered; absent a reply, the stated available-window default was used. No older prices were fetched. Missing latest prices, fewer than seven years, gaps, or missing required earnings still prevent a verdict. Share dilution retains its existing five-/ten-year windows.
- **M2:** Spearman rho compares buyback yield and earnings yield in the same valid fiscal years with positive buybacks. Ties use average ranks. Failure requires at least six paired years, rho strictly below -0.5, and average buyback yield strictly above 1%. Other available results are informational. Constant ranks have undefined rho (`null`) and do not fail. Missing price evidence remains unavailable. The old dollar covariance metric is removed.
- **M3:** Acquisition failure requires a complete ten-year proxy/spend sum greater than half of the same ten-year net income, and latest-three-year median ROIC below both 15% (`T.moat.roicMedian`) and two-thirds of earliest-three-year median ROIC. Missing years are not treated as a complete ten-year total. Each endpoint median requires all three observations. Unlimited tangible returns participate in the median and are described as unlimited, with nonfinite display metrics serialized as null. The slope is removed; reasons show “ROIC first 3 years vs last 3 years.”
- All new thresholds live in `lib/value/config.ts`. No question/trust changes, ticker-specific management exceptions, subagents, publish, or deployment.

## Live commands and outcomes

Listings resolve `VALE.US` to `VALE3.SA` and `BHC.US` to `BHC.TO`. Japanese calibration IDs are still absent from the current universe; no fundamentals were manufactured for missing companies.

```sh
VALUE_CORPUS_DIR="$HOME/value-corpus" npm run value -- analyze --only=KO.US,AAPL.US,AXP.US,MCO.US,VRSN.US,V.US,MA.US,CB.US,DPZ.US,POOL.US,CHTR.US,8058.JP,8031.JP,8001.JP,8002.JP,8053.JP,DAL.US,UAL.US,AAL.US,LUV.US,JBLU.US,GT.US,NCLH.US,FCX.US,VALE3.SA,CLF.US,AA.US,BHC.TO,PLUG.US,AMC.US,LCID.US,RIVN.US,CCL.US,M.US,OXY.US,CVX.US --force
VALUE_CORPUS_DIR="$HOME/value-corpus" npm run value -- calibrate
```

Jev credentials were loaded from the configured 1Password item without logging them. Existing question answers were reused where cached; the normal evidence pass ran for companies with no numeric failures.

Initial analysis exit: **1**. Calibration exit: **1**.

```text
> superinvestors@0.1.0 value
> tsx scripts/value/cli.ts analyze --only=KO.US,AAPL.US,AXP.US,MCO.US,VRSN.US,V.US,MA.US,CB.US,DPZ.US,POOL.US,CHTR.US,8058.JP,8031.JP,8001.JP,8002.JP,8053.JP,DAL.US,UAL.US,AAL.US,LUV.US,JBLU.US,GT.US,NCLH.US,FCX.US,VALE3.SA,CLF.US,AA.US,BHC.TO,PLUG.US,AMC.US,LCID.US,RIVN.US,CCL.US,M.US,OXY.US,CVX.US --force

analyze: V.US: Jev HTTP 502
analyze: 25 written, 0 unchanged, 1 failed
Analysis failed for: V.US
```

The first analysis attempt wrote 25 companies and failed Visa (`V.US`) during paragraph evidence with `Jev HTTP 502`. Retried only Visa, preserving the successful results:

```text
> superinvestors@0.1.0 value
> tsx scripts/value/cli.ts analyze --only=V.US --force

analyze: 1 written, 0 unchanged, 0 failed
```

Retry exit: **0**. All 26 available analyses were verified to use pipeline 5 before recording this report.

## Calibration table and confusion counts

```text
> superinvestors@0.1.0 value
> tsx scripts/value/cli.ts calibrate

analyze: 1 written, 25 unchanged, 0 failed
┌─────────┬───────────┬───────────────┬────────────────┬───────────┬───────────┬────────────┬────────────┬────────────────────────────────────────────────────────┐
│ (index) │ id        │ expect        │ understandable │ moat      │ economics │ management │ accounting │ verdict                                                │
├─────────┼───────────┼───────────────┼────────────────┼───────────┼───────────┼────────────┼────────────┼────────────────────────────────────────────────────────┤
│ 0       │ 'KO.US'   │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'pass'     │ 'pass'     │ 'correct'                                              │
│ 1       │ 'AAPL.US' │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'pass'     │ 'pass'     │ 'correct'                                              │
│ 2       │ 'AXP.US'  │ 'quality'     │ 'pass'         │ 'pass'    │ 'unclear' │ 'pass'     │ 'pass'     │ 'unclear'                                              │
│ 3       │ 'MCO.US'  │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'pass'     │ 'pass'     │ 'correct'                                              │
│ 4       │ 'VRSN.US' │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'pass'     │ 'pass'     │ 'correct'                                              │
│ 5       │ 'V.US'    │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'pass'     │ 'pass'     │ 'correct'                                              │
│ 6       │ 'MA.US'   │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'pass'     │ 'pass'     │ 'correct'                                              │
│ 7       │ 'CB.US'   │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'pass'     │ 'pass'     │ 'correct'                                              │
│ 8       │ 'DPZ.US'  │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 9       │ 'POOL.US' │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'pass'     │ 'pass'     │ 'correct'                                              │
│ 10      │ 'CHTR.US' │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'fail'     │ 'pass'     │ 'FAIL: management'                                     │
│ 11      │ '8058.JP' │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 12      │ '8031.JP' │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 13      │ '8001.JP' │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 14      │ '8002.JP' │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 15      │ '8053.JP' │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 16      │ 'DAL.US'  │ 'not_quality' │ 'fail'         │ 'pass'    │ 'fail'    │ 'fail'     │ 'pass'     │ 'correct: understandable, economics, management'       │
│ 17      │ 'UAL.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'pass'     │ 'pass'     │ 'correct: understandable, moat, economics'             │
│ 18      │ 'AAL.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'fail'     │ 'pass'     │ 'correct: understandable, moat, economics, management' │
│ 19      │ 'LUV.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'fail'     │ 'pass'     │ 'correct: understandable, moat, economics, management' │
│ 20      │ 'JBLU.US' │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'fail'     │ 'unclear'  │ 'correct: understandable, moat, economics, management' │
│ 21      │ 'GT.US'   │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'fail'     │ 'pass'     │ 'correct: understandable, moat, economics, management' │
│ 22      │ 'NCLH.US' │ 'not_quality' │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 23      │ 'FCX.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'pass'    │ 'pass'     │ 'pass'     │ 'correct: understandable, moat'                        │
│ 24      │ 'VALE.US' │ 'not_quality' │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 25      │ 'CLF.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'fail'     │ 'unclear'  │ 'correct: understandable, moat, economics, management' │
│ 26      │ 'AA.US'   │ 'not_quality' │ 'fail'         │ 'fail'    │ 'pass'    │ 'fail'     │ 'pass'     │ 'correct: understandable, moat, management'            │
│ 27      │ 'BHC.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'unclear' │ 'pass'     │ 'pass'     │ 'correct: understandable, moat'                        │
│ 28      │ 'PLUG.US' │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'fail'     │ 'unclear'  │ 'correct: understandable, moat, economics, management' │
│ 29      │ 'AMC.US'  │ 'not_quality' │ 'unclear'      │ 'unclear' │ 'unclear' │ 'unclear'  │ 'unclear'  │ 'missing or insufficient data'                         │
│ 30      │ 'LCID.US' │ 'not_quality' │ 'unclear'      │ 'unclear' │ 'unclear' │ 'unclear'  │ 'unclear'  │ 'missing or insufficient data'                         │
│ 31      │ 'RIVN.US' │ 'not_quality' │ 'unclear'      │ 'unclear' │ 'unclear' │ 'unclear'  │ 'unclear'  │ 'missing or insufficient data'                         │
│ 32      │ 'CCL.US'  │ 'not_quality' │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 33      │ 'M.US'    │ 'not_quality' │ 'fail'         │ 'fail'    │ 'pass'    │ 'fail'     │ 'pass'     │ 'correct: understandable, moat, management'            │
│ 34      │ 'OXY.US'  │ 'exception'   │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 35      │ 'CVX.US'  │ 'exception'   │ 'fail'         │ 'fail'    │ 'pass'    │ 'pass'     │ 'pass'     │ 'exception'                                            │
└─────────┴───────────┴───────────────┴────────────────┴───────────┴───────────┴────────────┴────────────┴────────────────────────────────────────────────────────┘
Confusion counts: {"truePositive":8,"trueNegative":12,"falsePositive":0,"falseNegative":1,"unclear":1,"missing":13,"exception":1}
```

Round 3 → round 4: truePositive 1 → 8, trueNegative 12 → 12, falsePositive 0 → 0, falseNegative 7 → 1, unclear 2 → 1, missing 13 → 13, exception 1 → 1. **This is not an overall calibration pass.** Missing coverage and any remaining quality misses are included above.

CHTR remains a quality false negative: its cap gain is -$51.580 billion versus $23.690 billion retained over FY2016–FY2025. Its buyback rho is positive and its latest ROIC median exceeds 15%, so those revised checks do not fail. AXP management passes, while economics remains unclear because incremental invested-capital return is unavailable. Missing-data counts have not been hidden or reclassified.

BHC's management result changes from fail to pass under the revised rules. It still fails understandability and moat, so it remains a true negative overall; the unchanged aggregate true-negative count should not be read as unchanged individual checks. Calibration itself rewrote BHC.TO and reused 25 analyses, as recorded in the output above.

## Quality-company management metrics

All amounts below are in reporting currency (USD for the available quality companies). Rho is unitless; yields and ROIC are fractions. `null` means unavailable, except ROIC explicitly described as unlimited in the reasons. Acquisition and income sums use FY2016–FY2025; the retained-earnings period is shown separately.

| ID | Management | $1 period | Cap gain | Retained earnings | Buyback rho | Mean buyback yield | Paired years | Acquisition proxy | 10y net income | ROIC first 3 | ROIC last 3 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| KO.US | pass | 2016–2025 | 121,378,149,772.644043 | 11,300,000,000 | -0.357576 | 0.007744 | 10 | 17,977,000,000 | 84,641,000,000 | 0.273934 | 0.330805 |
| AAPL.US | pass | 2017–2025 | 2,976,242,913,340.698242 | 552,522,000,000 | 0.85 | 0.041012 | 9 | null | 763,460,000,000 | 0.320298 | 0.854412 |
| AXP.US | pass | 2016–2025 | 186,890,566,726.68457 | 49,939,000,000 | 0.175758 | 0.037895 | 10 | 2,164,000,000 | 69,848,000,000 | 0.131222 | 0.287073 |
| MCO.US | pass | 2016–2025 | 73,057,078,739.929199 | 10,933,600,000 | -0.369697 | 0.016436 | 10 | 7,705,400,000 | 15,488,800,000 | null | 3.758837 |
| VRSN.US | pass | 2016–2025 | 12,953,883,975.692749 | 6,126,920,000 | 0.612121 | 0.043287 | 10 | 92,673,000 | 6,795,169,000 | null | null |
| V.US | pass | 2017–2025 | 412,257,834,465.026855 | 92,135,000,000 | 0.766667 | 0.023916 | 9 | 25,727,000,000 | 130,279,000,000 | null | null |
| MA.US | pass | 2016–2025 | 400,107,744,384.765625 | 66,015,000,000 | 0.769697 | 0.02248 | 10 | 12,896,000,000 | 86,016,000,000 | null | 10.657065 |
| CB.US | pass | 2016–2025 | 61,446,044,382.763672 | 45,693,000,000 | 0.666667 | 0.024295 | 9 | 45,574,000,000 | 62,326,000,000 | null | 1.131203 |
| DPZ.US | missing | | | | | | | | | | |
| POOL.US | pass | 2016–2025 | 4,024,648,504.943848 | 2,712,076,000 | 0.793939 | 0.023607 | 10 | 822,098,000 | 3,966,406,000 | 0.393001 | 0.319778 |
| CHTR.US | fail | 2016–2025 | -51,580,272,116.726685 | 23,690,000,000 | 0.284848 | 0.095362 | 10 | 103,403,000,000 | 43,873,000,000 | null | 0.808579 |
| 8058.JP | missing | | | | | | | | | | |
| 8031.JP | missing | | | | | | | | | | |
| 8001.JP | missing | | | | | | | | | | |
| 8002.JP | missing | | | | | | | | | | |
| 8053.JP | missing | | | | | | | | | | |

Full unrounded metrics and management reasons follow.

### KO.US

Management: **pass** (numeric: pass).

```json
{
  "marketCapGain": 121378149772.64404,
  "retainedEarnings": 11300000000,
  "shareCagr": -0.0017679862099628796,
  "shareCagr5": -0.0007402960044284868,
  "retainedStartFy": 2016,
  "retainedEndFy": 2025,
  "buybackYieldSpearman": -0.3575757575757576,
  "averageBuybackYield": 0.007743568259124985,
  "buybackYears": 10,
  "debtFundedBuybacks": 1,
  "acquisitionSpend": 17977000000,
  "cumulativeNetIncome": 84641000000,
  "roicFirst3Median": 0.27393437225526246,
  "roicLast3Median": 0.3308052991619439
}
```

- $1 retained earnings test: 2016 to 2025 (9 years)
- potential debt-funded buybacks (informational)
- buybacks unrelated to price (informational)
- ROIC first 3 years vs last 3 years: 27.4% vs 33.1%

### AAPL.US

Management: **pass** (numeric: pass).

```json
{
  "marketCapGain": 2976242913340.698,
  "retainedEarnings": 552522000000,
  "shareCagr": -0.040428548881421555,
  "shareCagr5": -0.02849648209790534,
  "retainedStartFy": 2017,
  "retainedEndFy": 2025,
  "buybackYieldSpearman": 0.85,
  "averageBuybackYield": 0.0410119607899551,
  "buybackYears": 9,
  "debtFundedBuybacks": 1,
  "acquisitionSpend": null,
  "cumulativeNetIncome": 763460000000,
  "roicFirst3Median": 0.32029813649232863,
  "roicLast3Median": 0.8544123632555589
}
```

- $1 retained earnings test: 2017 to 2025 (8 years)
- potential debt-funded buybacks (informational)
- buybacks leaned toward cheaper years (informational)
- ROIC first 3 years vs last 3 years: 32.0% vs 85.4%
- not enough data for acquired goodwill and intangibles (proxy) and ROIC stability

### AXP.US

Management: **pass** (numeric: pass).

```json
{
  "marketCapGain": 186890566726.68457,
  "retainedEarnings": 49939000000,
  "shareCagr": -0.0348563823758512,
  "shareCagr5": -0.031163082369870643,
  "retainedStartFy": 2016,
  "retainedEndFy": 2025,
  "buybackYieldSpearman": 0.17575757575757575,
  "averageBuybackYield": 0.03789547367723028,
  "buybackYears": 10,
  "debtFundedBuybacks": 0,
  "acquisitionSpend": 2164000000,
  "cumulativeNetIncome": 69848000000,
  "roicFirst3Median": 0.13122238226605795,
  "roicLast3Median": 0.28707335170659315
}
```

- $1 retained earnings test: 2016 to 2025 (9 years)
- buybacks leaned toward cheaper years (informational)
- ROIC first 3 years vs last 3 years: 13.1% vs 28.7%

Other quality-test limitations: economics: unclear (not enough data for incremental invested capital return).

### MCO.US

Management: **pass** (numeric: pass).

```json
{
  "marketCapGain": 73057078739.9292,
  "retainedEarnings": 10933600000,
  "shareCagr": -0.01129655377388239,
  "shareCagr5": -0.011354294760599015,
  "retainedStartFy": 2016,
  "retainedEndFy": 2025,
  "buybackYieldSpearman": -0.3696969696969697,
  "averageBuybackYield": 0.01643591659445432,
  "buybackYears": 10,
  "debtFundedBuybacks": 0,
  "acquisitionSpend": 7705400000,
  "cumulativeNetIncome": 15488800000,
  "roicFirst3Median": null,
  "roicLast3Median": 3.758836760215467
}
```

- $1 retained earnings test: 2016 to 2025 (9 years)
- buybacks unrelated to price (informational)
- ROIC first 3 years vs last 3 years: unlimited vs 375.9%

### VRSN.US

Management: **pass** (numeric: pass).

```json
{
  "marketCapGain": 12953883975.692749,
  "retainedEarnings": 6126920000,
  "shareCagr": -0.035837137532654606,
  "shareCagr5": -0.04090916737661132,
  "retainedStartFy": 2016,
  "retainedEndFy": 2025,
  "buybackYieldSpearman": 0.6121212121212121,
  "averageBuybackYield": 0.043286946272345785,
  "buybackYears": 10,
  "debtFundedBuybacks": 1,
  "acquisitionSpend": 92673000,
  "cumulativeNetIncome": 6795169000,
  "roicFirst3Median": null,
  "roicLast3Median": null
}
```

- $1 retained earnings test: 2016 to 2025 (9 years)
- potential debt-funded buybacks (informational)
- buybacks leaned toward cheaper years (informational)
- ROIC first 3 years vs last 3 years: unlimited vs unlimited

### V.US

Management: **pass** (numeric: pass).

```json
{
  "marketCapGain": 412257834465.02686,
  "retainedEarnings": 92135000000,
  "shareCagr": -0.022622002557482923,
  "shareCagr5": -0.0255448961230349,
  "retainedStartFy": 2017,
  "retainedEndFy": 2025,
  "buybackYieldSpearman": 0.7666666666666667,
  "averageBuybackYield": 0.023915512798641,
  "buybackYears": 9,
  "debtFundedBuybacks": 1,
  "acquisitionSpend": 25727000000,
  "cumulativeNetIncome": 130279000000,
  "roicFirst3Median": null,
  "roicLast3Median": null
}
```

- $1 retained earnings test: 2017 to 2025 (8 years)
- potential debt-funded buybacks (informational)
- buybacks leaned toward cheaper years (informational)
- ROIC first 3 years vs last 3 years: unlimited vs unlimited

### MA.US

Management: **pass** (numeric: pass).

```json
{
  "marketCapGain": 400107744384.7656,
  "retainedEarnings": 66015000000,
  "shareCagr": -0.022197816939333204,
  "shareCagr5": -0.02148282722969108,
  "retainedStartFy": 2016,
  "retainedEndFy": 2025,
  "buybackYieldSpearman": 0.7696969696969697,
  "averageBuybackYield": 0.022480329975055925,
  "buybackYears": 10,
  "debtFundedBuybacks": 0,
  "acquisitionSpend": 12896000000,
  "cumulativeNetIncome": 86016000000,
  "roicFirst3Median": null,
  "roicLast3Median": 10.657065391593811
}
```

- $1 retained earnings test: 2016 to 2025 (9 years)
- buybacks leaned toward cheaper years (informational)
- ROIC first 3 years vs last 3 years: unlimited vs 1065.7%

### CB.US

Management: **pass** (numeric: pass).

```json
{
  "marketCapGain": 61446044382.76367,
  "retainedEarnings": 45693000000,
  "shareCagr": -0.011859103240316915,
  "shareCagr5": -0.026420334461075612,
  "retainedStartFy": 2016,
  "retainedEndFy": 2025,
  "buybackYieldSpearman": 0.6666666666666666,
  "averageBuybackYield": 0.024294683229581823,
  "buybackYears": 9,
  "debtFundedBuybacks": 0,
  "acquisitionSpend": 45574000000,
  "cumulativeNetIncome": 62326000000,
  "roicFirst3Median": null,
  "roicLast3Median": 1.1312034078807243
}
```

- $1 retained earnings test: 2016 to 2025 (9 years)
- buybacks leaned toward cheaper years (informational)
- ROIC first 3 years vs last 3 years: unlimited vs 113.1%

### DPZ.US

No analysis/fundamentals in the current corpus; management metrics are unavailable.

### POOL.US

Management: **pass** (numeric: pass).

```json
{
  "marketCapGain": 4024648504.9438477,
  "retainedEarnings": 2712076000,
  "shareCagr": -0.01709105622885565,
  "shareCagr5": -0.020281088481296616,
  "retainedStartFy": 2016,
  "retainedEndFy": 2025,
  "buybackYieldSpearman": 0.793939393939394,
  "averageBuybackYield": 0.02360699854622792,
  "buybackYears": 10,
  "debtFundedBuybacks": 1,
  "acquisitionSpend": 822098000,
  "cumulativeNetIncome": 3966406000,
  "roicFirst3Median": 0.39300135877592013,
  "roicLast3Median": 0.3197778324879408
}
```

- $1 retained earnings test: 2016 to 2025 (9 years)
- potential debt-funded buybacks (informational)
- buybacks leaned toward cheaper years (informational)
- ROIC first 3 years vs last 3 years: 39.3% vs 32.0%

### CHTR.US

Management: **fail** (numeric: fail).

```json
{
  "marketCapGain": -51580272116.726685,
  "retainedEarnings": 23690000000,
  "shareCagr": 0.024342706270896963,
  "shareCagr5": -0.09474617971329524,
  "retainedStartFy": 2016,
  "retainedEndFy": 2025,
  "buybackYieldSpearman": 0.28484848484848485,
  "averageBuybackYield": 0.09536205731784568,
  "buybackYears": 10,
  "debtFundedBuybacks": 1,
  "acquisitionSpend": 103403000000,
  "cumulativeNetIncome": 43873000000,
  "roicFirst3Median": null,
  "roicLast3Median": 0.8085792145568694
}
```

- $1 retained earnings test: 2016 to 2025 (9 years)
- potential debt-funded buybacks (informational)
- buybacks leaned toward cheaper years (informational)
- ROIC first 3 years vs last 3 years: unlimited vs 80.9%
- market cap gain below cumulative retained earnings

### 8058.JP

No analysis/fundamentals in the current corpus; management metrics are unavailable.

### 8031.JP

No analysis/fundamentals in the current corpus; management metrics are unavailable.

### 8001.JP

No analysis/fundamentals in the current corpus; management metrics are unavailable.

### 8002.JP

No analysis/fundamentals in the current corpus; management metrics are unavailable.

### 8053.JP

No analysis/fundamentals in the current corpus; management metrics are unavailable.

## Verification

- The recorded KO fundamentals and 120-price cache snapshots are in `tests/fixtures/value/calibration-4/`, copied from the live corpus on 2026-09-29. The offline stage regression reproduced null gain before M1 and now asserts the observed cap gain, matched retained earnings, and fiscal endpoints.
- New M2/M3 regressions were run failing before implementation. Tests cover sample-size/materiality/rho boundaries, yield-versus-dollar ranking, tied/constant ranks, missing pairs, the acquisition spending boundary, both ROIC thresholds, endpoint medians/outliers, unlimited returns, and missing ten-year evidence.
- Existing expectations were updated where the requested policy replaces old behavior: 50% acquisition spend no longer fails; a six-year history cannot supply ten-year acquisition evidence; the removed covariance metric is now rho.
- `npx vitest run tests/unit`: **36 files, 637 tests passed**, exit 0.
- `npx tsc --noEmit`: **passed**, exit 0.
- `git diff --check`: **passed**.
- Inline review completed; no subagents. Generated `tsconfig.tsbuildinfo` changes excluded from the commit.
