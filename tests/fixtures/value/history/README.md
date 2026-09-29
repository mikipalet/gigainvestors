# Task 14 recorded fixtures

Recorded once on 2026-09-29. Tests replay these files and reject unexpected fetches.

- `eodhd-KO.json`: EODHD `/api/eod/KO.US?period=m&from=2016-09-29&fmt=json` (API token omitted). Full response; use `close`, not dividend-adjusted close.
- `yahoo-8058.json`: `https://query1.finance.yahoo.com/v8/finance/chart/8058.T?range=10y&interval=1mo`. Full response. Month boundaries use Tokyo time.
- `sec-tickers.json`: `https://www.sec.gov/files/company_tickers_exchange.json`, projected to the original SAP, KO and ASML rows, preserving fields and values. SAP CIK is 1000184.
- `sec-SAP-submissions.json`: `https://data.sec.gov/submissions/CIK0001000184.json`, projected to `filings.recent`. The routing test uses this recorded filing metadata with the existing TSM 20-F HTML fixture to exercise section handling; that HTML is not represented as SAP's prose.

SEC requests used the configured contact User-Agent (default GigaInvestors value hello@gigainvestors.com). No credentials are stored in fixtures.
