These are synthetic Task 12 presentation fixtures, not recorded financial data or investment conclusions.

- KO.US passes all five quality tests, has a USD 36.78 middle value (unrounded 36.783687466148), evidence and a holder. Its stored price gives a 40% margin of safety.
- DAL.US fails exactly the moat test, with several poor ROIC years and gross-margin compression. Its USD 40 middle value and USD 50 price give a -25% margin.
- JPM.US uses ROE and the book-value valuation method. Operating economics is n/a; the bank is available through the US country index and its direct dossier URL.
- FX.US trades in USD while its unconverted valuation is EUR. Its index value is null, since a comparable trading-currency valuation is unavailable.
- SPARSE.US has insufficient data, no valuation and no price.
- The country index contains 40 scored companies and SPARSE. The default index contains the quality/near-miss shortlist required by the publishing contract.
- The 36 additional named company dossiers are illustrative clones with varied price/value ratios, clustered margins and independently failing gates. They support real navigation from the strip and table. They do not describe those companies' actual financials.
- Dossier filenames use the shared FNV-1a shard function. top.json prerenders KO, DAL, JPM and FX; other fixtures render on demand.

All value data requests in browser tests are intercepted from this directory. No live financial API calls are needed. KO has synthetic 2016–2025 series and an internally consistent owner-earnings bridge. The bank has a separate book-value bridge.

Round 3 adds synthetic annual value ranges, monthly closes, per-share series and
acquisition/impairment/share-change events for KO, DAL, JPM and OXY. KO uses a 25%
required discount, JPM 35%, DAL/OXY 50%. DAL/OXY include zero and negative per-share
earnings to exercise honest gaps on logarithmic plots. These histories and events
are illustrative, not company facts or reconstructed investment recommendations.
Index rows include the fixture's ROIC history and required discount; absent fields
on other dossiers continue to exercise compatibility with earlier publications.

Round 7 adds optional English names, company logo URLs and deterministic about sentences to every fixture company, plus meta.story and FY2016–2025 history snapshots. History prices, quality strings and subsequent returns are synthetic test data (not investment results). Logo responses are captured under ../logos and intercepted in Playwright for deterministic screenshots; production uses the published absolute URLs with a monogram fallback.
