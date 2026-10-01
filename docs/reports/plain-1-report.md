# Plain rule sentences and matching tile basis — 2026-10-01

Base: `94b0659` (the supplied live revision). Worktree: `/Users/miki/GitHub/superinvestors-wt/value-ze-consistency`.

## Changes

Each quality tile now uses one plain sentence with the deciding numbers and their minimum or limit. The formula summary lives in the drawer’s **How we decided** row, followed by the complete applied checks. The independent verdict test compares structured rule results against published verdicts; it no longer parses the sentence.

GOOGL’s lasting-advantage tile now uses the rule’s **ROIC excluding acquisitions** for its labelled chart and all three numbers: **42.4% median, 31.2% worst, 33.4% latest**. Previously the tile showed 22.8% median, 6.8% worst and 30.1% latest on the including-acquisitions basis. The second-worst return used by the rule is 33.4%, with a 10% minimum; the median needs 15%. The including-acquisitions annual series remains separately labelled in the drawer table. The drawer explains that the compounder tier requires a ten-year median return including acquisitions of at least 15%; the valuation drawer labels this separate threshold too.

Only actual judgement overrides have footers. GOOGL’s reads: “Judgement: passes — spending builds AI capacity, upkeep ≈ depreciation.” The cash sentence still states the numeric shortfall ($0.75 per $1, minimum $0.80); the full override evidence remains in the drawer.

## Every-tile basis audit

| Tile | Basis shown |
|---|---|
| Predictable profits | Operating margins and loss years from the rule; financial companies use their common-income history and profitable-year count. A loss-year fallback shades positive income, not a currency amount equal to the allowed loss-year count. |
| Lasting advantage | Operating ROIC excluding acquisitions; financial ROE/ROTE or combined ratio, as selected by the rule. Conservative return floors use their scalar value when annual floor observations are unavailable. |
| Cash for owners | The same five-year owner-cash and income window used by the rule; the sentence gives aggregate conversion, while the labelled median/worst/latest describe annual conversion. Consolidated conversion uses its published scalar, without substituting parent-company cash history. Financial companies retain book-plus-dividend returns. |
| Value created | Retained earnings and market-value gain use the same cumulative window. Financial shares retain the opening observation needed for ten-year growth; tile and drawer summaries both include it. Crisis-adjusted share growth uses the adjusted scalar when a matching annual series is unavailable. Missing per-share value history no longer substitutes a share-count chart. |
| Honest profits | The rule’s accrual series for operating companies. Financial warning counts and labelled filing likelihoods replace unrelated net-income charts. |
| Price | Unchanged valuation cash flows, discount and required-return basis; verified by the consistency script. |

No quality verdict, valuation, buy flag or stored company data was changed.

## Before / after sentences — ten companies

All five tiles are included for GOOGL, KO, AAPL, LULU, WKL, ACN, JPM, CB, Investor AB and Intel, using the frozen local published-store snapshot. The latter two also show failing and warning-tolerant cases.

| Company | Tile | Before | After |
|---|---|---|---|
| GOOGL.US | Predictable profits | Loss years 0 ≤ 2; Margin variation 0.16 ≤ 0.35; 5/5 applied checks met. | Margins varied 15.8% around their average (limit 35%), and no loss years were recorded (limit 2). |
| GOOGL.US | Lasting advantage | ROIC ex acquisitions median 42.4% ≥ 15.0%; Second-lowest return (one bad year allowed) 33.4% ≥ 10.0%; 3/3 applied checks met. | Earned a median 42.4% on operating capital excluding acquisitions (minimum 15%), and the second-worst year earned 33.4% (minimum 10%, allowing one bad year). |
| GOOGL.US | Cash for owners | Most spending builds new capacity (AI infrastructure); FY2025 upkeep ≈ depreciation USD 21.1bn. Cash conversion is close enough to the threshold; stock compensation remains a cost. Judgement override: pass. | Each $1 of profit left $0.75 for owners over five years (minimum $0.80). |
| GOOGL.US | Value created per $1 kept | Value per $1 kept 14.95 ≥ $1; 4/4 applied checks met. | Each $1 kept became $14.95 of market value (minimum $1). |
| GOOGL.US | Honest profits | Accruals / assets -5.5% ≤ 10.0%; 1 warnings (2 fail; cash backing required). | Profits were backed by cash: accruals were -5.5% of assets (limit 10%). |
| KO.US | Predictable profits | Loss years 0 ≤ 2; Margin variation 0.11 ≤ 0.35; 5/5 applied checks met. | Margins varied 10.9% around their average (limit 35%), and no loss years were recorded (limit 2). |
| KO.US | Lasting advantage | ROIC ex acquisitions median 22.7% ≥ 15.0%; Second-lowest return (one bad year allowed) 19.4% ≥ 10.0%; 3/3 applied checks met. | Earned a median 22.7% on operating capital excluding acquisitions (minimum 15%), and the second-worst year earned 19.4% (minimum 10%, allowing one bad year). |
| KO.US | Cash for owners | Cash per $1 profit 0.95 ≥ 0.80; 3/3 applied checks met. | Each $1 of profit left $0.95 for owners over five years (minimum $0.80). |
| KO.US | Value created per $1 kept | Value per $1 kept 8.16 ≥ $1; 4/4 applied checks met. | Each $1 kept became $8.16 of market value (minimum $1). |
| KO.US | Honest profits | Accruals / assets 5.4% ≤ 10.0%; 0 warnings (2 fail; cash backing required). | Profits were backed by cash: accruals were 5.4% of assets (limit 10%). |
| AAPL.US | Predictable profits | Loss years 0 ≤ 2; Margin variation 0.09 ≤ 0.35; 5/5 applied checks met. | Margins varied 9.2% around their average (limit 35%), and no loss years were recorded (limit 2). |
| AAPL.US | Lasting advantage | ROIC ex acquisitions median 70.4% ≥ 15.0%; Second-lowest return (one bad year allowed) 31.3% ≥ 10.0%; 3/3 applied checks met. | Earned a median 70.4% on operating capital excluding acquisitions (minimum 15%), and the second-worst year earned 31.3% (minimum 10%, allowing one bad year). |
| AAPL.US | Cash for owners | Cash per $1 profit 0.90 ≥ 0.80; 3/3 applied checks met. | Each $1 of profit left $0.90 for owners over five years (minimum $0.80). |
| AAPL.US | Value created per $1 kept | Value gained 3025727963119.63 ≥ retained -112594000000.00; 4/4 applied checks met. | Market value rose by 3025.7 billion while 112.6 billion more than profits was returned to owners (value loss cannot exceed that return). |
| AAPL.US | Honest profits | Accruals / assets 0.1% ≤ 10.0%; 0 warnings (2 fail; cash backing required). | Profits were backed by cash: accruals were 0.1% of assets (limit 10%). |
| LULU.US | Predictable profits | Loss years 0 ≤ 2; Margin variation 0.12 ≤ 0.35; 5/5 applied checks met. | Margins varied 11.6% around their average (limit 35%), and no loss years were recorded (limit 2). |
| LULU.US | Lasting advantage | ROIC ex acquisitions median 47.0% ≥ 15.0%; Second-lowest return (one bad year allowed) 32.4% ≥ 10.0%; 3/3 applied checks met. | Earned a median 47% on operating capital excluding acquisitions (minimum 15%), and the second-worst year earned 32.4% (minimum 10%, allowing one bad year). |
| LULU.US | Cash for owners | Cash per $1 profit 0.90 ≥ 0.80; 3/3 applied checks met. | Each $1 of profit left $0.90 for owners over five years (minimum $0.80). |
| LULU.US | Value created per $1 kept | Value per $1 kept 3.96 ≥ $1; 4/4 applied checks met. | Each $1 kept became $3.96 of market value (minimum $1). |
| LULU.US | Honest profits | Accruals / assets -0.3% ≤ 10.0%; 1 warnings (2 fail; cash backing required). | Profits were backed by cash: accruals were -0.3% of assets (limit 10%). |
| WKL.AS | Predictable profits | Loss years 0 ≤ 2; Margin variation 0.12 ≤ 0.35; 5/5 applied checks met. | Margins varied 11.6% around their average (limit 35%), and no loss years were recorded (limit 2). |
| WKL.AS | Lasting advantage | ROIC ex acquisitions median 140.2% ≥ 15.0%; Second-lowest return (one bad year allowed) 104.3% ≥ 10.0%; 3/3 applied checks met. | Earned a median 140.2% on operating capital excluding acquisitions (minimum 15%), and the second-worst year earned 104.3% (minimum 10%, allowing one bad year). |
| WKL.AS | Cash for owners | Cash per $1 profit 1.07 ≥ 0.80; 3/3 applied checks met. | Each $1 of profit left $1.07 for owners over five years (minimum $0.80). |
| WKL.AS | Value created per $1 kept | Value gained 10381825688.17 ≥ retained -1347000000.00; 4/4 applied checks met. | Market value rose by 10.4 billion while 1.3 billion more than profits was returned to owners (value loss cannot exceed that return). |
| WKL.AS | Honest profits | Accruals / assets -3.8% ≤ 10.0%; 0 warnings (2 fail; cash backing required). | Profits were backed by cash: accruals were -3.8% of assets (limit 10%). |
| ACN.US | Predictable profits | Loss years 0 ≤ 2; Margin variation 0.03 ≤ 0.35; 5/5 applied checks met. | Margins varied 3.1% around their average (limit 35%), and no loss years were recorded (limit 2). |
| ACN.US | Lasting advantage | ROIC ex acquisitions median 131.2% ≥ 15.0%; Second-lowest return (one bad year allowed) 45.6% ≥ 10.0%; 3/3 applied checks met. | Earned a median 131.2% on operating capital excluding acquisitions (minimum 15%), and the second-worst year earned 45.6% (minimum 10%, allowing one bad year). |
| ACN.US | Cash for owners | Cash per $1 profit 0.87 ≥ 0.80; 3/3 applied checks met. | Each $1 of profit left $0.87 for owners over five years (minimum $0.80). |
| ACN.US | Value created per $1 kept | Value per $1 kept 5.64 ≥ $1; 4/4 applied checks met. | Each $1 kept became $5.64 of market value (minimum $1). |
| ACN.US | Honest profits | Accruals / assets -5.8% ≤ 10.0%; 1 warnings (2 fail; cash backing required). | Profits were backed by cash: accruals were -5.8% of assets (limit 10%). |
| JPM.US | Predictable profits | Profitable years 10 ≥ 9; 1/1 applied checks met. | Profits were positive in 10 years (at least 9 needed). |
| JPM.US | Lasting advantage | Positive common capital; Tangible ROE median 18.4% ≥ 12.0%; 3/3 applied checks met. | Earned a median 18.4% on tangible equity (minimum 12%), and the second-worst year earned 13% (minimum 5%, allowing one bad year). |
| JPM.US | Cash for owners | Book + dividends / year 14.8% ≥ 7.0%; 1/1 applied checks met. | Book value plus dividends grew 14.8% a year (minimum 7%). |
| JPM.US | Value created per $1 kept | Ordinary shares / year -2.9% ≤ 2.0%; 2/2 applied checks met. | Ordinary shares shrank 2.9% a year (growth limit 2%). |
| JPM.US | Honest profits | 0 accounting warnings; none allowed; 1/1 applied checks met. | 0 accounting warnings were found (none allowed). |
| CB.US | Predictable profits | Profitable years 10 ≥ 8; 1/1 applied checks met. | Profits were positive in 10 years (at least 8 needed). |
| CB.US | Lasting advantage | Positive common capital; Tangible ROE median 25.6% ≥ 12.0%; 2/2 applied checks met. | Earned a median 25.6% on tangible equity (minimum 12%). |
| CB.US | Cash for owners | Book + dividends / year 13.6% ≥ 7.0%; 1/1 applied checks met. | Book value plus dividends grew 13.6% a year (minimum 7%). |
| CB.US | Value created per $1 kept | Ordinary shares / year -1.1% ≤ 2.0%; 2/2 applied checks met. | Ordinary shares shrank 1.1% a year (growth limit 2%). |
| CB.US | Honest profits | 0 accounting warnings; none allowed; 1/1 applied checks met. | 0 accounting warnings were found (none allowed). |
| INVE-B.ST | Predictable profits | Margin variation 0.39 > 0.35; 4/5 applied checks met. | Margins varied 39.3% around their average (limit 35%). |
| INVE-B.ST | Lasting advantage | ROIC ex acquisitions median 13.9% < 15.0%; Second-lowest return (one bad year allowed) -0.2% < 10.0%; 1/3 applied checks met. | Earned a median 13.9% on operating capital excluding acquisitions (minimum 15%), and the second-worst year earned -0.2% (minimum 10%, allowing one bad year). |
| INVE-B.ST | Cash for owners | Cash per $1 profit 0.99 ≥ 0.80; 3/3 applied checks met. | Each $1 of profit left $0.99 for owners over five years (minimum $0.80). |
| INVE-B.ST | Value created per $1 kept | Value per $1 kept 1.16 ≥ $1; 4/4 applied checks met. | Each $1 kept became $1.16 of market value (minimum $1). |
| INVE-B.ST | Honest profits | Accruals / assets 12.3% > 10.0%; 1 warnings (2 fail; cash backing required). | Accruals were 12.3% of assets (limit 10%), and cash still backed profits and only one warning appeared (two cause a failure). |
| INTC.US | Predictable profits | Margin variation 1.22 > 0.35; 4/5 applied checks met. | Margins varied 122.2% around their average (limit 35%). |
| INTC.US | Lasting advantage | Second-lowest return (one bad year allowed) -1.4% < 10.0%; Gross-margin drop 17.2% > 4.0%; 1/3 applied checks met. | The second-worst year earned -1.4% (minimum 10%, allowing one bad year), and gross margin fell 17.2 percentage points (limit 4). |
| INTC.US | Cash for owners | Cash per $1 profit -4.72 < 0.80; 1/3 applied checks met. | Each $1 of profit left $-4.72 for owners over five years (minimum $0.80), and new investment earned -14.9% (minimum 12%). |
| INTC.US | Value created per $1 kept | Value per $1 kept 0.26 < $1; 3/4 applied checks met. | Each $1 kept became $0.26 of market value (minimum $1). |
| INTC.US | Honest profits | Accruals / assets -4.7% ≤ 10.0%; 1 warnings (2 fail; cash backing required). | Profits were backed by cash: accruals were -4.7% of assets (limit 10%). |

## Verification

- Production build: **pass**, 8,219 static pages, output only in `.next`.
- TypeScript: `npx tsc --noEmit --incremental false`, **pass**.
- Vitest: **153 files / 1,693 tests pass** (`--maxWorkers=4`).
- Focused Playwright: **65 tests pass** across consistency and round-sixteen suites, including GOOGL’s exact ROIC values, labelled bases, only-one-override footer, tile/drawer agreement, desktop/mobile layout, lists and return math.
- Independent cash-basis check: all **43 applicable operating-company windows** reproduce the five-year aggregate cash-conversion ratio from the chart’s source cash and income observations.
- Full-corpus structured rules: **2,709 dossiers / 13,150 Pass/Fail quality rules agree**, with 1,522 finite IRRs checked and 31 cash-covered cases.
- Consistency browser audit: **63 published companies pass, one expected unpublished/404 (SIRI.US), zero failures**, covering the saved 60-company cohort expanded to 64 entries.
- Canonical design QA: **8,059 states, zero layout, clipping, overflow, gap-phrase or console issues**, covering every published cohort company plus home at 1728×970, 2056×1180 and 390×844, including drawers, charts, keyboard/hover/tap interactions, methods and search.
- One-screen check: **126/126 company desktop pages fit one screen** (63 companies × two desktop sizes); both home desktop pages fit too. All 63 phone pages pass the mobile layout audit.
- `git diff --check`: **pass**. Disk stayed above 5 GiB; the lowest observed `df -h /` availability was 7.4 GB.

The financial-window issue was caught by the consistency script, reproduced with a failing unit test, and fixed before final verification. Design QA resumed for unfinished paths and rechecked all affected financial-company paths; completed, unaffected page results were retained. One earlier full-unit attempt timed out during a concurrent build; the final complete run above passed. These Playwright results refer to the focused live-store suites, not the unrelated legacy fixture suite.

Reproduction (local only):

```sh
NEXT_DIST_DIR=.next VALUE_SITE_HOST=localhost VALUE_STORE_DIR="$PWD/.audit/staging/store" npm run build
NEXT_DIST_DIR=.next VALUE_SITE_HOST=localhost VALUE_STORE_DIR="$PWD/.audit/staging/store" npm run start -- --port 3017
npx tsc --noEmit --incremental false
npx vitest run --maxWorkers=4
npx tsx scripts/value/consistency-audit.ts http://localhost:3017 .audit/staging
VALUE_AUDIT=1 VALUE_DESIGN_16=1 BASE_URL=http://localhost:3017 npx playwright test value-consistency.spec.ts value-round-sixteen.spec.ts --workers=1
# For each viewport, pass the published cohort paths to the canonical design audit:
QA_VIEWPORTS=1728x970 QA_SETTLE_MS=0 QA_PAGE_SAMPLE=1 QA_SCREENSHOTS=base node scripts/value/design-qa.mjs http://localhost:3017 .audit/plain-1/design-qa "$COHORT_PATHS"
# Repeat at 2056x1180 and 390x844; base-page states also provide the one-screen check.
```

## Local artifacts

- [GOOGL after](/Users/miki/GitHub/superinvestors-wt/value-ze-consistency/.audit/plain-1/googl-after.png)
- [GOOGL drawer](/Users/miki/GitHub/superinvestors-wt/value-ze-consistency/.audit/plain-1/googl-drawer-after.png)
- Frozen before/after sentences and command logs: `.audit/plain-1/`
- [Combined design QA / one-screen results](/Users/miki/GitHub/superinvestors-wt/value-ze-consistency/.audit/plain-1/design-report.json)
- Captured per-company consistency evidence: `.audit/staging/consistency/`

Builds use `.next` only. Disk is checked throughout with a 5 GiB stop threshold. No subagents, push, deployment or remote publication.
