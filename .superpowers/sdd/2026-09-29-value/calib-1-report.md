# Calibration round 1

STATUS: COMPLETE. R1-R9 implemented, synthetic regressions and required checks pass, and the requested live analyze command completed with 21 written, 0 unchanged, 0 failed. Calibration outcomes below include remaining failures and missing data.

Generated 2026-09-29T12:08:52.216742+00:00 from the live results preserved at `/Users/miki/value-corpus/calibrations/calib-1/analysis/{id}.json`. Pipeline version `2`. Analysis timestamps span 2026-09-29T11:59:55.079Z to 2026-09-29T12:08:18.768Z.

## Validation

- `npx vitest run tests/unit`: PASS, 29 files, 415 tests.
- `npx tsc --noEmit`: PASS (exit 0).
- `git diff --check`: PASS.
- New regression tests were run against the old implementation and reproduced the defects before the fixes. Additional boundary tests cover 4pp exactly, 10pp exactly, zero valuation midpoint, missing fiscal-month prices/FX/shares, and partial accounting coverage.
- Synthetic price fixture exercises the corpus analyze stage, fiscal-end month selection, the $1 retained earnings test, GBX/GBP conversion, and cache invalidation when prices change or disappear. Unit tests make no live requests.
- A concurrent pipeline-1 analyze process overwrote AXP, CB and CVX during this run. Those three IDs were refreshed with pipeline 2 and all 21 pipeline-2 outputs were preserved under `~/value-corpus/calibrations/calib-1/analysis/`. The table uses this consistent snapshot; the shared `analysis/` directory remains subject to the other running process.
- First live attempt lacked `JEV_API_KEY` and failed for six companies. The completed rerun used the project-context 1Password item in process memory only.

```sh
cd /Users/miki/GitHub/superinvestors-wt/value-j-calib
VALUE_CORPUS_DIR=$HOME/value-corpus npm run value -- analyze --only=KO.US,AAPL.US,AXP.US,MCO.US,VRSN.US,V.US,CB.US,POOL.US,CHTR.US,DAL.US,UAL.US,AAL.US,LUV.US,JBLU.US,GT.US,FCX.US,CLF.US,AA.US,PLUG.US,M.US,CVX.US --force
```

## Reading the results

- Companies with no failed quality tests (6): KO.US, AAPL.US, MCO.US, VRSN.US, V.US, POOL.US.
- Companies with at least one failed quality test (15): AXP.US, CB.US, CHTR.US, DAL.US, UAL.US, AAL.US, LUV.US, JBLU.US, GT.US, FCX.US, CLF.US, AA.US, PLUG.US, M.US, CVX.US.
- Companies passing all five quality tests: 0.
- No requested company has `prices-history/{id}.json` in this corpus. All market-cap gains and buyback-timing checks are unavailable. Management requires three of four checks, so companies with passing dilution/acquisition checks remain unclear; an available failure still fails.
- Results are the saved combined results, not manually overridden. The Jev trust file contains no trusted questions; numeric and combined results are equal in this run.
- All rates below are ratios unless shown as percentages; NWC and gross-margin changes use percentage points. ROIC/ROE pairs are median / second-lowest. `null` ROIC with the unlimited-returns reason means positive NOPAT with nonpositive tangible capital, not missing data.

## Five quality results and key metrics

| ID | Understandable | Moat | Economics | Management | Accounting | Key metrics |
| --- | --- | --- | --- | --- | --- | --- |
| KO.US | PASS | PASS | PASS | UNCLEAR | PASS | declines/losses=4/0, CV=0.109; ROIC=31.88%/27.39%; GM drop=0.52pp; OE/NI=0.989, ROIIC=195.07%; NWC change/end=-5.80pp/4.90%; share CAGR=-0.18%, debt-buyback=1; DSRI=0.836, accruals=5.44%, SBC/OCF=3.77%, flags=0 |
| AAPL.US | PASS | PASS | PASS | UNCLEAR | PASS | declines/losses=3/0, CV=0.092; ROIC=70.39%/32.03%; GM drop=-6.11pp; OE/NI=0.936, ROIIC=563.88%; NWC change/end=3.82pp/-1.23%; share CAGR=-4.04%, debt-buyback=1; DSRI=1.035, accruals=0.15%, SBC/OCF=11.54%, flags=0 |
| AXP.US | PASS | PASS | FAIL | UNCLEAR | PASS | declines/losses=1/0, CV=0.177; ROIC=25.93%/13.12%; GM drop=1.10pp; OE/NI=1.029, ROIIC=null; NWC change/end=78.66pp/134.78%; share CAGR=-3.49%, debt-buyback=0; DSRI=0.963, accruals=-2.53%, SBC/OCF=2.99%, flags=0 |
| MCO.US | PASS | PASS | PASS | UNCLEAR | PASS | declines/losses=1/0, CV=0.070; ROIC=null/375.88%; GM drop=2.64pp; OE/NI=0.995, ROIIC=4482.83%; NWC change/end=-4.28pp/26.27%; share CAGR=-1.13%, debt-buyback=0; DSRI=0.990, accruals=-2.79%, SBC/OCF=8.00%, flags=0 |
| VRSN.US | PASS | PASS | PASS | UNCLEAR | PASS | declines/losses=0/0, CV=0.040; ROIC=null/null; GM drop=-1.23pp; OE/NI=0.948, ROIIC=551.35%; NWC change/end=1.03pp/-0.01%; share CAGR=-3.58%, debt-buyback=1; DSRI=1.796, accruals=-20.02%, SBC/OCF=6.39%, flags=1 |
| V.US | PASS | PASS | PASS | UNCLEAR | PASS | declines/losses=1/0, CV=0.063; ROIC=null/null; GM drop=0.72pp; OE/NI=0.974, ROIIC=413.07%; NWC change/end=-8.92pp/20.75%; share CAGR=-2.26%, debt-buyback=1; DSRI=0.937, accruals=-3.01%, SBC/OCF=3.89%, flags=0 |
| CB.US | PASS | FAIL | PASS | UNCLEAR | PASS | declines/losses=0/0, CV=0.239; ROE=9.47%/7.55%; GM drop=null; OE/NI=1.063, ROIIC=31.24%; NWC change/end=-14.73pp/8.83%; share CAGR=-1.19%, debt-buyback=0; DSRI=null, accruals=null, SBC/OCF=0.00%, flags=0 |
| POOL.US | PASS | PASS | PASS | UNCLEAR | PASS | declines/losses=3/0, CV=0.184; ROIC=38.28%/31.98%; GM drop=-1.14pp; OE/NI=0.978, ROIIC=35.78%; NWC change/end=2.80pp/21.23%; share CAGR=-1.71%, debt-buyback=1; DSRI=1.109, accruals=1.12%, SBC/OCF=6.21%, flags=0 |
| CHTR.US | PASS | PASS | PASS | FAIL | PASS | declines/losses=1/0, CV=0.283; ROIC=176.74%/80.86%; GM drop=-4.65pp; OE/NI=0.849, ROIIC=34.33%; NWC change/end=1.61pp/4.19%; share CAGR=2.43%, debt-buyback=1; DSRI=1.195, accruals=-7.19%, SBC/OCF=4.19%, flags=0 |
| DAL.US | FAIL | PASS | FAIL | UNCLEAR | PASS | declines/losses=2/1, CV=9.355; ROIC=23.63%/11.54%; GM drop=-25.04pp; OE/NI=1.447, ROIIC=-1.77%; NWC change/end=-1.08pp/-0.41%; share CAGR=-1.78%, debt-buyback=1; DSRI=0.860, accruals=-4.11%, SBC/OCF=0.00%, flags=0 |
| UAL.US | FAIL | FAIL | FAIL | UNCLEAR | PASS | declines/losses=2/2, CV=6.427; ROIC=13.93%/-4.33%; GM drop=-30.26pp; OE/NI=1.983, ROIIC=-8.39%; NWC change/end=-0.87pp/-0.85%; share CAGR=-1.15%, debt-buyback=1; DSRI=1.068, accruals=-6.64%, SBC/OCF=0.00%, flags=0 |
| AAL.US | FAIL | FAIL | FAIL | UNCLEAR | PASS | declines/losses=2/2, CV=null; ROIC=9.04%/-4.12%; GM drop=-31.05pp; OE/NI=null, ROIIC=-36.68%; NWC change/end=0.78pp/3.89%; share CAGR=0.27%, debt-buyback=1; DSRI=1.026, accruals=-4.84%, SBC/OCF=1.77%, flags=0 |
| LUV.US | FAIL | FAIL | FAIL | UNCLEAR | PASS | declines/losses=1/1, CV=4.380; ROIC=16.41%/2.36%; GM drop=-13.29pp; OE/NI=2.135, ROIIC=-25.70%; NWC change/end=2.11pp/5.90%; share CAGR=-2.28%, debt-buyback=1; DSRI=1.014, accruals=-4.82%, SBC/OCF=0.00%, flags=0 |
| JBLU.US | FAIL | FAIL | FAIL | UNCLEAR | UNCLEAR | declines/losses=3/6, CV=null; ROIC=-1.81%/-6.95%; GM drop=-17.17pp; OE/NI=null, ROIIC=-17.77%; NWC change/end=-0.29pp/-1.42%; share CAGR=0.74%, debt-buyback=1; DSRI=1.095, accruals=-2.73%, SBC/OCF=null, flags=0 |
| GT.US | FAIL | FAIL | FAIL | UNCLEAR | PASS | declines/losses=6/4, CV=0.622; ROIC=6.00%/5.15%; GM drop=1.22pp; OE/NI=null, ROIIC=-92.07%; NWC change/end=-1.90pp/10.65%; share CAGR=0.75%, debt-buyback=0; DSRI=0.983, accruals=-13.82%, SBC/OCF=3.52%, flags=0 |
| FCX.US | FAIL | FAIL | PASS | FAIL | PASS | declines/losses=4/2, CV=0.463; ROIC=17.55%/3.39%; GM drop=-17.49pp; OE/NI=0.920, ROIIC=29.27%; NWC change/end=-1.24pp/22.54%; share CAGR=2.06%, debt-buyback=0; DSRI=1.455, accruals=-5.86%, SBC/OCF=2.16%, flags=0 |
| CLF.US | FAIL | FAIL | FAIL | FAIL | UNCLEAR | declines/losses=4/3, CV=1.195; ROIC=16.39%/-5.22%; GM drop=10.50pp; OE/NI=2.646, ROIIC=-35.81%; NWC change/end=7.12pp/22.21%; share CAGR=12.37%, debt-buyback=1; DSRI=0.943, accruals=-5.08%, SBC/OCF=null, flags=0 |
| AA.US | FAIL | FAIL | PASS | FAIL | PASS | declines/losses=4/5, CV=0.582; ROIC=14.02%/5.11%; GM drop=7.56pp; OE/NI=3.406, ROIIC=null; NWC change/end=5.35pp/11.83%; share CAGR=3.74%, debt-buyback=1; DSRI=0.949, accruals=-0.23%, SBC/OCF=3.46%, flags=0 |
| PLUG.US | FAIL | FAIL | FAIL | FAIL | UNCLEAR | declines/losses=3/10, CV=null; ROIC=-29.14%/-57.73%; GM drop=null; OE/NI=null, ROIIC=-22.01%; NWC change/end=84.65pp/105.76%; share CAGR=20.73%, debt-buyback=1; DSRI=0.846, accruals=-42.23%, SBC/OCF=null, flags=0 |
| M.US | FAIL | FAIL | PASS | UNCLEAR | PASS | declines/losses=7/1, CV=3.854; ROIC=12.98%/3.90%; GM drop=1.21pp; OE/NI=1.250, ROIIC=null; NWC change/end=-6.14pp/6.65%; share CAGR=-1.32%, debt-buyback=0; DSRI=1.996, accruals=-4.85%, SBC/OCF=4.13%, flags=1 |
| CVX.US | FAIL | FAIL | PASS | UNCLEAR | PASS | declines/losses=6/2, CV=1.246; ROIC=5.43%/-2.46%; GM drop=-7.68pp; OE/NI=1.359, ROIIC=null; NWC change/end=-0.43pp/4.24%; share CAGR=0.64%, debt-buyback=1; DSRI=0.916, accruals=-6.68%, SBC/OCF=0.00%, flags=0 |

## Remaining failures and evidence

- **AXP.US / economics:** working capital as a share of revenue rose more than 10pp and ends positive.
- **CB.US / moat:** ROE median below threshold; ROE worst years below threshold (more than 1 bad year allowed).
- **CHTR.US / management:** diluted share growth above threshold.
- **DAL.US / understandable:** operating margin variation exceeds 0.35.
- **DAL.US / economics:** incremental invested capital return below threshold.
- **UAL.US / understandable:** operating margin variation exceeds 0.35.
- **UAL.US / moat:** ROIC median below threshold; ROIC worst years below threshold (more than 1 bad year allowed).
- **UAL.US / economics:** incremental invested capital return below threshold.
- **AAL.US / understandable:** negative average operating margin.
- **AAL.US / moat:** ROIC median below threshold; ROIC worst years below threshold (more than 1 bad year allowed).
- **AAL.US / economics:** incremental invested capital return below threshold.
- **LUV.US / understandable:** operating margin variation exceeds 0.35.
- **LUV.US / moat:** ROIC worst years below threshold (more than 1 bad year allowed).
- **LUV.US / economics:** incremental invested capital return below threshold.
- **JBLU.US / understandable:** more than 2 net loss years; negative average operating margin.
- **JBLU.US / moat:** ROIC median below threshold; ROIC worst years below threshold (more than 1 bad year allowed).
- **JBLU.US / economics:** incremental invested capital return below threshold.
- **GT.US / understandable:** 6 revenue declines in the last 10 years; more than 5 revenue declines in ten years; more than 2 net loss years; operating margin variation exceeds 0.35.
- **GT.US / moat:** ROIC median below threshold; ROIC worst years below threshold (more than 1 bad year allowed).
- **GT.US / economics:** incremental invested capital return below threshold.
- **FCX.US / understandable:** operating margin variation exceeds 0.35.
- **FCX.US / moat:** ROIC worst years below threshold (more than 1 bad year allowed).
- **FCX.US / management:** diluted share growth above threshold.
- **CLF.US / understandable:** more than 2 net loss years; operating margin variation exceeds 0.35.
- **CLF.US / moat:** ROIC worst years below threshold (more than 1 bad year allowed); FY2023 gross margin fell 10.5pp versus the FY2019/FY2020 mean (limit 4pp).
- **CLF.US / economics:** incremental invested capital return below threshold.
- **CLF.US / management:** diluted share growth above threshold.
- **AA.US / understandable:** more than 2 net loss years; operating margin variation exceeds 0.35.
- **AA.US / moat:** ROIC median below threshold; ROIC worst years below threshold (more than 1 bad year allowed); FY2023 gross margin fell 7.6pp versus the FY2019/FY2020 mean (limit 4pp).
- **AA.US / management:** diluted share growth above threshold.
- **PLUG.US / understandable:** more than 2 net loss years; negative average operating margin.
- **PLUG.US / moat:** ROIC median below threshold; ROIC worst years below threshold (more than 1 bad year allowed).
- **PLUG.US / economics:** incremental invested capital return below threshold; working capital as a share of revenue rose more than 10pp and ends positive.
- **PLUG.US / management:** diluted share growth above threshold.
- **M.US / understandable:** 7 revenue declines in the last 10 years; more than 5 revenue declines in ten years; operating margin variation exceeds 0.35.
- **M.US / moat:** ROIC median below threshold; ROIC worst years below threshold (more than 1 bad year allowed).
- **CVX.US / understandable:** 6 revenue declines in the last 10 years; more than 5 revenue declines in ten years; operating margin variation exceeds 0.35.
- **CVX.US / moat:** ROIC median below threshold; ROIC worst years below threshold (more than 1 bad year allowed).

## Quality-name changes and caveats

- KO: four revenue declines remain visible as information; losses are zero and operating-margin CV is 0.109. Understandable now passes.
- AAPL, POOL and VRSN: the small working-capital increases no longer fail economics. Their NWC end-average changes are +3.82pp, +2.80pp and +1.03pp; AAPL and VRSN end negative.
- V and VRSN: moat passes; ROIC median and second-lowest display as null with `tangible capital is negative: returns effectively unlimited`. MCO also has an unlimited median, with a finite second-lowest return.
- MCO: FY2023 gross margin is 2.64pp below the mean of FY2019 and FY2020, below the 4pp limit. Moat now passes.
- VRSN: latest-year DSRI is 1.796, a single accounting red flag. Accounting passes with that flag shown; missing restructuring history remains explicitly reported.
- AXP still fails economics: NWC/revenue rose 78.66pp and ends at 134.78%. The corpus classifies AXP as `operating`, so it receives ROIC and operating-company accounting checks as well as the generic working-capital test. This pre-existing classification was not changed; no financial-sector exception was added.
- CB still fails moat: median ROE 9.47% versus 12%, and second-lowest ROE 7.55% versus 8%.
- CHTR still fails management: diluted-share CAGR 2.43% versus 1%. Debt-funded buybacks are informational. Valuation is null with `debt exceeds the value of owner earnings`.
- No thresholds were tuned beyond R1-R9. Existing negative-average-operating-margin failure, financial ROE thresholds, and financial accruals/DSRI exclusions are preserved.

## Data gaps and single flags

- **KO.US:** accounting: not enough data for five years of restructuring charges.
- **AAPL.US:** accounting: not enough data for five years of restructuring charges.
- **AXP.US:** economics: not enough data for incremental invested capital return | accounting: not enough data for five years of restructuring charges.
- **MCO.US:** accounting: not enough data for five years of restructuring charges.
- **VRSN.US:** accounting: not enough data for five years of restructuring charges | accounting single flag: latest-year receivables to sales index (DSRI) exceeds 1.465.
- **V.US:** accounting: not enough data for five years of restructuring charges.
- **CB.US:** accounting: not enough data for five years of restructuring charges.
- **POOL.US:** accounting: not enough data for five years of restructuring charges.
- **CHTR.US:** accounting: not enough data for five years of restructuring charges.
- **DAL.US:** accounting: not enough data for five years of restructuring charges.
- **UAL.US:** accounting: not enough data for five years of restructuring charges.
- **AAL.US:** understandable: not enough data for operating margin variation | economics: not enough data for owner earnings cash conversion | accounting: not enough data for five years of restructuring charges.
- **LUV.US:** accounting: not enough data for five years of restructuring charges.
- **JBLU.US:** understandable: not enough data for operating margin variation | economics: not enough data for owner earnings cash conversion | accounting: not enough data for five years of restructuring charges; not enough data for stock compensation to operating cash flow.
- **GT.US:** economics: not enough data for owner earnings cash conversion | accounting: not enough data for five years of restructuring charges.
- **FCX.US:** accounting: not enough data for five years of restructuring charges.
- **CLF.US:** accounting: not enough data for five years of restructuring charges; not enough data for stock compensation to operating cash flow.
- **AA.US:** economics: not enough data for incremental invested capital return | accounting: not enough data for five years of restructuring charges.
- **PLUG.US:** understandable: not enough data for operating margin variation | moat: not enough data for FY2019, FY2020 and FY2023 gross margins | economics: not enough data for owner earnings cash conversion | accounting: not enough data for five years of restructuring charges; not enough data for stock compensation to operating cash flow.
- **M.US:** economics: not enough data for incremental invested capital return | accounting: not enough data for five years of restructuring charges | accounting single flag: latest-year receivables to sales index (DSRI) exceeds 1.465.
- **CVX.US:** economics: not enough data for incremental invested capital return | accounting: not enough data for five years of restructuring charges.

## Valuation

| ID | Mid per share (reporting currency) | Null reason |
| --- | --- | --- |
| KO.US | 23.23 USD |  |
| AAPL.US | 119.82 USD |  |
| AXP.US | 311.63 USD |  |
| MCO.US | 221.45 USD |  |
| VRSN.US | 122.95 USD |  |
| V.US | 189.15 USD |  |
| CB.US | 161.50 USD |  |
| POOL.US | 204.64 USD |  |
| CHTR.US | null | debt exceeds the value of owner earnings |
| DAL.US | 50.11 USD |  |
| UAL.US | 32.45 USD |  |
| AAL.US | null | debt exceeds the value of owner earnings |
| LUV.US | 31.07 USD |  |
| JBLU.US | null | owner earnings not positive |
| GT.US | null | owner earnings not positive |
| FCX.US | null | debt exceeds the value of owner earnings |
| CLF.US | null | debt exceeds the value of owner earnings |
| AA.US | 4.71 USD |  |
| PLUG.US | null | owner earnings not positive |
| M.US | 17.59 USD |  |
| CVX.US | 118.58 USD |  |

Negative or zero owner-earnings midpoints are omitted. Positive-midpoint ranges retain the existing low/high scenario calculation.
