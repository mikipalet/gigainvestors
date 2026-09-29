Recorded from the authenticated EDINET API v2 on 2026-09-29.

- `documents-2025-06-20.json`: complete type=2 day response requested in the brief.
- `documents-2025-06-18.json`: complete type=2 day containing Mitsubishi Corporation (80580 / E02529), annual report `S100VYM1`, filed 2025-06-18, period ended 2025-03-31.
- `mitsubishi-csv/`: all three original UTF-16LE TSV CSV files in the type=5 ZIP for `S100VYM1`, including the two audit files. Numeric values are absolute units, not the millions displayed in the report.

- `kyokuyo-2026.csv`: original main CSV from type=5 ZIP `S100YE8K`, Kyokuyo (1301), FY2026. Covers Japanese GAAP cash-flow depreciation and fixed-asset purchases.

- `fujifilm-summary.json`: recorded DEI and US GAAP summary rows from the main CSV in `S100YIBH` (4901, FY2026). Extracted using the CSV headers without altering numeric values.

Source: https://api.edinet-fsa.go.jp/api/v2/documents.json and `/documents/S100VYM1?type=5`. Credentials are intentionally absent. Tests read these recorded files and never call the provider.

The June 20 day does not contain Mitsubishi's annual filing. The extra June 18 response records the actual filing rather than changing a fixture date or inventing a match.

Current Japan quote and history stages use Yahoo (`8058.T`); the superseded Stooq adapter from the original brief is not used.
