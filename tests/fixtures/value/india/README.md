Recorded 2026-10-01 from NSE's public, keyless financial-results archive.
`*-annual.json`: https://www.nseindia.com/api/corporates-financial-results?index=equities&symbol=SYMBOL&period=Annual
`*-2024.xml.gz`: original response bytes from the first Consolidated entry's `xbrl` URL in each list.
`RELIANCE-2015.html.gz`: https://nsearchives.nseindia.com/archives/financial_results/financial_res_RELIANCE_127132.html

These are real provider responses, including the malformed annual XML context dates. Display rounding (crores) is not a numeric scale: INR facts are absolute rupees. The legacy HTML amounts are explicitly in lakhs. Historical `xbrl/-` URLs are placeholders, not documents. The annual lists end in 2024; later integrated filings use another feed.

Additional recorded regressions:

- Legacy TCS 2012, HDFCBANK 2015 and INFY 2017 HTML: `resultDetailedDataLink` in their annual lists.
- INFY 2022 WEB, HDFCBANK 2023 and TATACONSUM 2019 XML: matching consolidated annual-list `xbrl` links; missing contexts, banking start dates, and inconsistent profit attribution respectively.
- ETERNAL 2024 XML still identifies the verified historical symbol ZOMATO.
- ASIANPAINT 2016, TCS 2018 and BAJFINANCE 2019 detail JSON: `api/corporates-financial-results-data` using the annual-list `params`, `seqNumber`, `industry`, `oldNewFlag`, `reInd`, and `format` (the parser's `detailUrl` reproduces the URL).
- INFY 2026 and MARUTI 2025 integrated XML: `api/integrated-filing-results?index=equities&symbol=SYMBOL&page=1&size=100`, then the entry's `xbrl`. The MARUTI index row is also recorded: Q4 is unaudited, while the explicit annual column is audited.
- KOTAKBANK splits: `https://query1.finance.yahoo.com/v8/finance/chart/KOTAKBANK.NS?range=20y&interval=1mo&events=splits`; event dates differ from monthly bucket keys.
- BAJFINANCE actions: `https://www.nseindia.com/api/corporates-corporateActions?index=equities&symbol=BAJFINANCE&from_date=01-01-2012&to_date=01-10-2026`; a simultaneous 4:1 bonus and 2:1 split produce a factor of 10.

Gzip fixtures preserve source response bytes. Tests run offline and also exercise
scope restrictions, disk stopping, currency conflicts, and isolated corpus writes.
