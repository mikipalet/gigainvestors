# Memo round 2 — local checkpoint; contract acceptance still unmet

As of 2026-10-02T01:24:43.038Z. Worktree `value-zh-memo`; starting HEAD `c410970`. Commit message: `value: memo plain english, validation, price line for all, pricing/risk backfill`. No subagents, push, deployment or remote publication.

## Result

All 2,709 original dossier IDs remain in the local snapshot. **2,346 (86.60%) have at least five answers**, up from 1,299 (47.95%). **Q7 now covers all 2,709.** The binding 95% five-answer requirement is still unmet. Only **2/20 review companies** have all seven answers (LULU and Alphabet); 12 companies across the universe have seven. Unsupported answers remain omitted, not replaced with gap text. This checkpoint is not release acceptance.

| Coverage | Before | After |
|---|---:|---:|
| At least five lines | 1,299 | 2,346 |
| All seven lines | 3 | 12 |
| Three or four lines | 1,393 | 354 |
| Fewer than three lines | 17 | 9 |

| Question | Before | After |
|---|---:|---:|
| Q1: How it makes money | 2,680 | 2,680 |
| Q2: Why customers stay | 2,655 | 2,646 |
| Q3: Can it raise prices | 8 | 55 |
| Q4: Where the cash goes | 2,699 | 2,687 |
| Q5: Are managers owners | 2,405 | 2,405 |
| Q6: What could break it | 9 | 234 |
| Q7: What the price says | 1,499 | 2,709 |

Counts are from actual staged dossiers after public valuation gates and memo validation, not private candidate counts. Private and staged five-line counts now agree. The publisher logs 2,715 analysis/universe rows, but writes 2,709 addressable dossiers. It withholds 493 private valuations; their Q7 uses a computed price comparison instead of a hidden valuation.

## Changes and validation

- Rewrote computed templates into complete English, capped at 18 words and two facts. Expanded money amounts and financial abbreviations; removed metric chains. Returns above 100% read “over 100%.” Zero expansion spending and the 100% incremental-return sentinel are omitted, including the attached capital-allocation data. Buyback comparisons retain year and below/above-value direction.
- All lines pass a shared validation boundary during composition and local publication: word count, sentence/predicate checks, fragment/jargon rejection, percentage plausibility, evidence, and consistency with the displayed financial series. Filing answers additionally require typed Jev support and grammatical/coherence checks. These are conservative gates, not a proof that arbitrary English is always correct.
- Added exact regressions for `0.8% despite price by 60%`, `growth capex/earnings 0%`, and `incremental return 100%`, plus inflated returns, impossible ownership, table debris, stale price lines, FX mismatch, source/dossier margin conflicts and PDF reading order. Manual sample review also removed “organic sales” metric chains and “cost of risk” jargon.
- Q7 recomputes against the final public quote and valuation. When no valuation survives, it uses sales, book/net assets, or a dated price reference with reporting/trading currency conversion. It states negative cash earnings when supported. It does not claim a historical average without an actual historical comparison.
- Recovered 90 of 91 missing direct quotes. Ferrovial’s Amsterdam listing was delisted; its Q7 explicitly names the Madrid price, with the same ISIN and official listing evidence. Four companies without usable earnings/sales/book denominators use their dated 52-week high (543A.JP, 457190.KO, TKMS.XETRA, GNZ.NZ). These price-only comparisons are weaker than earnings-based answers but remain computed and sourced.

## Yield repair

All **98** originally missing-yield cases now have validated local rates. Re-running the existing analysis pipeline produced **80 private valuations**. The remaining 18 have other blockers: 9 non-positive owner earnings, 5 non-positive book value, 2 insufficient tangible-equity return histories, 1 insufficient owner-earnings history, and 1 zero justified price/book. Public share/data-quality gates still apply; 80 is not a claim that 80 valuations are publicly visible.

| Country | Rate | Observation | Validated source |
|---|---:|---|---|
| India | 7.201% | 2026-10-01 | Existing EODHD latest/median validation |
| New Zealand | 5.0801% | 2026-10-01 | Existing EODHD latest/median validation |
| Singapore | 2.495% | 2026-10-01 | Existing EODHD latest/median validation |
| Ireland | 3.35% | August 2026, dated month-end | ECB monthly ten-year convergence series |

The shared yield-source function now falls back to the [official ECB Ireland series](https://data.ecb.europa.eu/data/datasets/IRS/IRS.M.IE.L.L40.CI.0000.EUR.N.Z), validating country, tenor, currency, percentage units, plausible band and a completed month no older than 62 days. No foreign-country yield is substituted. Offline runs preserve already validated version-2 caches. Ireland is explicitly a monthly observation, not an October daily quote.

## Typed filing run and remaining queue

Reader version 4 processed **1,316 distinct companies with available filing text**. The compressed request log confirms **2,706 actual Jev requests across all 1,316 IDs**. This includes the initial 1,287 cached-text companies and 29 newly fetched companies. A call audit caught 254 scans that had initially returned before any Jev request; those IDs were rerun with explicit typed evidence checks. Companies without a faithful short answer remain in research pending even after a successful read.

The bounded fetch attempted **60** companies from a 1,422-company no-text queue and recovered **29** compressed source sets. **1,393 companies still lack source text.** Retrieval uses SEC/EDINET/ESEF and official issuer documents when available; some official-source fallbacks are interim or other issuer reports, not full annual MD&A. **Zero available-text companies remain unattempted by reader version 4.** The broader queue for missing memo answers is **2,697**, including already-read companies whose Q3/Q6 could not be supported. These are different queues and must not be added together.

New filing downloads persist only gzip-compressed topical sections. Full PDFs/HTML are processed in memory. Existing compressed review filings were reused. Empty caches no longer count as text, and native-language sections are retained. PDF extraction now uses reading order for this reader: the old layout mode interleaved Nestlé columns and produced disconnected fragments. The daily runner already invokes `business-backfill --limit=100`; this stage now prioritizes never-attempted companies before retries, preserving per-company version, calls, status and retry time. No new remote schedule was installed.

The manually checked statement regression set scored **25/26 (96.15%)**, with 13 positives and 13 confusable negatives; zero false positives and one false negative (Coca-Cola pricing, support score 0.41). This development set is not an independent holdout or a universe-wide reader accuracy claim. KO Q3 is therefore omitted despite its manually confirmed source. The generic pricing/risk reader has not been independently calibrated across all markets.

## Checks against filings

I personally read the relevant filing passages/tables for the following eleven companies during this run. The checks cover the specified memo facts, not a complete independent reconstruction of every ten-year financial/model input.

| Company | Direct check | Filing |
|---|---|---|
| LULU.US | Americas 71%; gross margin 56.6%, down 260 basis points; selected price increases. Checked price/margin direction against the narrative. | [Filing](https://www.sec.gov/Archives/edgar/data/1397187/000139718726000020/lulu-20260201.htm) |
| ADBE.US | Digital Media revenue $17.65bn and total revenue $23.769bn support 74.3%; no realized numeric pricing answer established. | [Filing](https://www.sec.gov/Archives/edgar/data/796343/000079634326000003/adbe-20251128.htm) |
| GOOGL.US | Search paid clicks +6% and cost per click +7% in the 2024–25 table; Page/Brin 52.7% voting control. These are realized monetization measures, not a pure list-price change. | [Filing](https://www.sec.gov/Archives/edgar/data/1652044/000165204426000018/goog-20251231.htm) |
| KO.US | Consolidated price/mix +4%, worldwide unit cases flat; IRS claim $3.3bn for 2007–09 plus interest. Historical claim amount is not total current exposure. | [Filing](https://www.sec.gov/Archives/edgar/data/21344/000162828026010047/ko-20251231.htm) |
| AAPL.US | iPhone 209,586 / 416,161 million = 50.4%; 402m shares repurchased for $89.3bn; Google’s 2024 antitrust ruling threatens search payments. | [Filing](https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm) |
| MSFT.US | Productivity and Business Processes 139,996 / 331,839 million = 42.2%; commercial cloud revenue per user grew and seats grew 6%. Product mix is not isolated list pricing. | [Filing](https://www.sec.gov/Archives/edgar/data/789019/000119312526323660/msft-20260630.htm) |
| JPM.US | Commercial & Investment Banking 78,454 / 185,581 million managed revenue = 42.3%; $2.2bn Apple Card commitment provision. Managed revenue is explicitly identified. | [Filing](https://www.sec.gov/Archives/edgar/data/19617/000162828026008131/jpm-20251231.htm) |
| ASML.AS | Net system sales 24,474.3 / 32,667.3 million = 74.9%; China 29.1%. Filing gross profit 16,931.4 implies 51.8%, versus cached 17,258 implying 52.8%; conflicting current margin is omitted. | [Filing](https://filings.xbrl.org/724500Y6DUVHQD6OXN27/2025-12-31/ESEF/NL/0/asml-2025-12-31-1-en/reports/asml-2025-12-31-1-en.xhtml) |
| RACE.MI | Cars/spare parts 6,005.243 / 7,145.768 million = 84%; US dependency 28% is cars/spare-parts sales, not all group revenue. | [Filing](https://filings.xbrl.org/549300RIVY5EX8RCON76/2025-12-31/ESEF/NL/0/race-2025-12-31-1-en/reports/race-2025-12-31-1-en.xhtml) |
| CBG.LSE | £165m motor-finance commission provision charge: wording says charge, not cash paid. | [Filing](https://www.closebrothers.com/system/files/rrp/reports/CBGAnnualReport2025.pdf) |
| NESN.SW | Reading-order PDF extraction supports 2.8% pricing contribution and gross margin falling to 45.6%. Corrected the earlier interleaved-column fragment. | [Filing](https://www.nestle.com/sites/default/files/2026-02/annual-review-2025-en.pdf) |

ASML’s underlying cached gross-profit discrepancy remains a data-reconciliation task; this round suppresses the conflicting memo claim and does not silently alter valuation inputs. Ownership values outside the specifically checked controls remain vendor percentages, not universally proxy-verified ownership. Buyback value comparisons use historical values calculated at current rates/FX, as disclosed in evidence.

## Tests, artifacts and disk

- Full final suite: **165 files, 1,760 tests passed, 1 skipped** (`npx vitest run --maxWorkers=2 --testTimeout=20000`). Earlier default-worker timeouts passed with bounded workers.
- Final TypeScript check: **passed**, `npx tsc --noEmit` (exit 0).
- Actual local snapshot audit: **zero structural errors**; all 2,709 IDs retained, valid supported line structure, and every Q7 equals recomputation from the public dossier/quote. `git diff --check` passed.
- Local output: `.memo-2/store`; complete machine-readable lines/evidence and samples: `.memo-2/audit.json`. These generated data artifacts are ignored, not committed. No UI build or deployment gate is claimed.
- Durable corpus: `~/value-corpus/business-backfill/{status,memos,sections-v2,sections-v4,runs}`, compressed `pricing-risk.jsonl.gz`, `queue.json`, `yield-repair.json`, `quote-repair.json`, `memo-2-fetch.json`, and `memo-claims-calibration.json`.
- Disk ledger: approximately **165 MB** net growth in research/staging artifacts, far below 3 GB. An additional conservative scan counted **219.4 MB allocated across all touched corpus/worktree files**, including overwritten files (excluding unchanged dependencies/git/build output). Final snapshot audit shows **19.09 GB free**. The 6 GiB guard never fired. Persistent guards check free space on every invocation and cumulative artifact growth every 30 seconds. No new full filing archives were retained.

Local reproduction (does not push or deploy):

```sh
npx tsx scripts/value/cli.ts business-backfill --offline
npx tsx scripts/value/cli.ts publish --out=.memo-2/store --overwrite
npx tsx scripts/value/memo-audit.ts .memo-2/store
```

## Twenty review companies: all seven slots

A dash means the answer is omitted from the product; it is not displayed as a data-gap sentence. Exact staged wording follows.

### LULU.US

1. Gets 71% of sales from the Americas; keeps 56.6 cents per sales dollar after product costs.
2. Margins ranged from 55.4% to 57.7% during 2021–23; it earns 47% on its capital.
3. It raised selected prices; gross margin fell 2.6 percentage points to 56.6%.
4. Bought back shares 10.5% below our value in 2026; reinvests 5.9% of cash earnings.
5. Insiders own 4.5% of the company.
6. Tariffs and lost import exemptions threaten margins in 2026.
7. The price assumes cash profits shrink 12.8% yearly; they grew 22% yearly over ten years.

### ADBE.US

1. Gets 74.3% of sales from Digital Media; keeps 89.3 cents per sales dollar after product costs.
2. Margins ranged from 87.7% to 88.2% during 2021–23; it earns 25.8% on its capital.
3. —
4. Paid no dividends in 10 years; bought back USD 11.3 billion of shares.
5. Insiders own 0.2% of the company.
6. For example, European data transfers outside the European Economic Area are highly regulated and litigated.
7. The price assumes cash profits grow 11.4% yearly; they grew 31.8% yearly over ten years.

### GOOGL.US

1. Gets 85.1% of sales from Google Services; keeps 59.7 cents per sales dollar after product costs.
2. Margins ranged from 55.4% to 56.9% during 2021–23; it earns 42.4% on its capital.
3. Search prices per click rose 7%; paid clicks rose 6% in 2025.
4. Spends 65.6% of cash earnings on expansion; earns 37.2% on new investment.
5. Insiders own 1.6% of the company; Page and Brin hold 52.7% of votes.
6. Google recorded a $3.5 billion European Commission fine in 2025.
7. The price assumes cash profits grow 31.6% yearly; they grew 29.7% yearly over ten years.

### KO.US

1. Gets 59% of sales from Concentrates; keeps 61.6 cents per sales dollar after product costs.
2. Margins ranged from 58.1% to 60.3% during 2021–23; it earns 22.7% on its capital.
3. —
4. Spends 1.7% of cash earnings on expansion; earns over 100% on new investment.
5. Insiders own 9.9% of the company.
6. It faces an IRS claim for $3.3 billion of 2007–09 taxes, plus interest.
7. The price assumes cash profits grow 26.3% yearly; they grew 6.4% yearly over ten years.

### AAPL.US

1. Gets 50.4% of sales from iPhone; keeps 46.9 cents per sales dollar after product costs.
2. Margins ranged from 41.8% to 44.1% during 2021–23; it earns 70.4% on its capital.
3. —
4. Bought back shares 82.2% above our value in 2025; spends 1% of cash earnings on expansion.
5. Insiders own 1.6% of the company.
6. Google's 2024 antitrust ruling could cut Apple's search payments.
7. The price assumes cash profits grow 37.3% yearly; they grew 11.5% yearly over ten years.

### MSFT.US

1. Gets 42.2% of sales from Productivity and Business Processes; keeps 67.9 cents per sales dollar after product costs.
2. Margins ranged from 68.4% to 68.9% during 2021–23; it earns 73% on its capital.
3. Microsoft 365 commercial cloud revenue per user grew; commercial seats rose 6%.
4. Spends 43.9% of cash earnings on expansion; earns 53.6% on new investment.
5. Insiders own 0.1% of the company.
6. —
7. The price assumes cash profits grow 26.9% yearly; they grew 17.7% yearly over ten years.

### WKL.AS

1. Gets 27.1% of sales from Tax & Accounting; keeps 73.5 cents per sales dollar after product costs.
2. Margins ranged from 68.5% to 71.8% during 2021–23; it earns over 100% on its capital.
3. —
4. Paid dividends in 10 of 10 years; bought back EUR 1.1 billion of shares.
5. Insiders own 0.2% of the company.
6. —
7. The price assumes cash profits grow 0.5% yearly; they grew 11.8% yearly over ten years.

### ACN.US

1. Gets 50.4% of sales from Consulting; keeps 31.9 cents per sales dollar after product costs.
2. Margins ranged from 32% to 32.4% during 2021–23; it earns over 100% on its capital.
3. —
4. Paid dividends in 10 of 10 years; bought back USD 4.6 billion of shares.
5. Insiders own <0.1% of the company.
6. Sanctions restrict its business in Russia.
7. The price assumes cash profits grow 7.1% yearly; they grew 11.6% yearly over ten years.

### JPM.US

1. Gets 42.3% of managed revenue from Commercial & Investment Banking.
2. It earns 18.4% on shareholders’ money, excluding intangible assets.
3. —
4. Paid dividends in 10 of 10 years; bought back USD 34.6 billion of shares.
5. Insiders own 0.4% of the company.
6. JPMorgan set aside $2.2 billion for potential losses on Apple Card lending commitments.
7. The price assumes profits grow 6.3% a year forever.

### BRK-B.US

1. Gets 53.7% of sales from Sales and services.
2. It earns 11.1% on shareholders’ money, excluding intangible assets.
3. —
4. Paid no dividends in 10 years.
5. Insiders own 0.3% of the company.
6. —
7. The price assumes profits grow 4.8% a year forever.

### 7203.JP

1. Gets 89.2% of sales from Automotive; keeps 16.7 cents per sales dollar after product costs.
2. Margins ranged from 17% to 19% during 2021–23; it earns 4.7% on its capital.
3. —
4. Spends 40.5% of cash earnings on expansion; earns 4.2% on new investment.
5. Insiders own <0.1% of the company.
6. —
7. The price is 0.8 times annual sales.

### 6758.JP

1. Gets 36.6% of sales from Games and network services; keeps 30.8 cents per sales dollar after product costs.
2. Margins ranged from 34.6% to 43.7% during 2021–23; it earns 17.3% on its capital.
3. —
4. Reinvests 59.8% of cash earnings; earns 27.7% on new investment.
5. Insiders own <0.1% of the company.
6. —
7. The price is 1.8 times annual sales.

### RIGD.LSE

1. Operates in oil & gas refining & marketing; annual sales are INR 10.6 trillion.
2. Margins ranged from 23.5% to 27.4% during 2021–23; it earns 7.9% on its capital.
3. —
4. Spends 85.8% of cash earnings on expansion; earns 8.5% on new investment.
5. Insiders own 0% of the company.
6. —
7. The price assumes cash profits grow 10.9% yearly.

### 0700.HK

1. Gets 49.1% of sales from Value-added services; keeps 56.2 cents per sales dollar after product costs.
2. It earns 23.8% on its capital.
3. —
4. Reinvests 30.5% of cash earnings; earns over 100% on new investment.
5. Insiders own 31.7% of the company; Ma Huateng holds 8.8% of shares.
6. —
7. The price assumes cash profits grow 11.7% yearly; they grew 18.5% yearly over ten years.

### 005930.KO

1. Sales from Device eXperience bring 56.3% of revenue, including sales between divisions.
2. Margins ranged from 29.4% to 39% during 2021–23; it earns 17.6% on its capital.
3. —
4. Spends 12.1% of cash earnings on expansion; earns 13.3% on new investment.
5. Insiders own 9.7% of the company.
6. Sales to the five major customers accounted for approximately 15% of total sales.
7. The price assumes cash profits grow 22.7% yearly; they grew 13% yearly over ten years.

### RACE.MI

1. Gets 84% of sales from Cars and spare parts; keeps 51.7 cents per sales dollar after product costs.
2. Margins ranged from 48% to 51.3% during 2021–23; it earns 35.5% on its capital.
3. —
4. Reinvests 9.3% of cash earnings; paid dividends in 7 of 10 years.
5. Insiders own 32.3% of the company; Exor holds 32.3% of votes.
6. Depends on the US for 28% of car and spare-parts sales.
7. The price assumes cash profits grow 33.4% yearly; they grew 10.6% yearly over ten years.

### NESN.SW

1. Gets 28.1% of sales from Powdered and liquid beverages; keeps 45.6 cents per sales dollar after product costs.
2. Margins ranged from 45.4% to 48% during 2021–23; it earns 18.9% on its capital.
3. Prices added 2.8% to sales; gross margin fell to 45.6%.
4. Paid dividends in 10 of 10 years; bought back CHF 213 million of shares.
5. Insiders own <0.1% of the company.
6. —
7. The price assumes cash profits grow 11.8% yearly; they grew 1.8% yearly over ten years.

### MC.PA

1. Operates in luxury goods; annual sales are EUR 80.8 billion.
2. Margins ranged from 68.3% to 68.8% during 2021–23; it earns 24% on its capital.
3. —
4. Paid dividends in 10 of 10 years; bought back EUR 1.6 billion of shares.
5. Insiders own 50.3% of the company.
6. —
7. The price is 2.4 times annual sales.

### ASML.AS

1. Gets 74.9% of sales from Lithography systems.
2. Margins ranged from 49.5% to 51.9% during 2021–23; it earns 85.6% on its capital.
3. —
4. Spends 5.8% of cash earnings on expansion; earns 55% on new investment.
5. Insiders own <0.1% of the company.
6. Depends on China for 29.1% of sales.
7. The price assumes cash profits grow 52.2% yearly; they grew 22.9% yearly over ten years.

### CBG.LSE

1. Operates in regional banking; annual sales are GBP 1.2 billion.
2. It earns 14.4% on shareholders’ money, excluding intangible assets.
3. —
4. Paid dividends in 9 of 10 years; bought back GBP 1.6 million of shares.
5. Insiders own 1.9% of the company.
6. It recorded a £165 million charge for potential motor-finance commission claims.
7. The price assumes profits shrink 21.5% a year forever.

## Fifteen random company samples

Deterministic sample: sort non-review IDs by SHA-256 of `memo-2:` plus ID, take 15. I read every displayed sample line. The review caught and removed KMB’s organic-sales metric chain and TBCG’s unexplained “cost of risk”; it also replaced regional-bank/REIT category jargon. No source reconciliation of all financial history is claimed for this sample.

### KMB.US

1. Operates in household & personal products; annual sales are USD 17.2 billion.
2. Margins ranged from 30.8% to 34.4% during 2021–23; it earns 33.7% on its capital.
3. —
4. Paid dividends in 10 of 10 years; bought back USD 141 million of shares.
5. Insiders own 0.7% of the company.
6. Sanctions restrict its business in Russia.
7. The price assumes cash profits grow 20.6% yearly; they grew 9% yearly over ten years.

### 4385.JP

1. Annual sales are JPY 229.3 billion.
2. Margins ranged from 64.7% to 77.1% during 2021–23; it earns 0.7% on its capital.
3. —
4. Spends 1.5% of cash earnings on expansion; paid no dividends in 10 years.
5. —
6. —
7. The price assumes cash profits grow 15.8% yearly.

### AMP.US

1. Operates in asset management; annual sales are USD 18.9 billion.
2. It earns 23.6% on its capital.
3. —
4. Paid dividends in 10 of 10 years; bought back USD 2.9 billion of shares.
5. Insiders own 0.2% of the company.
6. —
7. The price is 2.5 times annual sales.

### 3407.JP

1. Annual sales are JPY 3.1 trillion.
2. Margins ranged from 28.4% to 32.3% during 2021–23; it earns 7.8% on its capital.
3. —
4. Spends 10.4% of cash earnings on expansion; earns 7% on new investment.
5. —
6. —
7. The price assumes cash profits grow 5.9% yearly; they grew 2.7% yearly over ten years.

### PNDORA.CO

1. Operates in luxury goods; annual sales are DKK 32.5 billion.
2. Margins ranged from 76.1% to 78.6% during 2021–23; it earns 54.8% on its capital.
3. —
4. Paid dividends in 10 of 10 years; bought back DKK 4.4 billion of shares.
5. Insiders own 0.6% of the company.
6. US import tariffs could raise product costs.
7. The price assumes cash profits grow 1% yearly; they grew 9.1% yearly over ten years.

### DIS.US

1. Operates in entertainment; annual sales are USD 94.4 billion.
2. Margins ranged from 33.1% to 34.2% during 2021–23; it earns 15.5% on its capital.
3. —
4. Spends 13.5% of cash earnings on expansion; earns over 100% on new investment.
5. Insiders own 0.1% of the company.
6. —
7. The price is 2 times annual sales.

### 138930.KO

1. Operates in regional banking; annual sales are KRW 4 trillion.
2. It earns 6.8% on shareholders’ money, excluding intangible assets.
3. —
4. Paid dividends in 10 of 10 years; bought back KRW 100 billion of shares.
5. Insiders own 27.1% of the company.
6. —
7. The price assumes profits grow 5.5% a year forever.

### ELIS.PA

1. Operates in specialty business services; annual sales are EUR 4.8 billion.
2. Margins ranged from 32.9% to 43.8% during 2021–23; it earns 9.8% on its capital.
3. —
4. Paid dividends in 10 of 10 years; bought back EUR 153.8 million of shares.
5. Insiders own 21.8% of the company.
6. —
7. The price is 1.1 times annual sales.

### TBCG.LSE

1. Operates in regional banking; annual sales are GEL 5.8 billion.
2. It earns 24.2% on shareholders’ money, excluding intangible assets.
3. —
4. Paid dividends in 10 of 10 years; bought back GEL 108.3 million of shares.
5. Insiders own 20.6% of the company.
6. —
7. The price assumes profits grow 0.4% a year forever.

### SUNPHARMA.NSE

1. Operates in pharmaceuticals; annual sales are INR 584.6 billion.
2. It earns 16.9% on its capital.
3. —
4. Reinvests 36% of cash earnings; earns 35.5% on new investment.
5. —
6. —
7. The price assumes cash profits grow 26.6% yearly; they grew 15.3% yearly over ten years.

### 034730.KO

1. Operates in conglomerates; annual sales are KRW 122.7 trillion.
2. Margins ranged from 9.5% to 11.3% during 2021–23; it earns 6.3% on its capital.
3. —
4. Paid dividends in 10 of 10 years.
5. Insiders own 25.4% of the company.
6. —
7. The price is 0.3 times annual sales; cash earnings are negative.

### MIL.WAR

1. Operates in regional banking; annual sales are PLN 10.6 billion.
2. It earns 8.9% on shareholders’ money, excluding intangible assets.
3. —
4. Paid no dividends in 10 years.
5. Insiders own 50.1% of the company.
6. —
7. The price is 2.6 times annual sales.

### 030200.KO

1. Operates in telecom services; annual sales are KRW 28.3 trillion.
2. Margins ranged from 59.7% to 63.6% during 2021–23; it earns 5.3% on its capital.
3. —
4. Spends 6% of cash earnings on expansion; paid dividends in 10 of 10 years.
5. Insiders own 10.9% of the company.
6. —
7. The price assumes cash profits shrink 15% yearly.

### CCI.US

1. Operates in property rentals; annual sales are USD 4.3 billion.
2. Margins ranged from 68.6% to 71.6% during 2021–23; it earns 7.5% on its capital.
3. —
4. Paid dividends in 10 of 10 years; bought back USD 23 million of shares.
5. Insiders own 0.1% of the company.
6. —
7. The price assumes cash profits grow 17.8% yearly; they grew 2.1% yearly over ten years.

### 7752.JP

1. Operates in business equipment & supplies; annual sales are JPY 2.6 trillion.
2. Margins ranged from 34% to 35.4% during 2021–23; it earns 3.8% on its capital.
3. —
4. Paid dividends in 9 of 9 years.
5. Insiders own 3.7% of the company.
6. —
7. The price assumes cash profits grow 8.7% yearly.

