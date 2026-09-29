# Calibration round 3

Date: 2026-09-29. Base: `6a1e83a`, branch `value`. Corpus: `$HOME/value-corpus`.

## Changes and qualifications

- C5: Credit Services uses latest annual `(netReceivables + loan assets) / totalAssets > 0.4`. V and MA are operating. Loan assets prefer net/total aggregates over overlapping components; reserves and liability fields are excluded. Banks and insurers skip the working-capital verdict check. Pipeline version is 4.
- **AXP data exception:** the FY2025 EODHD balance sheet supplies netReceivables of 61,851,000,000 and totalAssets of 300,052,000,000 (20.61%), with no loan fields. Those inputs cannot satisfy the strict ratio and the required bank classification simultaneously. A documented `AXP.US` exception in config preserves bank treatment only when loan data is absent, to honor the explicit AXP requirement. With an available loan field, including zero, the ratio applies. This is an explicit exception, not a claim that the cached ratio exceeds 40%.
- C6: gaps truncate at the last gap, alongside share-count/currency discontinuities, then apply minYears. MA retains 2000–2025; the 1999 gap is a note. Renormalization refreshed 26 cached raw fundamentals; only AMC, LCID and RIVN remain insufficient.
- C7: the price-history stage switches to Yahoo on the shared EODHD budget threshold and always uses Yahoo for JP. Config contains the requested suffix map; HK codes are padded to four digits, US class dots become hyphens, and unknown exchanges fail explicitly. Yahoo requests use a browser User-Agent and 2 requests/second. Monthly labels use the exchange time zone, including daylight saving time. Stored files remain monthly tuples in `prices-history/{id}.json`.
- **Exchange mapping limitation:** EODHD’s live `exchanges-list` did not include Milan or New Zealand. `MI → .MI` and `NZ → .NZ` are compatibility mappings, not verified currently supported EODHD exchange codes. See [EODHD exchange API documentation](https://eodhd.com/financial-apis/exchanges-api-list-of-tickers-and-trading-hours).
- C8: installed the supplied computed trust file, preserving its method, date, agreement values and candidate list, with graded question versions added. Question-set version is 2. Reworded founder_led, commodity, government_dependence, scale, technology_change, regulatory_moat, acquisition_led, commodity_product and related_party are version 2 and untrusted until regraded. Founder ownership is checked across every supplied report section. The unchanged version-1 trusted questions are compensation_basis, revenue_model, capex_purpose, same_10y and brand. commodity_product remains in the original graded candidate list but is excluded from effective trust by its version mismatch. Cache hits recompute trust. No new grading is claimed.

## Live Yahoo verification

Five live HTTP 200 responses captured in `tests/fixtures/value/history/yahoo-{id}.json`, replayed in offline tests. Every fixture has 120 monthly closes from 2016-10 through 2026-09. Prices below are raw `quote.close`, not adjusted close.

| EODHD ID | Yahoo symbol | Currency | First close | Last close |
| --- | --- | --- | ---: | ---: |
| KO.US | KO | USD | 42.400001525878906 | 87.18000030517578 |
| NESN.SW | NESN.SW | CHF | 71.75 | 76.91999816894531 |
| 0700.HK | 0700.HK | HKD | 189.7180633544922 | 432 |
| 2330.TW | 2330.TW | TWD | 188.5 | 2475 |
| VALE3.SA | VALE3.SA | BRL | 22.079999923706055 | 71.16000366210938 |

## Live stage results

Calibration IDs resolved through current universe listings, notably `VALE.US → VALE3.SA` and `BHC.US → BHC.TO`. The five Japanese IDs are absent from the current universe and were not fetched by the stage; the existing recorded JP fixture covers that provider route.

```sh
VALUE_CORPUS_DIR="$HOME/value-corpus" npm run value -- price-history --only=KO.US,AAPL.US,AXP.US,MCO.US,VRSN.US,V.US,MA.US,CB.US,DPZ.US,POOL.US,CHTR.US,8058.JP,8031.JP,8001.JP,8002.JP,8053.JP,DAL.US,UAL.US,AAL.US,LUV.US,JBLU.US,GT.US,NCLH.US,FCX.US,VALE3.SA,CLF.US,AA.US,BHC.TO,PLUG.US,AMC.US,LCID.US,RIVN.US,CCL.US,M.US,OXY.US,CVX.US
VALUE_CORPUS_DIR="$HOME/value-corpus" npm run value -- renormalize --only=<same resolved IDs>
VALUE_CORPUS_DIR="$HOME/value-corpus" npm run value -- analyze --only=<same resolved IDs> --force
VALUE_CORPUS_DIR="$HOME/value-corpus" npm run value -- calibrate
```

Price history: **31 written**, exit 0. EODHD usage was 99,016, above the configured 99,000 stop, so these were Yahoo fallback requests. No EODHD history requests were needed. Ten calibration companies still have no fundamentals: history alone cannot make them analysable.

Forced analysis: **26 written, 0 unchanged, 0 failed**, exit 0. Calibration reused all 26 unchanged analyses and exited **1**.

Confusion counts: `{"truePositive":1,"trueNegative":12,"falsePositive":0,"falseNegative":7,"unclear":2,"missing":13,"exception":1}`.

Compared with round 2: true positives 0 → 1, true negatives unchanged at 12, false positives unchanged at 0, false negatives 1 → 7, unclear 8 → 2, missing 14 → 13. This is **not** an overall calibration pass: newly available price history exposes management failures, and the remaining misses are preserved. No publish or merge is performed.

### Calibration output

```text
> superinvestors@0.1.0 value
> tsx scripts/value/cli.ts calibrate

analyze: 0 written, 26 unchanged, 0 failed
┌─────────┬───────────┬───────────────┬────────────────┬───────────┬───────────┬────────────┬────────────┬────────────────────────────────────────────────────────┐
│ (index) │ id        │ expect        │ understandable │ moat      │ economics │ management │ accounting │ verdict                                                │
├─────────┼───────────┼───────────────┼────────────────┼───────────┼───────────┼────────────┼────────────┼────────────────────────────────────────────────────────┤
│ 0       │ 'KO.US'   │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'fail'     │ 'pass'     │ 'FAIL: management'                                     │
│ 1       │ 'AAPL.US' │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'fail'     │ 'pass'     │ 'FAIL: management'                                     │
│ 2       │ 'AXP.US'  │ 'quality'     │ 'pass'         │ 'pass'    │ 'unclear' │ 'fail'     │ 'pass'     │ 'FAIL: management'                                     │
│ 3       │ 'MCO.US'  │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'fail'     │ 'pass'     │ 'FAIL: management'                                     │
│ 4       │ 'VRSN.US' │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'unclear'                                              │
│ 5       │ 'V.US'    │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'unclear'                                              │
│ 6       │ 'MA.US'   │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'fail'     │ 'pass'     │ 'FAIL: management'                                     │
│ 7       │ 'CB.US'   │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'pass'     │ 'pass'     │ 'correct'                                              │
│ 8       │ 'DPZ.US'  │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 9       │ 'POOL.US' │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'fail'     │ 'pass'     │ 'FAIL: management'                                     │
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
│ 27      │ 'BHC.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'unclear' │ 'fail'     │ 'pass'     │ 'correct: understandable, moat, management'            │
│ 28      │ 'PLUG.US' │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'fail'     │ 'unclear'  │ 'correct: understandable, moat, economics, management' │
│ 29      │ 'AMC.US'  │ 'not_quality' │ 'unclear'      │ 'unclear' │ 'unclear' │ 'unclear'  │ 'unclear'  │ 'missing or insufficient data'                         │
│ 30      │ 'LCID.US' │ 'not_quality' │ 'unclear'      │ 'unclear' │ 'unclear' │ 'unclear'  │ 'unclear'  │ 'missing or insufficient data'                         │
│ 31      │ 'RIVN.US' │ 'not_quality' │ 'unclear'      │ 'unclear' │ 'unclear' │ 'unclear'  │ 'unclear'  │ 'missing or insufficient data'                         │
│ 32      │ 'CCL.US'  │ 'not_quality' │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 33      │ 'M.US'    │ 'not_quality' │ 'fail'         │ 'fail'    │ 'pass'    │ 'fail'     │ 'pass'     │ 'correct: understandable, moat, management'            │
│ 34      │ 'OXY.US'  │ 'exception'   │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 35      │ 'CVX.US'  │ 'exception'   │ 'fail'         │ 'fail'    │ 'pass'    │ 'pass'     │ 'pass'     │ 'exception'                                            │
└─────────┴───────────┴───────────────┴────────────────┴───────────┴───────────┴────────────┴────────────┴────────────────────────────────────────────────────────┘
Confusion counts: {"truePositive":1,"trueNegative":12,"falsePositive":0,"falseNegative":7,"unclear":2,"missing":13,"exception":1}
```

## Remaining quality misses

| ID | Test | Result | Reasons |
| --- | --- | --- | --- |
| KO.US | management | fail | potential debt-funded buybacks (informational); not enough data for the $1 retained earnings test; buybacks concentrated at lower earnings yields |
| AAPL.US | management | fail | potential debt-funded buybacks (informational); not enough data for the $1 retained earnings test; buybacks concentrated at lower earnings yields; not enough data for acquired goodwill and intangibles (proxy) and ROIC stability |
| AXP.US | economics | unclear | not enough data for incremental invested capital return |
| AXP.US | management | fail | not enough data for the $1 retained earnings test; buybacks concentrated at lower earnings yields |
| MCO.US | management | fail | not enough data for the $1 retained earnings test; buybacks concentrated at lower earnings yields; acquired goodwill and intangibles (proxy) alongside declining ROIC |
| VRSN.US | management | unclear | potential debt-funded buybacks (informational); not enough data for the $1 retained earnings test; not enough data for acquired goodwill and intangibles (proxy) and ROIC stability |
| V.US | management | unclear | potential debt-funded buybacks (informational); not enough data for the $1 retained earnings test; not enough data for acquired goodwill and intangibles (proxy) and ROIC stability |
| MA.US | management | fail | not enough data for the $1 retained earnings test; acquired goodwill and intangibles (proxy) alongside declining ROIC |
| POOL.US | management | fail | potential debt-funded buybacks (informational); not enough data for the $1 retained earnings test; acquired goodwill and intangibles (proxy) alongside declining ROIC |
| CHTR.US | management | fail | potential debt-funded buybacks (informational); not enough data for the $1 retained earnings test; buybacks concentrated at lower earnings yields; acquired goodwill and intangibles (proxy) alongside declining ROIC |

Yahoo’s requested 10-year window begins in October 2016. The 11-period retained-earnings test needs an earlier fiscal-year endpoint for most of this corpus, so `$1 retained earnings` remains unavailable. Buyback timing is now populated and exposes failures previously hidden by missing prices. These checks and thresholds were not relaxed to improve calibration.

AXP economics no longer fails working capital. It remains unclear because incremental invested-capital return is unavailable; its management check still fails. MA is scored, not insufficient, but its acquisition/declining-ROIC check remains a miss.

## Missing or insufficient data

- DPZ.US (resolved DPZ.US): no fundamentals/analysis in the corpus.
- 8058.JP (resolved 8058.JP): no fundamentals/analysis in the corpus.
- 8031.JP (resolved 8031.JP): no fundamentals/analysis in the corpus.
- 8001.JP (resolved 8001.JP): no fundamentals/analysis in the corpus.
- 8002.JP (resolved 8002.JP): no fundamentals/analysis in the corpus.
- 8053.JP (resolved 8053.JP): no fundamentals/analysis in the corpus.
- NCLH.US (resolved NCLH.US): no fundamentals/analysis in the corpus.
- VALE.US (resolved VALE3.SA): no fundamentals/analysis in the corpus.
- AMC.US: fewer than 7 annual periods
- LCID.US: fewer than 7 annual periods
- RIVN.US: fewer than 7 annual periods
- CCL.US (resolved CCL.US): no fundamentals/analysis in the corpus.
- OXY.US (resolved OXY.US): no fundamentals/analysis in the corpus.

## Verification

- `npx vitest run tests/unit`: **35 files, 609 tests passed**, exit 0.
- `npx tsc --noEmit`: **passed**, exit 0.
- `git diff --check`: **passed**.
- Offline tests cover ratio boundary/latest-year/loan aggregation, AXP missing-data exception, financial working-capital exemption, last-gap truncation/minYears/idempotence, Yahoo budget crossover and request mapping, five recorded live responses, per-question trust on cache hits, and founder evidence from a non-business section.
- No subagents; review performed inline. No deployment or publish.

## Key classification outcomes

| ID | Kind | Receivables / assets | Latest year | Status | Economics |
| --- | --- | ---: | ---: | --- | --- |
| V.US | operating | 7.3444% | 2025 | scored | pass |
| MA.US | operating | 8.5104% | 2025 | scored | pass |
| AXP.US | bank | 20.6134% | 2025 | scored | unclear |
| CB.US | insurer | 13.9072% | 2025 | scored | pass |
