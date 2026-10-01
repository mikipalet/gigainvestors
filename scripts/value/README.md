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

### Live local required return (owner decision, 2026-09-30)

Run `npm run value -- yields` before `analyze`. Each country gets one EODHD
30-calendar-day daily series request, cached for the UTC day in `bonds/CC.json`;
the stage writes the full auditable table to `bonds.json` and `bonds/tables/DATE.json`.
ISO GB maps to UK, CH maps to SW, and CL maps to CH (Chile). **CH10Y is not the Swiss series**; EODHD's
[documented bond symbols](https://eodhd.com/financial-apis-blog/government-bonds-data-in-economic-api)
name Switzerland SW10Y.

Required return is max(10%, selected live local yield + 4 percentage points),
for owner earnings and book value alike. Values retain the unrounded yield;
analysis fingerprints use its nearest 0.1pp bucket. Identical filing text and
unchanged qualitative answers reuse evidence as well as Jev's text cache.

Validation rejects quotes older than seven days and values outside broad country
bands. A latest/30-day median difference over max(1pp, 50% of median) uses the
median if plausible (minimum five distinct dates). The US is also checked against
Yahoo ^TNX; a discrepancy over 0.5pp uses Yahoo's fresh plausible quote. Yahoo
unavailability is flagged. Swiss yields must be between -1.5% and 4%; if the whole
Swiss series is broken, the emergency **policy default is 1%**, dated 2026-09-30,
based on the owner's approximate Swiss yield and the [SNB reference series](https://data.snb.ch/en).
It is not represented as live market data. No default is invented for other
countries and no foreign yield is substituted; missing local data leaves value
unavailable. Sources, dates, raw yields, medians, cross-checks and flags are saved
and warnings are logged.

A central discount rate at/below perpetual growth has no finite model value and
is explicitly unavailable. The high scenario reduces its usual 1pp rate shift
to half the gap above perpetual growth when necessary; the central required
return never changes. This also applies to bank/insurer perpetual book growth.

### Western market scope (owner direction, 2026-09-30)

`WESTERN_VENUES` in `lib/value/config.ts` is the retail-access allowlist; `F` is
Frankfurt. `bestWesternListing` selects from `Company.listings`: Western home
listing first, otherwise a US listing (including OTC Y/F codes), otherwise the
lexically first eligible listing. Company domicile does not determine access.
Index rows and dossiers publish `w: string | null`; search tuples append `w` as
field 6 (legacy five-field tuples remain readable).

Global `meta.story`, `meta.funnel` and history `perYear` remain unchanged in shape.
`meta.western.{story,funnel}` and `history/index.json.western.perYear` contain the
corresponding Western populations, including their own finite-return medians and
hit-rate baselines. History eligibility uses today's listings, not historical
broker availability. Price refreshes update both scopes atomically with buy flags.

The site defaults to Western scope; `?markets=all` restores global scope. Search
always includes all markets. Alternate-listing labels identify a trading route;
valuation and quote amounts still belong to the dossier's home listing and do not
imply a one-for-one ADR ratio. Pipeline priority is Western access, then descending
market cap; refresh age breaks equal-cap ties for fundamentals and price history.

To preview without publishing or interfering with another analysis job:
`VALUE_CORPUS_DIR=~/value-corpus npm run value -- publish --out=/tmp/value-release`
writes the current completed analyses to a new or empty local directory. It copies
cached published closes, merges local seeds, and uses cached FX for verification.
It does not run analysis/calibration, access Git, push, or revalidate the live site.
Keep the server and browser pointed at the same directory as described below.

For a preview based on the existing live publication instead of the corpus:
`npx tsx scripts/value/western-preview.ts /tmp/value-western-preview` rebuilds an
immutable copy of the current live publication and records its commit provenance.
Use an empty output directory. It makes no provider calls and does not mutate the
corpus or data repository. Serve that directory to both the server
(`VALUE_STORE_DIR`) and browser (`NEXT_PUBLIC_VALUE_DATA_URL`) when building QA.
### Italy: Milan / Growth Milan from ESEF

```sh
export VALUE_CORPUS_DIR="$HOME/value-corpus"
npx tsx scripts/value/cli.ts italy
# Subsets and retries use the same stage:
npx tsx scripts/value/cli.ts italy --only=ENI.MI,ISP.MI,ENEL.MI,RACE.MI,MONC.MI
# Pass the Italian IDs from universe.jsonl to the ordinary analyze stage.
# Do not run prices or publish for a local-only import: prices publishes.
```

`italy` reads the official Euronext CSV for MTAA and EXGM, resolves LEIs by ISIN using GLEIF (exact unambiguous name fallback), and pages through **all** filings.xbrl.org annual packages, including issuers domiciled outside Italy such as Ferrari. It consumes each package's extracted XBRL-JSON and caches the associated report XHTML for the existing ESEF section cutter. Companies use `CODE.MI`, `country: IT`, `source: esef`; identity matches retain overseas aliases with Milan primary. EODHD fundamentals skip these issuers, and a universe refresh retains them.

Financial facts use canonical absolute values, exclusive XBRL period ends, annual durations, consolidated contexts, reporting currency and share units. Related-party/segment facts are excluded. Conflicting duplicate values stay null. Newer filings replace reported comparatives without erasing balance facts missing from the newer package. Parent profit/equity take precedence; capex is positive spending, with both tangible and intangible purchases required unless a combined total exists. No issuer-extension guessing or share counts inferred from rounded EPS. Combined D&A plus impairment is not treated as pure D&A. Missing history remains subject to the unchanged seven-year integrity gate.

Yahoo `.MI` supplies current prices and monthly history. `italy` writes these locally to `prices/IT.json`, `prices-history/`, and raw quote caches, without opening a publication repository. It retains listed companies even when filings are absent. `raw/esef/summary.json` records coverage gaps and source failures; failures can be retried without downloading completed packages again. `--force` refreshes listing/LEI/index/quote metadata; immutable filing JSON/XHTML remains cached. Only completed issuer imports get a resume fingerprint.

### Download priority and missing caps

Before fundamentals selection or universe ordering, missing caps are recovered from cached company/fundamentals data or free Yahoo data. Yahoo chart price times verified shares uses proper GBp/GBX, ZAc and ILA scaling. Without known shares, the unauthenticated Yahoo time-series endpoint can supply a recent **reported market cap**. Its ordinary-share counts are used only when consistent with the EPS-denominator share basis, avoiding multiplication of an ADR price by underlying ordinary shares. A cached EODHD bulk close is the fallback when shares are known. Unsupported/missing data stays unknown; positive caps and misses are cached.

```sh
npx tsx scripts/value/cli.ts market-caps --only=ZM.US,ZTS.US,ENI.MI
```

This standalone backfill updates corpus company overlays and writes `raw/market-caps/summary.json`; it never publishes. The downloader enriches the entire eligible selection **before** `--limit`. Sorting follows the Western venue allowlist from the Western-access work (including US ADR aliases), then USD cap descending. Unknown caps use venue importance: main exchanges before AIM/Growth/Venture and OTC. Refresh age breaks remaining ties. Venue segment ranking uses reported metadata; it does not guess AIM membership from a ticker. Free estimates are ordering inputs, not replacements for audited fundamentals.

### Release-2 share and buy consistency

ESEF analysis with no latest tagged share count reuses the verified Yahoo share
source used for cap enrichment. It checks reported ordinary shares against Yahoo's
reported average shares (never profit divided by rounded EPS), then runs the existing
current-share cap/price sanity check. Analysis records `shareCount.source: yahoo-shares`
and valuations using the fallback record `sharesSource: yahoo-shares`. Annual filing
shares stay untouched; current shares are never backfilled into historical snapshots.
The separate 2% publication cap/price verification gate still applies.

The published `b` flag requires all five quality tests, clear valuation checks,
price at or below the margin-of-safety buy price, **and** expected return at least
the stored required return. `publishedBuyPrice` is shared by publication, numeric
history snapshots, and price refresh. Compact `buyReturnInputs` preserve cash per
share in trading currency, capped growth and the required return so refreshed
quotes recompute cash yield plus growth. Missing expected returns cannot pass.
Dossiers and index cards use the same quote-based expected return calculation.


### Acquisition capital and investment NAV

Compounder valuation additionally requires a median annual owner-earnings return
of at least 15% on equity + debt + leases not already in debt − excess cash.
Goodwill and acquired intangibles stay in that capital base. Excess cash is cash
above the existing 2%-of-revenue operating reserve. Both return medians use the
last ten fiscal years and at least eight valid observations; the existing quality
tests are unchanged. A failed or unsupported total-capital hurdle selects standard
valuation, without changing the quality result.

Named investment holdings (excluding Berkshire) use NAV valuation. Other Asset
Management / Capital Markets companies require five complete years with aggregate
fair-value gains above 50% of aggregate total income. Missing gains are unknown,
not zero. NAV must be explicitly reported (`navPerShare` or `investmentNav`), never
substituted from consolidated operating book equity. Eleven annual NAV points and
ten annual dividends produce a ten-year reinvested total-return CAGR, capped at
12%. Expected return is that rate divided by price/NAV; the buy checks require
price ≤ 85% of NAV and expected return ≥ 10%. Without the NAV history, holdings
remain in the private undecided list and are absent from public views.

To replace an existing local snapshot while retaining its audit/QA files:

```sh
npm run value -- publish --out /absolute/local/snapshot --overwrite
npx tsx scripts/value/buy-audit.ts /absolute/local/snapshot
```

`--overwrite` requires `--out` and refuses a Git repository. It does not authorize
remote publication, commits, pushes, or revalidation.

### India: official NSE annual filings

```sh
npx tsx scripts/value/india-fundamentals.ts --dry-run
npx tsx scripts/value/india-fundamentals.ts --only=RELIANCE.NSE,TCS.NSE,HDFCBANK.NSE,INFY.US,ITC.NSE
npx tsx scripts/value/cli.ts india
```

`india` imports only existing Nifty 50 members. Local ticker aliases resolve to
the existing canonical company (including `INFY.US`); it does not create duplicate
companies. It writes fundamentals and a single `raw/india` cache, with immutable
pre-import backups and per-company candidate/coverage records. Dry runs still
cache sources but do not write fundamentals. It stops below 5 GiB free on `/`,
caps each response at 4 MiB, and makes at most three requests/second. `--force`
refreshes indexes and Yahoo; downloaded official documents remain cached.

NSE's keyless annual list, legacy HTML/detail JSON, quarterly-indexed audited
annual columns, and integrated financial-results XBRL supply annual consolidated
facts. Values retain URL/tag provenance. Unknown lines stay null, inconsistent
profit attribution is quarantined, and the existing integrity rules can trim
history at gaps or uncorroborated share changes. NSE split/bonus events corroborate
share changes. Yahoo fills missing recent lines only when overlapping INR revenue
and parent profit agree within 3%; routine Yahoo refreshes preserve official history.

Older results frequently lack balance sheets and cash flows: ten annual rows do
not mean ten complete statements. Existing ADR/GDR histories are preserved until
currency and depositary-share bases are reconciled; their official INR candidates
remain in the cache. This stage does not change company classification or run
analysis/publication. See `docs/value/india-1-report.md` for measured coverage and
unresolved gaps from the initial import.
