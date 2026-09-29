# Calibration round 2

STATUS: C1-C4 implemented and verified. The live calibration command completed, but its gate fails on the outcomes below. The requested price-history run was blocked by the existing daily EODHD budget limit (0 histories written).

Generated 2026-09-29T12:29:12.300019+00:00. Pipeline `3`; questions `1`. Merge commit: `2719649` (parents `835e246`, `6881db8`).

## Validation

- Merged Task 14 and calibration round 1: 484 tests passed, TypeScript passed.
- Final `npx vitest run tests/unit`: 32 files, 512 tests passed.
- Final `npx tsc --noEmit`: passed (exit 0).
- `git diff --check`: passed.
- Regression tests reproduced C1-C4 before implementation, including stale cached kind, tangible return thresholds and nonpositive equity, tangible book growth and reported-book fallback, both dilution windows and exactly 1%, all four ampersand IDs, invalid-ID skips through analyze/reports/jev-sample/publish, and malformed-ID path rejection.
- No thresholds were tuned beyond the rulings. A machine-epsilon comparison keeps exactly 1% share CAGR from failing because of floating-point rounding.

## Integration and rulings

- Preserved Task 14 required margin of safety/volatility, value history, events, per-share series, acquisition proxy, SEC fallback, and cheap publish validation, together with R1-R9.
- Price history now writes the requested `Array<[isoMonth, close]>`; refresh metadata lives in `prices-history/meta/{id}.json`. One shared reader serves analysis (year-end caps for the $1 test and buyback timing) and published charts. It also reads the original Task 14 cache envelope. One FX rate serves historical market caps, valuation, and value-history conversion.
- C1: `Credit Services` maps to `bank`. Analysis refreshes recognized financial classifications in cached enrichment, without a fundamentals download.
- C2: financial ROE is net income / tangible equity, with the same 12% median and 8% second-lowest thresholds. Nonpositive tangible equity and positive income count as unlimited; nonpositive income counts as a failed return year. Book valuation and its growth history use tangible book unless tangible equity is nonpositive, when reported book is used. Unlimited returns are retained in calculation, omitted from numeric display, and explained in reasons/assumptions.
- C3: dilution fails only when both five-year and ten-year diluted-share CAGR exceed 1%. Both metrics are retained; a missing second window never creates a failure.
- C4: shared ID validation accepts `[\w.&-]`, rejects unsafe path IDs, and logs/skips individual bad companies. Shared company loading covers the additional stages that consume it.

## Live commands and scope

All company writes were limited to the resolved calibration IDs. No universe/fundamentals refresh or threshold workaround was used. `VALE.US` resolves to `VALE3.SA`; `BHC.US` resolves to `BHC.TO`. The five Japanese calibration IDs are absent from the universe.

```sh
VALUE_CORPUS_DIR=$HOME/value-corpus npm run value -- price-history --only=KO.US,AAPL.US,AXP.US,MCO.US,VRSN.US,V.US,MA.US,CB.US,DPZ.US,POOL.US,CHTR.US,8058.JP,8031.JP,8001.JP,8002.JP,8053.JP,DAL.US,UAL.US,AAL.US,LUV.US,JBLU.US,GT.US,NCLH.US,FCX.US,VALE3.SA,CLF.US,AA.US,BHC.TO,PLUG.US,AMC.US,LCID.US,RIVN.US,CCL.US,M.US,OXY.US,CVX.US
VALUE_CORPUS_DIR=$HOME/value-corpus npm run value -- calibrate
```

Price-history output:

```text
> superinvestors@0.1.0 value
> tsx scripts/value/cli.ts price-history --only=KO.US,AAPL.US,AXP.US,MCO.US,VRSN.US,V.US,MA.US,CB.US,DPZ.US,POOL.US,CHTR.US,8058.JP,8031.JP,8001.JP,8002.JP,8053.JP,DAL.US,UAL.US,AAL.US,LUV.US,JBLU.US,GT.US,NCLH.US,FCX.US,VALE3.SA,CLF.US,AA.US,BHC.TO,PLUG.US,AMC.US,LCID.US,RIVN.US,CCL.US,M.US,OXY.US,CVX.US

daily EODHD budget reached, resume tomorrow
price-history: 0 written
```

A concurrent pipeline-1 analyzer overwrote DAL, UAL, AAL, AA and AMC after this run had written pipeline 3. Only those five IDs were refreshed with `analyze --only=DAL.US,UAL.US,AAL.US,AA.US,AMC.US` (5 written, 0 failed). Completed pipeline-3 outputs were captured while the run continued; the final consistent snapshot is preserved under `~/value-corpus/calibrations/calib-2/analysis/`.

## Calibrate table and confusion counts

```text
> superinvestors@0.1.0 value
> tsx scripts/value/cli.ts calibrate

analyze: 26 written, 0 unchanged, 0 failed
┌─────────┬───────────┬───────────────┬────────────────┬───────────┬───────────┬────────────┬────────────┬────────────────────────────────────────────────────────┐
│ (index) │ id        │ expect        │ understandable │ moat      │ economics │ management │ accounting │ verdict                                                │
├─────────┼───────────┼───────────────┼────────────────┼───────────┼───────────┼────────────┼────────────┼────────────────────────────────────────────────────────┤
│ 0       │ 'KO.US'   │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'unclear'                                              │
│ 1       │ 'AAPL.US' │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'unclear'                                              │
│ 2       │ 'AXP.US'  │ 'quality'     │ 'pass'         │ 'pass'    │ 'fail'    │ 'unclear'  │ 'pass'     │ 'FAIL: economics'                                      │
│ 3       │ 'MCO.US'  │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'unclear'                                              │
│ 4       │ 'VRSN.US' │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'unclear'                                              │
│ 5       │ 'V.US'    │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'unclear'                                              │
│ 6       │ 'MA.US'   │ 'quality'     │ 'unclear'      │ 'unclear' │ 'unclear' │ 'unclear'  │ 'unclear'  │ 'missing or insufficient data'                         │
│ 7       │ 'CB.US'   │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'unclear'                                              │
│ 8       │ 'DPZ.US'  │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 9       │ 'POOL.US' │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'unclear'                                              │
│ 10      │ 'CHTR.US' │ 'quality'     │ 'pass'         │ 'pass'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'unclear'                                              │
│ 11      │ '8058.JP' │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 12      │ '8031.JP' │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 13      │ '8001.JP' │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 14      │ '8002.JP' │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 15      │ '8053.JP' │ 'quality'     │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 16      │ 'DAL.US'  │ 'not_quality' │ 'fail'         │ 'pass'    │ 'fail'    │ 'unclear'  │ 'pass'     │ 'correct: understandable, economics'                   │
│ 17      │ 'UAL.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'unclear'  │ 'pass'     │ 'correct: understandable, moat, economics'             │
│ 18      │ 'AAL.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'unclear'  │ 'pass'     │ 'correct: understandable, moat, economics'             │
│ 19      │ 'LUV.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'unclear'  │ 'pass'     │ 'correct: understandable, moat, economics'             │
│ 20      │ 'JBLU.US' │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'unclear'  │ 'unclear'  │ 'correct: understandable, moat, economics'             │
│ 21      │ 'GT.US'   │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'unclear'  │ 'pass'     │ 'correct: understandable, moat, economics'             │
│ 22      │ 'NCLH.US' │ 'not_quality' │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 23      │ 'FCX.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'correct: understandable, moat'                        │
│ 24      │ 'VALE.US' │ 'not_quality' │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 25      │ 'CLF.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'fail'     │ 'unclear'  │ 'correct: understandable, moat, economics, management' │
│ 26      │ 'AA.US'   │ 'not_quality' │ 'fail'         │ 'fail'    │ 'pass'    │ 'fail'     │ 'pass'     │ 'correct: understandable, moat, management'            │
│ 27      │ 'BHC.US'  │ 'not_quality' │ 'fail'         │ 'fail'    │ 'unclear' │ 'unclear'  │ 'pass'     │ 'correct: understandable, moat'                        │
│ 28      │ 'PLUG.US' │ 'not_quality' │ 'fail'         │ 'fail'    │ 'fail'    │ 'fail'     │ 'unclear'  │ 'correct: understandable, moat, economics, management' │
│ 29      │ 'AMC.US'  │ 'not_quality' │ 'unclear'      │ 'unclear' │ 'unclear' │ 'unclear'  │ 'unclear'  │ 'missing or insufficient data'                         │
│ 30      │ 'LCID.US' │ 'not_quality' │ 'unclear'      │ 'unclear' │ 'unclear' │ 'unclear'  │ 'unclear'  │ 'missing or insufficient data'                         │
│ 31      │ 'RIVN.US' │ 'not_quality' │ 'unclear'      │ 'unclear' │ 'unclear' │ 'unclear'  │ 'unclear'  │ 'missing or insufficient data'                         │
│ 32      │ 'CCL.US'  │ 'not_quality' │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 33      │ 'M.US'    │ 'not_quality' │ 'fail'         │ 'fail'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'correct: understandable, moat'                        │
│ 34      │ 'OXY.US'  │ 'exception'   │                │           │           │            │            │ 'missing or insufficient data'                         │
│ 35      │ 'CVX.US'  │ 'exception'   │ 'fail'         │ 'fail'    │ 'pass'    │ 'unclear'  │ 'pass'     │ 'exception'                                            │
└─────────┴───────────┴───────────────┴────────────────┴───────────┴───────────┴────────────┴────────────┴────────────────────────────────────────────────────────┘
Confusion counts: {"truePositive":0,"trueNegative":12,"falsePositive":0,"falseNegative":1,"unclear":8,"missing":14,"exception":1}
```

Confusion counts: `{"truePositive": 0, "trueNegative": 12, "falsePositive": 0, "falseNegative": 1, "unclear": 8, "missing": 14, "exception": 1}`. Calibrate exit code: `1`.

## Key outcomes and remaining gaps

No calibration price-history files were present, and the budget stop prevented fetching them. Missing market-cap gains and buyback timing therefore remain unavailable under R1. The live price-history path could not be verified against EODHD in this run; recorded-fixture integration tests cover fetching, storage, analysis, and publish.

AXP is now a bank, but the existing economics implementation applies its working-capital test to all kinds. C1 specifies classification, so no additional financial-sector exemption was introduced. Its remaining economics failure is reported as-is.

| ID | Kind | Tangible ROE median / second-lowest | Share CAGR 5y / 10y | Valuation mid |
| --- | --- | --- | --- | --- |
| AXP.US | bank | 35.45% / 19.15% | -3.12% / -3.49% | 165.76 USD |
| CB.US | insurer | 25.55% / 13.23% | -2.64% / -1.19% | 346.29 USD |
| CHTR.US | operating | null / null | -9.47% / 2.43% | null: debt exceeds the value of owner earnings |
| V.US | bank | null / null | -2.55% / -2.26% | 78.45 USD |
| MA.US | bank | null / null | null / null | null: gap year 1999 |

### Missing and insufficient data

- MA.US: gap year 1999
- DPZ.US (resolved DPZ.US): no fundamentals/analysis in this corpus.
- 8058.JP (resolved 8058.JP): no fundamentals/analysis in this corpus.
- 8031.JP (resolved 8031.JP): no fundamentals/analysis in this corpus.
- 8001.JP (resolved 8001.JP): no fundamentals/analysis in this corpus.
- 8002.JP (resolved 8002.JP): no fundamentals/analysis in this corpus.
- 8053.JP (resolved 8053.JP): no fundamentals/analysis in this corpus.
- NCLH.US (resolved NCLH.US): no fundamentals/analysis in this corpus.
- VALE.US (resolved VALE3.SA): no fundamentals/analysis in this corpus.
- AMC.US: fewer than 7 annual periods
- LCID.US: fewer than 7 annual periods
- RIVN.US: fewer than 7 annual periods
- CCL.US (resolved CCL.US): no fundamentals/analysis in this corpus.
- OXY.US (resolved OXY.US): no fundamentals/analysis in this corpus.

### Remaining quality-company failures and unavailable checks

- **KO.US / management / unclear:** potential debt-funded buybacks (informational); not enough data for the $1 retained earnings test; not enough data for buyback timing
- **AAPL.US / management / unclear:** potential debt-funded buybacks (informational); not enough data for the $1 retained earnings test; not enough data for buyback timing
- **AXP.US / economics / fail:** not enough data for incremental invested capital return; working capital as a share of revenue rose more than 10pp and ends positive
- **AXP.US / management / unclear:** not enough data for the $1 retained earnings test; not enough data for buyback timing
- **MCO.US / management / unclear:** not enough data for the $1 retained earnings test; not enough data for buyback timing
- **VRSN.US / management / unclear:** potential debt-funded buybacks (informational); not enough data for the $1 retained earnings test; not enough data for buyback timing
- **V.US / management / unclear:** potential debt-funded buybacks (informational); not enough data for the $1 retained earnings test; not enough data for buyback timing
- **CB.US / management / unclear:** not enough data for the $1 retained earnings test; not enough data for buyback timing
- **POOL.US / management / unclear:** potential debt-funded buybacks (informational); not enough data for the $1 retained earnings test; not enough data for buyback timing
- **CHTR.US / management / unclear:** potential debt-funded buybacks (informational); not enough data for the $1 retained earnings test; not enough data for buyback timing

The saved combined results are reported without manual overrides. The existing Jev trust list remains unchanged. A subsequent price-history refresh and calibration run will be needed once the daily provider budget is available.
