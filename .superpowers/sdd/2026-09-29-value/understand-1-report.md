NOT

# Understandable: sustained improvement, method 3.4.0

Not ready to ship: the numerical and unit gates pass, but the required broad browser gate remains red (20 of 38 states in the candidate run). It reports 12px controls, mobile drawer whitespace above its 15% limit, and one first-load script error/interaction timeout. The script error did not recur in three explicit Netflix rechecks. No publication was performed.

The fixed non-inferiority gate passes in every required group: CAGR and drawdown differences are exactly 0.00 percentage points because the redesign changes no historical BUY selections. This is a principle-based quality correction, not evidence of improved investment performance. In particular, worldwide later-period newly passing records include 14 negative-return observations and no additional top-decile winners. US 2016–2026 is contaminated and excluded from the decision.

The production method and explanatory surfaces are updated on `value-understand`. There has been no push or publication, no EODHD call, and no write to the live corpus or daily-runner lock. All export and browser work uses an independent local copy. The original live-check implementation is unchanged.

## Rule frozen before evaluating returns

Keep the existing operating-margin CV cutoff of 0.35. A higher CV may pass with a complete, consecutive window of the existing 7–10 annual observations, strictly positive finite operating margins, finite nonnegative net income in every year, and either:

1. Margins never decrease and the final margin exceeds the first; or
2. OLS slope is positive, R² ≥ 0.90, residual population standard deviation divided by mean margin ≤ 0.35, OLS slopes in both nonoverlapping chronological halves are positive, and the latest margin is at least the preceding margin. The first half has floor(n/2) observations.

The only new cutoff is R² ≥ 0.90, chosen from the principle that at least nine tenths of variation must be systematic improvement and at most one tenth noise. It was not fitted to returns. Missing years, missing values, operating losses, net losses, sign changes, and a latest decline disqualify the exception. The old low-CV path and all other thresholds—including the existing revenue-decline and loss-count checks—remain unchanged. The rule does not newly admit declining or loss-making histories. Financial-company tests, two-quarter LTM confirmation, raw CV, cyclical classification, valuation calculations and price discounts are unchanged. Existing publisher visibility rules expose some previously hidden values, detailed below.

The initial written rule at 22:38 UTC was strictly monotonic. At 22:45 UTC, before any candidate portfolio, hit-rate, winner or loser outcomes were opened, it was amended to cover the explicitly requested trend-consistent case. A preliminary current screen had found zero changes, and an incomplete numeric-only historical replay had run. Both the superseded draft and final rule are retained. This is disclosed rather than presented as an untouched first draft. The scope was also clarified before returns to require both worldwide and all-non-US interpretations of “all markets”. Returns were first opened at 22:56:43 UTC. The final candidate hash remained `d7e49409c26c3c99354e4e981b7a8360f0c8762da5b87314bbdc06002917d84c` through implementation; production parity is recorded in `outputs/implementation-parity.json`.

Pre-evaluation records: `research/understandable/protocol.json`, `README.md`, `freeze-final.json`, `freeze-evaluation.json`, and `docs/understandable-method-changelog.md`. The implementation changelog also appears in `lib/value/method-version.ts` (3.4.0).

## Measurement and coverage

The measurement comes from research-1 on `value-research` at `b1d578b`: its analyzer and corrected local-session portfolio function are retained in `research/understandable/research1-*.py`. The analyzer's root is parameterized; the adapter evaluates only this candidate, not the fair-value shadow track. Dividend-adjusted prices, each security's next local-session closing entry, quarterly liquidation/reentry, 10 bp per side, cash between entry dates and for missing allocations, and zero cash yield are retained. Portfolios are in USD; the original international single-security hit rates/ranks use local-currency total returns.

Training portfolio signals are 2005Q1–2015Q3, with outcomes ending by 2015-12-31; 2015Q4 is embargoed. Later signals are 2016Q1–2026Q2, ending 2026-09-30. Three-year training cohorts must mature by 2015-12-31; later hit rates use only mature cohorts. Hit rates are equal-weight means of quarterly pass/fail hit rates against that quarter's universe median. “Winner” means top decile within that scope and quarter. “Loser” means a negative three-year total return; below-median counts are also provided. Counts are company-quarter records, not independent companies.

The paired replay covers 2,058 identities and 99,691 stored rows: 93,961 paired, 158 unavailable snapshots, and 5,572 reporting/trading-currency mismatches. There are zero execution errors and 107 changed quality records over the full history, with no other quality gate or BUY changes. Missing snapshots retain the authoritative stored row in both variants. A separate currency-invariant numeric audit checked all 5,572 mismatches and found zero understandable changes and zero possible new buys; its artificial FX=1 was never used for investment returns or valuation. Extended cached international inputs are archived for reproduction.

This remains a restated-data research exercise, with the survivorship, source coverage, filing-date assumptions, current classifications, and non-point-in-time bond/FX limitations of research-1. Missing allocation counts are equal in both variants: paired US 0/0, Western non-US 2/0, all markets 37/348 (train/later); missing allocations remain cash. No market-data acquisition occurred.

## Portfolio CAGR and maximum drawdown

These are authoritative stored-baseline portfolios and their stored-anchored redesign. Both columns are shown even when identical. The stored US results exactly reproduce research-1. Western means its direct-listing venue set, excluding US-country companies; worldwide includes US, with all non-US separately required as a conservative scope check.

| Scope | Period | Baseline CAGR | Redesigned CAGR | Baseline max DD | Redesigned max DD |
|---|---|---:|---:|---:|---:|
| US | 2005–2015 | 6.53% | 6.53% | -57.08% | -57.08% |
| US | 2016–2026 **CONTAMINATED** | 13.54% | 13.54% | -41.91% | -41.91% |
| Western non-US | 2005–2015 | -7.14% | -7.14% | -74.95% | -74.95% |
| Western non-US | 2016–2026 | 15.12% | 15.12% | -50.79% | -50.79% |
| All markets | 2005–2015 | 2.20% | 2.20% | -63.84% | -63.84% |
| All markets | 2016–2026 | 12.16% | 12.16% | -32.54% | -32.54% |
| All non-US | 2005–2015 | -6.13% | -6.13% | -73.19% | -73.19% |
| All non-US | 2016–2026 | 9.86% | 9.86% | -30.54% | -30.54% |

The decision also uses same-input paired replays to isolate the rule. These differ from stored rows because of pre-existing replay/restatement drift; the drift is not attributed to the candidate. Paired baseline and redesign are again identical:

| Scope | Period | Paired baseline = redesign CAGR | Paired baseline = redesign max DD |
|---|---|---:|---:|
| US | train | 6.82% | -52.83% |
| US | later (contaminated) | 19.02% | -38.14% |
| Western non-US | train | -6.36% | -73.66% |
| Western non-US | later | 14.20% | -51.68% |
| All markets | train | 2.85% | -59.39% |
| All markets | later | 12.05% | -32.90% |
| All non-US | train | -5.85% | -71.82% |
| All non-US | later | 9.48% | -32.54% |

The fixed gate is CAGR ≥ baseline −0.25pp and drawdown no worse by >2pp. Every required paired gate passes at 0.00pp/0.00pp, and stored-anchored comparisons corroborate unchanged selections. No return threshold was changed after evaluation. All per-quarter paths and selection changes are saved in `outputs/portfolios.json`, `path-*.json.gz`, `historical-changes.csv`, and `decision-metrics.json`.

## Pass versus fail hit rates

| Scope | Period | Baseline pass / fail | Redesigned pass / fail | Pass / fail observations, baseline → redesigned |
|---|---|---:|---:|---|
| US | train | 49.611% / 50.793% | 49.594% / 50.827% | 5175 / 3132 → 5177 / 3130 |
| US | later (contaminated) | 48.194% / 53.433% | 48.174% / 53.469% | 8174 / 4279 → 8177 / 4276 |
| Western non-US | train | 51.603% / 46.343% | 51.603% / 46.343% | 3603 / 4713 → 3603 / 4713 |
| Western non-US | later | 49.769% / 50.261% | 49.734% / 50.306% | 12110 / 10072 → 12124 / 10058 |
| All markets | train | 50.642% / 47.458% | 50.652% / 47.447% | 9685 / 9063 → 9691 / 9057 |
| All markets | later | 49.741% / 50.373% | 49.703% / 50.423% | 25337 / 18339 → 25363 / 18313 |
| All non-US | train | 50.262% / 47.341% | 50.309% / 47.308% | 4510 / 5931 → 4514 / 5927 |
| All non-US | later | 49.770% / 50.253% | 49.724% / 50.309% | 17163 / 14060 → 17186 / 14037 |

Unclear observations are excluded from pass/fail comparisons and retained separately in `quality-summary.csv`; quarterly denominators are in `quality-by-quarter.csv`. These associations do not establish predictive improvement.

## Newly passing winners and losers

| Scope | Period | New pass records (companies) | With observed 3y return | Additional top-decile winners | Additional negative-return losers | Below median | New BUYs |
|---|---|---:|---:|---:|---:|---:|---:|
| US | train | 2 (1) | 2 | 0 | 0 | 2 | 0 |
| US | later (contaminated) | 3 (1) | 3 | 0 | 0 | 3 | 0 |
| Western non-US | train | 0 (0) | 0 | 0 | 0 | 0 | 0 |
| Western non-US | later | 14 (5) | 14 | 0 | 6 | 11 | 0 |
| All markets | train | 7 (2) | 6 | 2 | 0 | 2 | 0 |
| All markets | later | 29 (10) | 26 | 0 | 14 | 22 | 0 |
| All non-US | train | 5 (1) | 4 | 3 | 0 | 0 | 0 |
| All non-US | later | 26 (9) | 23 | 0 | 14 | 19 | 0 |

Worldwide top-decile understandable passes rise from 617 to 619 in training, and remain 1,766 later. US stays 363/578 (train/later); Western non-US stays 273/834; all non-US rises 281→284 in training and stays 1,211 later. Counts differ across scopes because top-decile cutoffs differ. Three later US records newly pass all five quality gates, but none passes the separate price check.

## Every changed current verdict

All nine rows below change understandable **fail → pass**. All qualify through the trend-consistent branch: R² ≥90%, positive trends in both halves, no latest decline, positive margins, no net loss years, complete consecutive history, and residual CV ≤0.35. Raw CV is unchanged and still controls the existing volatile/cyclical price treatment.

| ID | Company | Raw CV | Trend R² | Residual CV | First → latest margin | Overall quality effect |
|---|---|---:|---:|---:|---:|---|
| 601898.SHG | China Coal Energy Co Ltd | 0.370 | 92.97% | 0.098 | 2016: 5.40% → 2025: 17.80% | Still fails another quality gate |
| NFLX.US | Netflix Inc | 0.381 | 93.74% | 0.095 | 2017: 7.17% → 2026: 29.68% | Fail → pass; price still fails |
| KOG.OL | Kongsberg Gruppen ASA | 0.492 | 96.72% | 0.089 | 2016: 3.07% → 2025: 16.82% | Still fails another quality gate |
| FTNT.US | Fortinet Inc | 0.454 | 95.17% | 0.100 | 2016: 3.36% → 2025: 30.62% | Still fails another quality gate |
| LRN.US | Stride Inc | 0.634 | 94.34% | 0.151 | 2017: 1.48% → 2026: 17.90% | Still fails another quality gate |
| 0291.HK | China Resources Beer Holdings Co Ltd | 0.544 | 92.11% | 0.153 | 2016: 3.85% → 2025: 16.11% | Still fails another quality gate |
| 1209.HK | China Resources Mixc Lifestyle Serv | 0.447 | 95.61% | 0.094 | 2017: 6.18% → 2025: 28.01% | Fail → pass; price still fails |
| STRL.US | Sterling Infrastructure, Inc. | 0.547 | 94.98% | 0.123 | 2017: 2.73% → 2026: 18.06% | Still fails another quality gate |
| IDT.US | IDT Corporation | 0.785 | 93.64% | 0.198 | 2017: 0.37% → 2026: 9.43% | Still fails another quality gate |

NFLX and STRL include the existing confirmed LTM observation through June 2026. The full numeric series and per-company reasons are in `outputs/current-screen.json`; exact published field and verdict differences are in `publication-proof.json`. No changed ID belongs to the explicit verdict-freeze list.

## Local export and browser proof

The first ordinary `publish --out` on the independent copy preserved all current test verdicts; 73 dossiers differed only in methodVersion. The initial candidate export correctly refused six pipeline-26 analyses. That rejection is retained, not bypassed. The existing pipeline-27 change (25eca9a: rolling-LTM numeric evaluation) was replayed on those six companies' saved inputs for **both** comparison arms, with cached filing answers and judgement attachment. All five numeric tests were reevaluated; unrelated quality verdict changes were checked and none occurred. No pipeline version was stamped without this numeric migration, and the publisher guard remains unchanged.

The baseline/candidate comparison is therefore within the same current pipeline. Relative to the released snapshot, the required migration also changes some moat/economics numeric details on those six IDs, plus NFLX understandable LTM details; these are explicitly separated from the redesign, not hidden as understandable-only effects. `pipeline-refresh.json` identifies the six records, and `released-to-final.json` enumerates every released-to-final field change. The controlled baseline→candidate export changes nine understandable tests and the existing publisher presentation effects detailed below. This does not meet the initial expectation of literally understandable-only dossier fields; no such claim is made. Full frozen records and history/forward/price files remain identical. Both exports use the ordinary CLI, no force flag, cached return data, and a network-denying preload.

The corpus copy contains 527,319 independent files (20,923,791,011 logical bytes), excluding credentials, git state and locks. Source symlinks were dereferenced into ordinary destination files. The compressed manifest contains every copied source hash. This is a controlled persisted-input method comparison, not a fresh all-provider acquisition or wholesale nightly normalization run.

Verified: 3,899 dossiers before and after; 9 controlled dossier changes; 9 understandable verdict changes plus 2 newly displayed failing price checks; 0 frozen differences; 0 history/forward/price file changes. Method 3.4.0. Exact files/index effects are in `publication-proof.json`.

Additional current price-verdict disclosures (both explicitly listed; neither is a BUY):

| ID | Previous displayed price check | New displayed price check | Reason |
|---|---|---|---|
| STRL.US | Absent | Fail | Changing its analysis releases the byte-identical coverage baseline; the ordinary publisher exposes the already stored valuation. Margin of safety is −592.38%. |
| IDT.US | Absent | Fail | Same coverage-baseline release, exposing the already stored valuation. Margin of safety is −77.72%. |

LRN's stored valuation is also newly visible, but its price verdict stays fail. The underlying version, currency, discount rate, growth, bond yield, share count and per-share values match the archived original analyses exactly. These are visibility changes, not a valuation-model or fair-value-shadow change. Five companies (KOG, FTNT, 0291.HK, STRL, IDT) move from three to four quality passes, so the existing researchCoverage rule reveals cached judgement explanations on their other tests without changing those verdicts. The comparison also records method-version updates, ordinary price-story timestamps and memo changes. Every field is retained in the proof; an explicit expected-effect classifier rejects anything beyond these explained changes.

The numerical and verdict-enumeration parts of the fixed owner ship rule pass: all required CAGR/drawdown comparisons pass and all current verdict changes (nine quality changes, two newly visible failing price checks, two aggregate quality improvements, zero BUY changes) are enumerated. The complete delivery is nevertheless NOT ready because the required broad browser gate fails. The ordinary export also has explained presentation effects beyond the anticipated understandable-only fields. These are not silently waived. Shared UI repair and a clean browser gate are required before READY; no threshold retuning is indicated.

Released-to-final dossier count: 82. Nine substantive dossier IDs are listed above; the other 73 change only methodVersion. Full list of these 73 version-only IDs:

ABVX.US, AESI.US, AGI.US, AQN.US, AVBH.US, BB.US, BELFB.US, BH.US, BHC.US, BIO.US, BLCO.US, BMA.US, BMM.US, BTAI.US, BTE.US, BTG.US, BZ.US, CCU.US, CENTA.US, CGAU.US, CIGI.US, DCOM.US, DSGX.US, ECTXF.US, EFXT.US, EGO.US, EQX.US, ERO.US, EU.US, FSM.US, FWONK.US, GDS.US, GFI.US, GFL.US, GHM.US, GOOS.US, GTN.US, HEI-A.US, HKHGF.US, HVT.US, IAG.US, ITUB.US, KGEI.US, LOMA.US, MEOH.US, MINE.US, NAK.US, NG.US, NICE.US, NOG.US, NSRGY.US, NTPIF.US, NXE.US, PAAS.US, PAM.US, PDS.US, PROF.US, QXO.US, RBA.US, SA.US, STN.US, TAC.US, TAP.US, TEO.US, TFII.US, TFIN.US, TGS.US, TPHS.US, TV.US, UAA.US, WSO.US, ZG.US, ZH.US.

Baseline browser control (FTNT and KOG at both viewports): 8/16 states fail the same broad gate. Its exact issues and mobile raster whitespace percentages are retained in `outputs/browser-baseline-layout.json`. Baseline failures explain the existing UI debt but are not treated as a passed mandatory gate.

Browser semantic evidence: 11 completed checks (target: ten company/viewport checks plus the unchanged local live-check). Layout evidence: 38 states; 20 failing states. Five changed companies: NFLX.US, FTNT.US, STRL.US, IDT.US, KOG.OL, at 1728×970 and 390×844. The semantic audit checks actual rendered tile/drawer verdicts, rule explanations, series, numbers and thresholds against exported dossiers. Screenshots and layout results are retained locally and summarized in `outputs/browser-layout.json`.

Full unit suite: **237 files passed; 2,323 tests passed, one skipped**. Nineteen focused rule/display tests cover monotonic and noisy rising paths, plateaus, declines, sign changes, loss years, missing observations, gaps, duplicate years, unchanged gates and the frozen R² boundary. The original 13 synthetic measurement checks also passed. `verify.py` confirms original US baseline parity, unchanged other gates and the frozen candidate hash. Production sources for valuation, LTM confirmation, verdict freeze, live-check and runner were not changed.

## Controller commands

All commands run in `~/data/value-understand`; check `df -h / ~/data` before each phase and stop with a commit below 4 GiB. The research-1 input archive remains at `~/data/value-research`. Do not run a publish command without `--out`. No command below publishes or pushes.

```sh
cd ~/data/value-understand
df -h / ~/data
python3 research/understandable/prepare.py
VALUE_NO_EODHD=1 NODE_OPTIONS=--max-old-space-size=768 node --conditions=react-server --import tsx research/understandable/replay.ts
python3 research/understandable/evaluate.py
python3 research/understandable/verify.py
VALUE_NO_EODHD=1 node --conditions=react-server --import tsx research/understandable/audit-unpaired.ts
VALUE_NO_EODHD=1 node --conditions=react-server --import tsx research/understandable/current.ts
npm test -- --maxWorkers=2
python3 research/understandable/copy-corpus.py
export VALUE_CORPUS_DIR="$PWD/.audit/understandable/corpus"
export VALUE_NO_EODHD=1
export NODE_OPTIONS="--max-old-space-size=1536 --require=$PWD/research/understandable/no-network.cjs"
node --conditions=react-server --import tsx research/understandable/refresh-pipeline.ts
node --conditions=react-server --import tsx scripts/value/cli.ts publish --out="$PWD/.audit/understandable/baseline-store"
node --conditions=react-server --import tsx research/understandable/stage-current.ts
node --conditions=react-server --import tsx scripts/value/cli.ts publish --out="$PWD/.audit/understandable/redesigned-store"
python3 research/understandable/compare-proof.py
python3 research/understandable/released-diff.py
```

Use fresh output directories, or the ordinary CLI's `--overwrite` only on an existing local snapshot after preserving its receipt. Do not overwrite the live publish repository. The copy helper resumes existing files and is not a reset of already modified analyses; `refresh-pipeline.ts` restores the archived nine analyses before migration.

In a separate local terminal (omit the network-denying Node preload because Next must serve HTTP; the store is local):

```sh
VALUE_STORE_DIR="$PWD/.audit/understandable/redesigned-store" NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1536 node_modules/.bin/next dev --webpack --hostname 127.0.0.1 --port 3048
```

Then:

```sh
NODE_OPTIONS=--max-old-space-size=768 node --import tsx research/understandable/browser-proof.ts
QA_VIEWPORTS=1728x970,390x844 QA_BUTTONS='[data-testid="tile-understandable"] .tile-open' VALUE_MIN_FREE_GB=4 NODE_OPTIONS=--max-old-space-size=768 node scripts/value/release-gate.mjs http://127.0.0.1:3048 .audit/understandable/browser /s/nflx.us,/s/ftnt.us,/s/strl.us,/s/idt.us,/s/kog.ol
cp .audit/understandable/browser/report.json research/understandable/outputs/browser-layout.json
python3 research/understandable/report.py
git diff --check
```

Stop the local server after checking. No live rollout is performed by this task. The commit message is `value: understandable test stops punishing improving margins`; find the commit with `git log -1 --format='%h %s' value-understand`.
