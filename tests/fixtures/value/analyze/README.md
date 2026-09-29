# Analyze fixtures

`us-bond.json` was recorded on 2026-09-29 from EODHD
`/api/eod/US10Y.GBOND?order=d&limit=1&fmt=json` with an authenticated request.
The credential is omitted. EODHD returned 11,885 historical rows despite
`limit=1`; this fixture retains the first two rows verbatim. The most recent
close is 5.239 percent, converted to 0.05239 by the bond-yield helper.

Analyze tests also reuse the existing recorded KO and DAL fundamentals.
Jev is stubbed; no new live Jev calls were made. FX minor-unit cases use
explicit synthetic rates to verify known arithmetic, not recorded quotes.
