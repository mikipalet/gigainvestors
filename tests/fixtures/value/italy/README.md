# Recorded Italy fixtures

Recorded 2026-09-30. Tests make no network requests.

- `euronext.csv`: https://live.euronext.com/product_directory/data/stocks-all-places/download?mics=MTAA%2CEXGM&format=csv . Full 444-instrument MTAA/EXGM export. Parser excludes 38 warrants and three savings classes with an ordinary counterpart, retaining 403 equity instruments before issuer merging. Edison remains because only its savings class is listed.
- `gleif-eni.json`: https://api.gleif.org/api/v1/lei-records?filter[isin]=IT0003132476 . ISIN maps to ENI LEI `BUCRF72VH5RBN7X3VL35`.
- `eni-filings.json`: https://filings.xbrl.org/api/filings?filter[entity.identifier]=BUCRF72VH5RBN7X3VL35&page[size]=100&sort=period_end . Five filings, FY2021–2025; three-year comparative income statements extend observations to 2019.
- `eni-2025.json`: numeric facts from filing 24194.
- `enel.mi-latest.json`: numeric facts from filing 18316 (FY2024).
- `race.mi-latest.json`: numeric facts from Ferrari's FY2025 filing (LEI `549300RIVY5EX8RCON76`, Dutch filing country, Milan instrument).
- `monc.mi-latest.json`: numeric facts from Moncler's FY2025 filing (LEI `815600EBD7FB00525B20`).
- `isp.mi-2022.json`: numeric facts from Intesa Sanpaolo filing 6868 (FY2022).

The five financial JSON fixtures retain `documentInfo` and every fact with a unit, including original units, periods, entity, dimensions, decimal precision and duplicate values. Large prose/text-block facts were omitted; no financial values were edited. Filing records and their source `json_url` can be retrieved from `/api/filings/{id}` or the entity index. Source XBRL-JSON already applies inline-XBRL numeric transformations and scales; `decimals` is precision, not a multiplier.

- `yahoo-eni.json`: https://query1.finance.yahoo.com/v8/finance/chart/ENI.MI?range=10y&interval=1mo . Full chart response, including Milan timezone, current price and monthly closes.
- `yahoo-aapl-shares.json`: Yahoo fundamentals time series, `annualOrdinarySharesNumber,quarterlyOrdinarySharesNumber`, AAPL.
- `yahoo-zlab-cap.json`: Yahoo fundamentals time series, `trailingMarketCap,annualOrdinarySharesNumber,quarterlyOrdinarySharesNumber,quarterlyBasicAverageShares`, ZLAB. The ordinary count is ten times the ADS-basis EPS denominator; the reported cap prevents a tenfold estimate error. Verified against https://ir.zailaboratory.com/investor-resources/investor-faq/ .

Latest recorded RACE.MI filing ID: 23727.

Latest recorded MONC.MI filing ID: 24202.

`yahoo-bf.json` and `yahoo-illa.json`: Yahoo chart `range=10y&interval=1mo`, captured 2026-09-30. Recorded missing/zero current quote with valid monthly history.
