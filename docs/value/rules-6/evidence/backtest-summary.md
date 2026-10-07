Method 3.6.0 — owner correctness override, 7 October 2026

Replay coverage: 2,058 identities and 99,691 company-quarter rows; 93,961 paired, 5,572 reporting/trading-currency mismatches excluded and 158 snapshots unavailable.

Annual-return changes below are percentage points against the same baseline. Training is 2005–2015; later is 2016–2026. U.S. later is CONTAMINATED by prior inspection and is not an untouched holdout. The legacy return gate rejects SBC/current-scale/combined; accounting correctness still ships under the explicit owner instruction.

| Correction | U.S. train | U.S. later (contaminated) | Western ex-U.S. train | Western ex-U.S. later | All ex-U.S. train | All ex-U.S. later |
|---|---:|---:|---:|---:|---:|---:|
| SBC charged once | +0.218 | -1.280 | -0.714 | -0.399 | -0.613 | -0.295 |
| Current revenue × median margin | +3.682 | +1.752 | +2.622 | -1.650 | +2.302 | +0.025 |
| TTM maintenance estimator | +0.188 | -0.014 | +0.361 | -0.083 | +0.328 | +0.005 |
| Same-period parent allocation | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 |
| Missing-NI OCF fallback / maintenance | +0.000 | +0.000 | +0.000 | -0.220 | +0.000 | +0.036 |
| Flow corrections together | +0.000 | +0.000 | +0.000 | -0.220 | +0.000 | +0.036 |
| Combined shipping accounting | +2.791 | +0.943 | +3.306 | -2.072 | +3.079 | +0.089 |

The complete decision-metrics.json and backtest-fixes.csv retain drawdown changes, missing-return allocations, new-buy cohorts and legacy gate results. Positive drawdown delta means a less severe worst drawdown. This is a retrospective diagnostic with survivorship, restatement, present bond inputs and incomplete return/FX coverage; no causal or point-in-time performance claim.

Raw-provider TTM flow clearing has no separate historical replay effect: quarterly-snapshot replay already constructs its own TTM flows and does not call raw trailingInputs. Its regression fixtures demonstrate the cleared annual judgement/lease/consolidated-profit leakage. FX-refresh, canonical-identity and cached-share publication fixes are publication-layer corrections outside this historical engine; historical return impact is not measured, and is not presented as zero. Their complete current-release impact is in the release audit and proposal manifest.

Ambiguous maintenance working-capital reinvestment, issuer-specific lease/ROU overlap and cash-attributable after-tax interest remain disclosed limitations. No invented adjustment is included in the replay or release.
