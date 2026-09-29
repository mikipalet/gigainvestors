# Task 14 recorded fixtures

Recorded once on 2026-09-29. Tests replay these files and reject unexpected fetches.

- `eodhd-KO.json`: EODHD `/api/eod/KO.US?period=m&from=2016-09-29&fmt=json` (API token omitted). Full response; use `close`, not dividend-adjusted close.
- `yahoo-8058.json`: `https://query1.finance.yahoo.com/v8/finance/chart/8058.T?range=10y&interval=1mo`. Full response. Month boundaries use Tokyo time.
- `sec-tickers.json`: `https://www.sec.gov/files/company_tickers_exchange.json`, projected to the original SAP, KO and ASML rows, preserving fields and values. SAP CIK is 1000184.
- `sec-SAP-submissions.json`: `https://data.sec.gov/submissions/CIK0001000184.json`, projected to `filings.recent`. The routing test uses this recorded filing metadata with the existing TSM 20-F HTML fixture to exercise section handling; that HTML is not represented as SAP's prose.

SEC requests used the configured contact User-Agent (default GigaInvestors value hello@gigainvestors.com). No credentials are stored in fixtures.

# Calibration round 3 price-history fixtures

`yahoo-KO.US.json`, `yahoo-NESN.SW.json`, `yahoo-0700.HK.json`,
`yahoo-2330.TW.json`, and `yahoo-VALE3.SA.json` are unmodified Yahoo chart
responses captured on 2026-09-29 during calibration round 3.

Request: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=10y&interval=1mo`
with browser User-Agent `Mozilla/5.0`, sequential requests spaced at least 500 ms apart.
Symbols: `KO`, `NESN.SW`, `0700.HK`, `2330.TW`, `VALE3.SA`.
Each returned 120 monthly observations, October 2016 through September 2026.
Prices use `indicators.quote[0].close`, consistent with the existing history format.
Month labels use the exchange time zone, including historical daylight saving time.

The original `eodhd-KO.json` and `yahoo-8058.json` fixtures predate round 3.
No fixture test makes network requests.
