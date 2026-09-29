# value.gigainvestors.com — design

Do the work Buffett does on one company (read the reports, test the business, judge the people, then price it) for every listed company in the world, at a quality existing screeners do not reach. Separate from the current site for now, served on a subdomain.

## Decisions (approved 2026-09-29)

- Fundamentals: EODHD ALL-IN-ONE ($99.99/mo, worldwide statements 30y, bulk EOD prices, 100k calls/day). Key in Vercel env `EODHD_API_KEY` (all environments; `vercel env pull` for local runs).
- Report text: SEC EDGAR (10-K, 20-F, 40-F, DEF 14A), filings.xbrl.org (EU/UK ESEF annual reports), EDINET (Japan). Every other market gets the numeric work plus Jev on the EODHD description, flagged "report not read".
- Qualitative reading: TypeSafe Jev (`jev-latest`, `POST /v1/systemone`), key in 1Password as `typesafe ai (jev) key`. Jev runs over the WHOLE universe, not only companies that pass the numbers.
- Rule: every number, date and ratio is computed in code. Jev only reads prose and answers typed questions (choice / score / noul). Jev's own docs: "not a calculator", reads dates as text, weak numeric calibration, degrades with irrelevant context.
- No blended score. Six tests, each pass / fail / unclear with evidence. A failed moat is not offset by a cheap price.
- Surface: same repo and Next app, route group `app/(value)/`, served on `value.gigainvestors.com` via a host rewrite in `proxy.ts`. Existing pages untouched.
- Storage: raw corpus on this box (`$VALUE_CORPUS_DIR`, default `~/value-corpus`, never `/tmp`); published dossiers in Cloudflare R2 bucket `gigainvestors-value`.
- Refresh: prices daily (bulk EOD per exchange, recompute margin of safety only); fundamentals, reports and Jev quarterly.

## Pipeline (`scripts/value/`, `lib/value/`)

Five stages. Each writes its own output under the corpus dir, is resumable (skips work whose input fingerprint is unchanged) and can be run alone: `npm run value -- <stage> [--only=<id,...>] [--limit=N]`.

### 1. universe
- EODHD exchange list, then symbol list per exchange (common stock only; drop ETFs, funds, preferreds, warrants, SPACs by type and name pattern).
- One row per COMPANY, not per listing: collapse share classes and cross-listings by ISIN issuer prefix / EODHD `PrimaryTicker`, keep the primary listing for price and currency.
- Output: `universe.jsonl` rows `{ id, name, primaryTicker, exchange, country, currency, isin, sector, industry, listings[] }`. `id` is stable (`{exchange}:{ticker}` of the primary listing).

### 2. fundamentals
- EODHD `/fundamentals/{ticker}` per company (verify cost per call and whether the bulk-fundamentals endpoint covers our plan before the first full pull; at 10 calls each the first pull of ~60k takes ~6 days at the daily limit, so the stage is rate-aware and resumes across days).
- Normalise to annual series (as many years as exist, up to 30): revenue, gross profit, operating income, net income, D&A, capex, SBC, operating cash flow, receivables, inventory, payables, cash, total debt, equity, goodwill, intangibles, diluted shares, dividends, buybacks, acquisitions spend. Everything in reporting currency; FX to USD only at display time.
- Data-integrity gate (company becomes `insufficient_data`, not scored): fewer than 7 annual periods; a gap year; share count jumping more than 5x without a split record; reporting currency changing without a restatement; balance sheet not balancing within 2%.

### 3. reports
- EDGAR: latest 10-K / 20-F / 40-F and the latest DEF 14A, via the submissions API (User-Agent header with contact email, 10 req/s).
- filings.xbrl.org: latest ESEF annual financial report package per LEI, extract the xhtml text.
- EDINET: latest 有価証券報告書 via the EDINET API (English summary where present; otherwise Japanese text, Jev reads both).
- Section cutter: business, risk factors, MD&A, shareholder letter (if any), capital allocation / buybacks, executive compensation, accounting policies and notes, auditor report. Each section trimmed to fit Jev's 32k state+question ceiling; long sections split into chunks and answered per chunk (see stage 4).
- Match reports to universe rows by CIK / LEI / EDINET code via ISIN; unmatched companies fall back to the EODHD description.
- Output: `reports/{id}/{section}.txt` plus `reports/{id}/meta.json` (source, filing date, period, url).

### 4. analyze
Code tests and Jev questions per company, then valuation. Output: `analysis/{id}.json`.

#### Numeric tests (code)
Thresholds live in one config file, tuned on the calibration set (below), not scattered in code. Starting values:

1. **Understandable and predictable**: ≥10 years of history; revenue declined in ≤3 of the last 10 years; net loss in ≤2 of the last 10; operating-margin coefficient of variation < 0.35.
2. **Moat**: median ROIC on tangible invested capital ≥ 15% over 10 years and ≥ 10% in the worst 3 of them; gross margin in FY2023 not more than 2pp below FY2020 (the inflation pricing-power test); capex / revenue below the industry median.
3. **Economics**: owner earnings / net income ≥ 0.8 over 5 years (cash conversion); return on incremental invested capital over 10 years ≥ 12%; net working capital / revenue not trending up.
4. **Management**: the $1 test (market-cap gain over 10 years ≥ cumulative retained earnings); diluted share count CAGR over 10 years ≤ +1%; buyback price discipline (buyback dollars higher in years of higher earnings yield; debt-funded buybacks flagged); acquisition spend over 10 years against ROIC stability.
5. **Accounting**: Sloan accruals ratio < 10%; receivables growth minus revenue growth < 10pp over 3 years; restructuring / "one-time" charges in ≥3 of the last 5 years is a fail; SBC / operating cash flow < 15%; goodwill + intangibles / equity reported.
6. **Price**: see valuation. Pass at margin of safety ≥ 25%, unclear at 0 to 25%, fail below 0.

Each test returns `{ result: pass|fail|unclear, metrics: {...}, series: {...} }`. `unclear` when a needed series is missing. The numeric and Jev halves of a test combine by rule, per test: numbers fail → fail; numbers pass and Jev contradicts with probability ≥ 0.7 → unclear; otherwise numbers decide.

#### Jev questions
One versioned question set (`lib/value/questions.ts`), each question bound to the report sections it reads. Types follow Jev's API: `noul` (0-1 yes/no), `choice` (one of a fixed list), `score` (position on a defined scale).

- Understandable: will the core product be recognisably the same in 10 years (noul); exposure to technology change (score low/medium/high); revenue depends on commodity prices (noul); revenue depends on a government licence or regulation (noul).
- Moat: which moat sources the report describes (one noul each: brand, switching costs, network effect, low-cost producer, regulatory licence, scale, none); report states raising prices without losing volume (noul); product is a commodity sold on price (noul).
- Economics: revenue model (choice: recurring / repeat consumable / transactional / project / commodity); capex described as mostly maintenance or mostly growth (choice).
- Management: letter admits a specific mistake (noul); letter leads with adjusted / non-GAAP metrics (noul); founder or family is a large owner or on the board (noul); compensation tied to per-share value or returns vs size or revenue (choice); buybacks described as done below intrinsic value (noul); acquisitions described as the main growth strategy (noul).
- Accounting: material weakness in internal control (noul); auditor changed in the last 3 years (noul); going-concern language (noul); material related-party transactions (noul).

Chunked sections: ask the question per chunk, take the max probability for "is X described" questions and the chunk-weighted mean for the rest. Evidence: Jev returns decisions, not quotes, so for companies that pass the numeric tests a second pass asks the question per paragraph and stores the highest-probability paragraph as evidence. Everyone else shows the section name only.

Budget: ~60k companies × ~15k tokens ≈ 1B tokens ≈ $42 per full run (input $42/B, output free); ~1h at the 250k tokens/s limit. Requests batched to stay under 1,200/min.

#### Valuation (code)
- Owner earnings per year = net income + D&A − maintenance capex − SBC. Maintenance capex = capex − growth capex, growth capex = (average PP&E / revenue) × Δrevenue, floored at 0.
- Normalised owner earnings = median of the last 5 years (7 for companies the understandable test marks cyclical).
- Growth g = min(10-year owner-earnings-per-share CAGR, 10-year revenue-per-share CAGR, ROIIC × reinvestment rate), clamped to [0, 12%], fading linearly to 3% terminal over years 6 to 10.
- Discount rate = max(10%, local 10-year government yield + 4pp).
- Equity value = present value of 10 years + terminal, plus net cash (cash − debt), per diluted share.
- Range: low = g halved and discount +1pp; high = g as computed and discount −1pp; mid is the point estimate. Margin of safety = 1 − price / mid.
- Also reported: the "equity bond" (normalised owner-earnings yield vs the local 10-year yield) and the assumptions used, so the dossier can show the bridge.

### 5. publish
- `dossiers/{id}.json` to R2: identity, six test results with metrics, series and Jev answers (probability + evidence), valuation bridge and range, report source and date, superinvestor holders (joined from `data/store/holders.json` by ticker), pipeline and question-set versions.
- `index/` to R2: one compact row per company (id, name, country, sector, market cap USD, margin of safety, test results, Jev tag bits, held-by count), sharded by country, plus `index/default.json` (all companies passing the five quality tests, sorted by margin of safety).
- Daily price job rewrites only price, margin of safety and the price test in the index and dossiers, then calls a revalidate route.

## Quality control (runs before any publish)

- **Calibration set** (`lib/value/calibration.ts`, ~40 companies with a known Buffett answer). Should pass quality: KO, AXP, AAPL, MCO, VRSN, the Japanese trading houses (8058.TSE, 8031.TSE, 8001.TSE); KHC as the overpay lesson (quality pass, price fail at the 2015 purchase). Should fail: airlines pre-2016 (DAL, UAL, AAL history), textile / commodity producers, serial acquirers (BHC, ex-Valeant, where data exists), heavy diluters. Known exceptions, expected to fail the moat test even though Berkshire holds them (bought on price or a commodity thesis): OXY, CVX. The full list of ~40 is fixed in the implementation plan. `npm run value -- calibrate` prints a confusion table; a threshold or question change only merges if calibration does not get worse.
- **Jev accuracy**: per question, 30 answers sampled and graded against the source text by a frontier model; a question must reach ≥ 85% agreement before it can influence a test result. Below that it is shown as an informational tag only.
- **Data integrity**: the stage-2 gate above; `insufficient_data` companies appear in the index greyed, never ranked.

## Site (`app/(value)/`, host `value.gigainvestors.com`)

- `proxy.ts`: requests with host `value.gigainvestors.com` rewrite to `/value/...`; `/value/*` on the main host redirects to the subdomain. Domain added to the Vercel project.
- `/` index: default view = passes all five quality tests, sorted by margin of safety. Sortable table; filters for country, sector, held by superinvestors, per-test pass/fail, Jev tags; toggle "near misses" (fail exactly one test). Client-side over the sharded index.
- `/[id]` dossier: verdict line (value range vs price, margin of safety, six test chips); the six tests each with result, 10-20 year sparklines (ROIC, gross margin across 2020-2023, share count, owner earnings, $1 test) and Jev answers with probability and evidence; the owner-earnings bridge with assumptions; superinvestor holders linking to `gigainvestors.com/{ticker}`.
- Rendering: the top ~2,000 by market cap prerendered via `generateStaticParams`; the rest render on first request and are cached with `"use cache"` + `cacheLife("days")`, tagged `value:{id}` and `value:index`; `POST /api/value/revalidate` (secret) is called by publish.
- House style follows the existing site (paper, Inter, ink bars); both light and dark.

## Testing

- Unit (vitest): every numeric test and the valuation on hand-built series with known answers; section cutter on real fixture filings (one 10-K, one ESEF, one EDINET); universe collapse of share classes (GOOG/GOOGL, BRK.A/BRK.B, a dual-listed EU name).
- Fixture companies end to end with recorded EODHD and filing responses (no network in tests): KO, a Japanese trading house, one EU ESEF filer, one airline.
- Calibration run as the pipeline gate; Playwright on the index and one dossier against `npm start` with a fixture R2 (local directory adapter).

## Build approach

Stages are built by Codex subagents (`codex exec`) from this spec, one stage per task with its tests; Claude writes the plan, reviews each stage's diff, owns the valuation and test logic review, runs calibration and the end-to-end check.

## Out of scope for v1

Registries beyond EDGAR / ESEF / EDINET; Chinese A-shares text; a frontier-model narrative per company; alerts or email; user accounts or watchlists; linking from the main site.

## Risks

- EODHD coverage and quality outside the US/EU/Japan (restatements, missing D&A or SBC); the integrity gate and "unclear" results absorb this rather than faking a score.
- Jev is two weeks old and its rate limits "can change without notice"; the analyze stage is resumable per company.
- ESEF and EDINET section cutting is harder than EDGAR (no fixed item numbers); sections that cannot be found fall back to the whole report chunked, with lower evidence quality.
