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

EDINET basic EPS supplies the share denominator; filing-date issued and treasury
shares cross-check it. Confirmed post-year splits/consolidations correct a stale
EPS basis, without multiplying already-restated EPS again. Unreconciled JP shares
produce an unverified price flag and cannot publish `b: true`.

EDINET capex includes software/intangible purchases. Reported repayments of
capitalized leases are charged in owner earnings, with those lease liabilities
excluded from net debt. For material minorities (>10% of consolidated equity),
consolidated cash-flow adjustments and net cash use parent NI / total NI; reported
parent NI is already allocated.

`npm run value -- japan-interim` fetches docType 160 CSVs sequentially through the
EDINET limiter, using cached filing-day inventories, for annuals older than six
months. TTM is annual + current H1 - comparative H1 with matching fiscal dates;
missing required flows stay unavailable. `renormalize-edinet` reuses these cached
H1 files offline. H1 observations never enter the annual history.

### Round 7 enrichment and fiscal history

Run these independently of the paid/Japan pipeline:

```sh
VALUE_CORPUS_DIR="$HOME/value-corpus" npx tsx scripts/value/cli.ts enrich
VALUE_CORPUS_DIR="$HOME/value-corpus" npx tsx scripts/value/cli.ts logos
VALUE_CORPUS_DIR="$HOME/value-corpus" npx tsx scripts/value/cli.ts history-snapshots
```

All three stages use atomic **create-only** writes under `enrichment-v7/` and
`history-v7/`. They never change universe, companies, fundamentals, analysis,
reports, prices, Jev, or publish-repo files. They are safe beside `japan`.
`enrich` caches EDINET English filer names and Yahoo quote longName (2 requests/s),
verifies EODHD PNG logos (10 requests/s, transient HTTP retries), falls back to
DuckDuckGo website favicons, and derives short descriptions deterministically.
`logos` retries vendor failures in separate immutable overrides. Missing vendor
logos remain eligible for a later retry. No LLM is called by these stages.

Publication overlays cached `nameEn`, `nameLocal`, `logo` and `about`, puts `lg` on
index rows, preserves local-name search aliases, and emits `meta.story`. Existing
legacy companies remain readable without caches. A missing English name displays
the listing ID; it does not invent a translation. Null logo/about means no usable
source was available. EDINET's [official API guide](https://disclosure2dl.edinet-fsa.go.jp/guide/static/disclosure/download/ESE140206.pdf)
documents the code-list download used here.

Each `history-snapshots` run creates `history-v7/<timestamp>-<id>/`; `index.json` is
the completion marker. Publication reads the newest complete **universe** run.
`--only`/`--limit` runs remain inspection caches and cannot replace full history.
Annual files publish as `history/{Y}.json`, with rows `[id,t5,pm,b,r]`. `pm` is
price/mid-value; `b` uses that year's five numeric tests, volatility-based margin,
and the same verification rules as the current buy line. `r` is a cumulative
price-change ratio (`2` means +200%), not an annualized or dividend-inclusive return.
The index includes years and per-year medians (`medianReturnAtBuy`,
`medianReturnQuality`, `medianReturnAll`), with arithmetic means retained in
`avgReturn*` as secondary fields. Cohort totals are `atBuy`, `qualityPasses`, and
`analysed`; `returnCount*` gives each finite-return denominator. `hitRate*` is the
share of those finite returns strictly above the **unrounded whole-universe
median for that year**, with ties excluded. Statistics are null for empty return
cohorts; missing/nonfinite returns are excluded from all statistics. Returns and
hit rates are ratios rounded to four decimal places. The global `caveats` array
lists the numbers-only checklist, restated financials, missing delisted companies,
and exclusion of dividends; `assumptions` gives the full methodology.
Missing filing-month prices remain null.

History excludes Jev readings, current TTM, current shares and later fiscal years.
Integrity is rerun on each cloned fiscal-year prefix. Filing dates come from
EODHD annual statements, EDINET annual document lists, or report metadata; absent
dates use fiscal end plus three calendar months. This is a numeric reconstruction,
not a point-in-time backtest: cached fundamentals are restated, classification/FX/
bond yields are current, the universe has survivorship bias, and the existing
cached closes can differ in split adjustment. Latest derived price seeds are not
used for returns. A real quote is preferred, otherwise the last complete cached
monthly close is used.

`history-v7/<run>/report.json` records per-year raw/gzip sizes, return coverage and
input failures. A running upstream job can change inputs between runs; rerunning
creates a fresh snapshot without replacing the prior one. Publishing remains an
explicit controller action after merge; none of the three stages publishes.
