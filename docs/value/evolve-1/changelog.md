# Method 3.7.0 changelog

Date: 2026-10-08

Primary-source review: `docs/value/evolve-1/principles.md`.

## Shipped

- Renamed the public `Understandable` method section and funnel label to `Earnings resilience` (the internal key stays `understandable`; company tiles already read “Predictable profits”). Buffett's latest circle-of-competence principle is investor-specific, not something a historical margin screen can establish. Source: Buffett, 1996 Berkshire letter, "knowing its boundaries, however, is vital."
- Replaced the operating-company management verdict's market-cap retained-dollar decision with per-share economic progress. Buffett later corrected his own retained-dollar test because market-price rerating can make a sound business appear to fail. Source: Berkshire Owner's Manual, principle 9, "we fail the test as I improperly formulated it."
- Renamed the management tile from “Value created per $1 kept” to “Capital allocation”, and its tile now charts the earnings per share that decide the verdict; the market-dollar window is no longer drawn as if it were the test.
- Kept the old retained-dollar calculation only as labelled context. Source: Buffett, 2018 Berkshire letter, repurchases can be above book but below intrinsic value, so book/market changes are not universal verdicts.

## Tested But Not Shipped

- A candidate that discounted intrinsic value at the supplied government bond yield without the existing 10% floor or 4-point spread was tested because Buffett said Berkshire thinks in terms of the long-term government rate and gets protection from price. Sources: 1996 annual meeting and 1997 annual meeting. The candidate breached the owner's veto: US training CAGR fell 2.78 percentage points and Western ex-US later CAGR fell 3.38 percentage points; combined also failed. The valuation discount and safety tiers remain disclosed model choices.

## Backtest (reported; owner veto only at >2pp CAGR or >5pp drawdown loss)

research-1/rules-5 replay, equal weight. Training 2005–2015; later 2016–2026. U.S. later is CONTAMINATED by prior inspection. CAGR / max drawdown in percent; hit = share of Buy rows with a positive three-year return, beat = share at or above that quarter's scope median.

| Panel | 3.6.0 baseline | Economic progress (shipped) | Government discount (not shipped) | Combined (not shipped) |
|---|---|---|---|---|
| U.S. train | 10.77 / −47.12; hit 87.7, beat 50.9 | 10.83 / −45.88; hit 91.3, beat 55.2 | 7.99 / −48.66 | 8.36 / −47.85 |
| U.S. later (contaminated) | 19.94 / −25.98; hit 88.7, beat 51.0 | 18.67 / −25.98; hit 88.5, beat 51.0 | 13.10 / −36.25 | 12.50 / −35.92 |
| Western ex-U.S. train | 1.65 / −52.69; hit 89.1, beat 58.8 | 0.61 / −54.24; hit 84.0, beat 52.3 | 7.30 / −53.87 | 6.79 / −52.38 |
| Western ex-U.S. later | 13.05 / −46.10; hit 77.2, beat 60.4 | 13.27 / −46.10; hit 78.0, beat 61.0 | 9.67 / −43.71 | 9.36 / −43.71 |
| All ex-U.S. train | 1.28 / −50.54; hit 88.6, beat 57.8 | 0.51 / −50.45; hit 83.0, beat 51.7 | 7.76 / −49.08 | 7.16 / −48.60 |
| All ex-U.S. later | 8.96 / −26.75; hit 74.7, beat 54.6 | 8.74 / −25.77; hit 74.9, beat 55.0 | 9.68 / −43.71 | 9.09 / −43.71 |

Economic progress stays inside the owner's limits in every required panel (worst: Western ex-U.S. train −1.04pp CAGR, −1.55pp drawdown). The government discount fails U.S. training (−2.78pp) and Western ex-U.S. later (−3.38pp); combined fails the same panels. Retrospective, survivorship-affected, present bond inputs; not a point-in-time or causal claim.
