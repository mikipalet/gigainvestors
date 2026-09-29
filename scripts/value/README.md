# Universe identity stages

Run the identity stages in this order before reports or analysis:

```sh
npm run value -- universe
npm run value -- fundamentals
npm run value -- dedupe
npm run value -- check-universe
```

All stages use `VALUE_CORPUS_DIR` (default `~/value-corpus`). Universe reuses same-day raw symbol lists and screener pages unless `--force` is set. Fundamentals respects the daily API budget. Dedupe reads existing normalized fundamentals without network calls and operates on the whole universe.

Universe merges share classes, uses screener average volume to choose a class, and falls back to code order, with Nordic B and Brazilian ON preferences. Brazil always prefers ON (3) when present; PN (4) remains eligible. It drops fractional lots and foreign non-US listings with an available home, preserving offshore operating listings and ASX CDI aliases. Receipt names/types/exchange metadata and verified receipt-to-underlying ISIN mappings establish ADR identity.

For unlabelled US listings, dedupe requires equal normalized names, equal reporting currency, and revenue within 2% of the home company's revenue in the latest common fiscal year. Missing/zero revenue is not evidence; conflicting latest data does not fall back to an older year. Multiple matching homes remain separate. The tolerance lives in `lib/value/config.ts`.

Dedupe rewrites `universe.jsonl`, retaining the home company's identity, price currency, cap and listing aliases. `dedupe.jsonl` records source/target IDs, fiscal year, currency, both revenue values and their relative difference. Rerunning preserves the audit and does not repeat merges. Rerun dedupe after every universe rebuild, since universe rebuilds from raw listing data.

Check-universe requires unique normalized names in the top 1,000 by market cap and checks the known primary, ADR, CDI, fractional-lot and venue regressions.

Offline normalization repairs use `npm run value -- renormalize` for cached EODHD
raw records and `npm run value -- renormalize-edinet` for cached EDINET issuer
years. EODHD per-share history is already split-adjusted at source. Only EDINET
can infer a split: a near-integer share change must also have a consecutive-month
inverse price move within 20% of the split factor in that fiscal period, read
from `prices-history/{id}.json`. Missing corroboration keeps the jump/truncation
rules. Both rebuilds preserve `fetchedAt` and make no API calls. Reanalyze all
changed IDs before publishing; explicit `analyze --only` IDs also accept cached
company records outside the current universe, without adding them to publication.
