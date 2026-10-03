# Story 2d — selected-source price story and memo lines

Resume base: `a587f58`; isolated branch `value-zo-story`. No subagents, push, deployment, remote publication, text-generation calls or API-key output. Shared chrome is unchanged. All model requests for this feature use Jev choice/score questions; displayed quotes are source literals, with source and date.

## News and source coverage

All 2,708 currently published companies were attempted in the existing Buy now / Next closest / index / remaining-company priority order. The original brief's 2,709 includes the already-deduplicated listing noted in the earlier reports. There are 2,613 successful, fully paginated gzip caches, 1,989 with articles, containing 1,306,137 title/first-paragraph rows. The other 95 listings persistently returned HTTP 404; no article text was invented. Successful caches exhaust the provider's available 18-month result range, not a claim that every real-world article exists in the feed.

The original dated quota ledger was retained: 3,899 reserved requests / **19,495 of 20,000 EODHD calls**, including failed/interrupted attempts and previous resumes. This resume added 12,405 calls over story-2c's 7,090. Toyota's direct feed was empty; the issuer-confirmed TM.US depositary listing supplied business news for the same company. Its official listing reference is https://global.toyota/en/faq/facility/ . No further EODHD calls are needed for this run.

Risk extraction now uses exact heading offsets recovered from original filing markup, bound to report URL/date and the full text SHA-256. 520 SEC 10-K sources were processed successfully. Intel's original blue 12pt heading style and Wolters Kluwer's original principal-risk table were checked explicitly. Ten incomplete retained annual filings were recovered from their existing report URLs (TSLA, CRM, INTC, DIS, NKE, TGT, BA, DE, XOM and PFE); this also restores literal MD&A sentences from those same filings. Full retained risk sections replace truncated topical windows from the same filing. Unverified body paragraphs cannot become risk headings. Literal first clauses are allowed only at grammatical boundaries; arbitrary word cuts, dangling possessives and unfinished auxiliary phrases are rejected.

Selection rejects unrelated-company news, ratings/targets/advice/listicles, source markup, unfinished first-paragraph sentences and unsupported causal claims. Every eligible candidate is offered in bounded choice batches; a rejected winner reopens its own batch. Risk scoring first selects a literal supporting exposure from the same paragraph, then scores materiality, specificity and whether the displayed heading itself names a vulnerability. Every dimension still needs >=1.7/2. No score bar was lowered. Per-kind candidate hashes/versioning reuse unchanged work safely; interrupted candidate replacement cannot validate stale selections.

## Calibration

The fixed forty-company set includes ADBE, NVDA, KO, LULU, GOOGL, Toyota, JPM and Close Brothers (the non-US small cap). Price: **37/40 = 92.5%**. Risk: **37/40 = 92.5%**. Abstentions count as misses. The candidate-hash-bound manual review is `story-2d-labels.json`; this is an agent's manual source review on the calibration set, **not independent human review, a held-out test, or a measured 92.5% universe-wide accuracy**.

Known price misses: Close Brothers' cost-cutting/loss headline misses the motor-finance redress driver; P&G's Chinese skincare-volume story is too narrow; Chevron's single gas-contract story misses the broader commodity/cash-flow driver. Known risk misses: NVIDIA's responsible-use heading and Goldman's cyber heading are too broad; Wolters Kluwer abstains. These misses remain failures in the grade.

## Implementation and nightly behavior

The line remains <=30 words, including the literal quote (<=14 words), attribution, date and computed filing fact. A quote that cannot fit is omitted as a whole. Q3/Q6 remain <=18 words. Q3 uses a scored filing sentence or the real 2021–23 gross-margin fallback only when all three observations exist and their range is <=2 percentage points; otherwise Q3 is omitted.

The normal publisher carries the selected readings into the local snapshot; no postprocessing or remote publication is used. The nightly stage still rotates about 400 companies plus >10% weekly movers, refreshes news and selection, and publishes through the existing pipeline. A final regression exposed a recent-cache early return that skipped re-selection for a weekly mover when its source set was unchanged; weekly movers now bypass that early return. The synthetic 20% weekly-move case failed before the fix and passes afterward. This run had zero weekly movers, so that cache-only correction does not change any of its completed source selections. This run verifies the runner with tests; it does not claim to have waited for a scheduled overnight invocation.

Event selection ranks the published monthly moves and asks Jev about the available dated headlines; the 18-month news feed cannot supply earlier five-year annotations.

The price drawer reuses MiniPrice, remains full height and uses the existing fixed compact width. Its own grid puts headline events beside filing facts; its font scales with the viewport. The price-line-specific header layout gives the verdict sufficient width. Net-cash flags state their existing exclusion of operating leases; a profit-reconciliation flag states “before tax” when that exact basis appears in its retained reconciliation row. These labels clarify the existing calculations; no financial calculation changes. SidePanel.tsx, side-panel.css, search, filters, bottom bar and time slider were not edited.

## Disk-budget incident and final accounting

**The 1.5 GB new-disk constraint was temporarily breached.** At approximately 14:50–14:53 UTC, an ordinary local build prerendered 8,218 pages and grew `.next` to about 2.3 GB. The estimated transient task increase was about 2.8 GB; exact peak allocation was not captured. The selection workers stopped at their artifact ceiling. An attempted build stop did not interrupt it before completion. Minimum observed free space during that incident was 5,384,404 KiB (about 5.13 GiB), above the 4 GiB stop floor.

The oversized generated build and this run's earlier screenshot intermediates were deleted. Subsequent builds use `.next` only and a local build-store with an empty `top.json` to avoid optional company prerendering; all 2,708 companies remain in the unchanged normal snapshot and render on demand at runtime. This is a local verification build strategy, not a deployment change. A process-group monitor now stops builds at 1.35 GB task growth or 4 GiB free, and removes the build cache after success. No files belonging to the other jobs were deleted. Final accounting and monitored build peak are recorded below; final cleanup does not erase the temporary breach.

An earlier parallel browser run was interrupted after its local server received SIGTERM; the cause was not established. Its partial report is retained separately. The final release run restarts an owned local server and browser for each viewport sequentially; only complete runs count below.

## Final coverage and evidence

Snapshot: 2,708 published companies. All have current `literal-17` readings, including explicit abstentions; source audit: 0 failures. Source selection and displayed-line coverage differ because a whole quote is omitted when it cannot fit the line budget.

| Line type | Companies | Coverage |
|---|---:|---:|
| Price: all lines | 2,708 | 100.0% |
| Price: computed | 1,898 | 70.1% |
| Price: move or bank/NAV needs | 2,071 | 76.5% |
| Q3: computed | 585 | 21.6% |
| Price: ten-year needs | 637 | 23.5% |
| Price: literal | 810 | 29.9% |
| Q6: literal | 480 | 17.7% |
| Q3: literal | 19 | 0.7% |

Event-count distribution (headlines are shown only when accepted; sparse feeds can yield fewer than three):

| Headlines in drawer | Companies |
|---:|---:|
| 0 | 1747 |
| 1 | 201 |
| 2 | 130 |
| 3 | 94 |
| 4 | 87 |
| 5 | 90 |
| 6 | 359 |

## Verification

- Relevant unit/integration suites: **163/163 passed**. TypeScript and the monitored local production build passed.
- Final literal-source/hash/score/attribution audit: **2,708 companies, zero failures**, zero obsolete readings.
- Whole-store and eight-company browser consistency audit: **zero failures**. The complete counts and surfaces are in the linked log/JSON.
- Four-viewport release run: **625 states**, **zero cut/overlap failures**. Raw gate exit is nonzero because it still includes whitespace findings and treats the unchanged search popover as a full-height drawer. These raw findings are preserved; this report does not call the unfiltered gate a zero-failure run.
- The sixteen company/viewport screenshot checks pass: no page errors, no desktop page scroll, full-height story drawers. All 32 requested line/drawer images and the required home/list/filter/history/dossier states were visually reviewed.
- Full changed-code/UI diff and scope audit reviewed; shared chrome remains byte-identical to `a587f58`. No deployment was made, so the contract’s before-deploy live/candidate comparison was not invoked.

| Viewport | States | Cut/overlap failures | Raw states with findings |
|---|---:|---:|---:|
| 1728×970 | 157 | 0 | 37 |
| 2056×1180 | 157 | 0 | 37 |
| 1440×800 | 157 | 0 | 37 |
| 390×844 | 154 | 0 | 36 |

Non-whitespace findings outside the existing search-popover geometry classification: **0**.

Story-drawer raster-empty measurements range from 25.2% to 47.5%. Some exceed the contract’s illustrative ~25%; the resume explicitly accepts fixed-width empty-area findings. They are disclosed, not removed from the gate.

- [Tests](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/tests-final.log)
- [TypeScript](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/typecheck-final.log)
- [Build](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/build.log)
- [Build monitor](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/build-monitor.log)
- [Consistency log](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/consistency.log)
- [Consistency JSON](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/consistency/report.json)
- [Source audit](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/final-reading-audit.json)
- [Calibration grade](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/calibration-grade.json)
- [Release gate](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/release/report.json)
- [Screenshot checks](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/report.json)
- [Scope hashes](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/scope-audit.json)
- [Artifact manifest](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/artifact-manifest.json)

Measured task-tree disk accounting before commit: 1,297,408,000 bytes net new (worktree plus price-story corpus, excluding Git metadata in the main repository); 31.27 GiB free. The earlier temporary breach remains recorded above. News/filing text remains gzip-compressed; superseded probes and intermediate screenshots were deleted.

## Eight named companies: lines and screenshots


### ADBE.US

Down 65% since Nov 2021 · "Adobe beats Q3 targets, but soft Q4 sales guidance triggers dip" (finance.yahoo.com, Sep 2026) · sales +10.5%

Q3: Kept about a 88% gross margin through 2022 cost inflation.

Q6: "Some of our enterprise solutions have extended and complex sales cycles" (SEC filing, Jan 2026)

| Viewport | Line | Drawer |
|---|---|---|
| 1728×970 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-ADBE.US-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-ADBE.US-drawer.png) |
| 2056×1180 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-ADBE.US-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-ADBE.US-drawer.png) |

### NVDA.US

Price needs cash profits to grow 38.4% a year for ten years · "One thing: relentless AI spending." (finance.yahoo.com, Jul 2025) · sales +65.5%

Q3: omitted; no qualifying source/fact

Q6: "Issues relating to the responsible use of our technologies" (SEC filing, Feb 2026)

| Viewport | Line | Drawer |
|---|---|---|
| 1728×970 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-NVDA.US-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-NVDA.US-drawer.png) |
| 2056×1180 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-NVDA.US-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-NVDA.US-drawer.png) |

### KO.US

Price needs cash profits to grow 14.4% a year for ten years · "Coca Cola (KO) Keeps Raising Its Outlook After Consecutive Earnings Beats" (finance.yahoo.com, Oct 2026) · sales +1.9%

Q3: omitted; no qualifying source/fact

Q6: "We rely on our bottling partners for a significant portion of our business." (SEC filing, Feb 2026)

| Viewport | Line | Drawer |
|---|---|---|
| 1728×970 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-KO.US-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-KO.US-drawer.png) |
| 2056×1180 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-KO.US-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-KO.US-drawer.png) |

### LULU.US

Down 82% since Dec 2023 · "Lululemon’s (LULU) Brand Problems Force Another Steep Guidance Downgrade" (finance.yahoo.com, Sep 2026) · sales +4.9%

Q3: omitted; no qualifying source/fact

Q6: "Changes to U.S. tariff and customs policy" (SEC filing, Mar 2026)

| Viewport | Line | Drawer |
|---|---|---|
| 1728×970 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-LULU.US-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-LULU.US-drawer.png) |
| 2056×1180 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-LULU.US-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-LULU.US-drawer.png) |

### GOOGL.US

Price needs cash profits to grow 22.5% a year for ten years · "Alphabet cloud revenue jumps 82% YoY as AI infrastructure spending doubles" (finance.yahoo.com, Jul 2026) · sales +15.1%

Q3: Kept about a 55% gross margin through 2022 cost inflation.

Q6: "We generate a significant portion of our revenues from advertising." (SEC filing, Feb 2026)

| Viewport | Line | Drawer |
|---|---|---|
| 1728×970 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-GOOGL.US-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-GOOGL.US-drawer.png) |
| 2056×1180 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-GOOGL.US-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-GOOGL.US-drawer.png) |

### 7203.JP

Down 25% since Feb 2026 · "Toyota car sales fall for seventh straight month in Aug on China weakness" (finance.yahoo.com, Sep 2026) · sales +5.5%

Q3: omitted; no qualifying source/fact

Q6: "⑥仕入先への部品・原材料供給の依存" (7203 filing, Jun 2026)

| Viewport | Line | Drawer |
|---|---|---|
| 1728×970 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-7203.JP-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-7203.JP-drawer.png) |
| 2056×1180 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-7203.JP-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-7203.JP-drawer.png) |

### JPM.US

The price assumes profits grow 6.3% a year forever · "JPMorgan Boosts Outlook for Closely Watched Net Interest Income" (finance.yahoo.com, Jul 2026) · net income -2.1%

Q3: omitted; no qualifying source/fact

Q6: "JPMorganChase’s ability to operate its businesses could be impaired if its liquidity is constrained." (SEC filing, Feb 2026)

| Viewport | Line | Drawer |
|---|---|---|
| 1728×970 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-JPM.US-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-JPM.US-drawer.png) |
| 2056×1180 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-JPM.US-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-JPM.US-drawer.png) |

### CBG.LSE

Down 72% since Oct 2021 · "Close Brothers ramps up cost cutting after posting another loss" (uk.finance.yahoo.com, Sep 2026) · net income -177.6%

Q3: omitted; no qualifying source/fact

Q6: "Legal and regulatory risk" (CBG filing, Oct 2025)

| Viewport | Line | Drawer |
|---|---|---|
| 1728×970 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-CBG.LSE-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/1728x970-CBG.LSE-drawer.png) |
| 2056×1180 | [Line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-CBG.LSE-line.png) | [Drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2d/screens/2056x1180-CBG.LSE-drawer.png) |

## Rejected-reason histogram

Counts are candidate/scoring exclusions, not companies; a source can be considered for a main line and dated event separately.

| Kind / reason | Count |
|---|---:|
| price:duplicate-source | 18,731 |
| price:gap-wording | 540 |
| price:long-or-broken-excerpt | 1,236,966 |
| price:no-supported-choice | 1,827 |
| price:other-company-news | 1,398,854 |
| price:score-below-gate | 5,492 |
| price:sentence-fragment | 200,837 |
| price:source-markup | 23,818 |
| price:targets-ratings-sentiment-listicles | 391,593 |
| price:unanchored-cause | 7,886 |
| pricing:gap-wording | 6 |
| pricing:memo-excerpt-too-long | 3,695 |
| pricing:no-supported-choice | 204 |
| pricing:score-below-gate | 100 |
| pricing:sentence-fragment | 1 |
| pricing:subjective-pricing-claim | 1 |
| risk:body-narrative | 25 |
| risk:gap-wording | 26 |
| risk:generic-risk | 1,847 |
| risk:memo-excerpt-too-long | 8,898 |
| risk:score-below-gate | 763 |
| risk:sentence-fragment | 635 |
| risk:targets-ratings-sentiment-listicles | 2 |
| risk:unverified-heading | 40,904 |

## Random line samples

Deterministic random seed `20261003`; 30 per populated line type, or all when fewer than 30 exist. Counts above explicitly distinguish omissions and computed-only lines.

### Price: all lines (30 samples)

| Company | Exact line |
|---|---|
| 004000.KO | Down 50% since Oct 2021 · sales +4.9% |
| TLX.AU | Price AUD 15.16 · "Telix Pharmaceuticals (ASX:TLX) Falls 24% in a Week After FDA Complete Response Letter" (finance.yahoo.com, Sep 2025) |
| 000408.SHE | Down 21% since Apr 2026 · sales +9.3% |
| DWS.XETRA | Price needs cash profits to grow 6.8% a year for ten years · sales +8.8% |
| 600918.SHG | Down 48% since Nov 2021 · net income +53.1% |
| NOC.US | Down 34% since Feb 2026 · "Northrop Grumman Growth Limited by Defense Spending, Margin Risks, RBC Says" (finance.yahoo.com, Oct 2026) · sales +2.2% |
| CBA.AU | The price assumes profits grow 5.7% a year forever · net income +7.4% |
| PNI.AU | Down 48% since Jan 2025 · sales +25.5% |
| 3659.JP | Down 30% since Dec 2025 · sales +6.5% |
| TYL.US | Down 49% since Nov 2024 · "Tyler Technologies forecasts downbeat annual revenue on slower software spending" (finance.yahoo.com, Feb 2026) · sales +9.1% |
| GLE.PA | The price assumes profits grow 7% a year forever · "Societe Generale targets higher profits and cost cuts in 2029 outlook" (finance.yahoo.com, Sep 2026) · net income +42.9% |
| PDI.AU | Up 334% since Oct 2023 · sales +1170.6% |
| CLARI.PA | Down 89% since Oct 2021 · sales +0.5% |
| 047040.KO | Down 50% since Apr 2026 · sales -23.3% |
| 002236.SHE | Down 38% since Nov 2021 · sales +1.7% |
| MLM.US | Down 29% since Feb 2026 · "Martin Marietta Pricing Gains Drive Margin Strength, Sales Outlook Trimmed" (finance.yahoo.com, Aug 2025) · sales +0.1% |
| G.MI | Up 121% since Oct 2023 · net income +12% |
| 5714.JP | Down 25% since Feb 2026 · sales +9.8% |
| VIG.VI | The price assumes profits grow 6.8% a year forever · net income +33.3% |
| 600015.SHG | Down 22% since Dec 2024 · net income -1.7% |
| TXN.US | Up 107% since Oct 2023 · "Texas Instruments Q1 2026 earnings beat on AI data center demand" (finance.yahoo.com, Apr 2026) · sales +13% |
| OSB.LSE | Down 23% since Dec 2025 · sales -9.2% |
| 078930.KO | Up 170% since Oct 2023 · sales -0.3% |
| AKE.PA | Down 59% since Jan 2022 · "Coating Solutions EBITDA: EUR 58 million, impacted by low cycle conditions." (finance.yahoo.com, May 2025) · sales -5% |
| SBMO.AS | Price needs cash profits to grow 2.7% a year for ten years · "SBM Offshore’s Longtail FPSO Win Extends Guyana Growth And Investor Story" (finance.yahoo.com, Apr 2026) · sales +28.4% |
| NDA.XETRA | Down 28% since May 2026 · sales +6% |
| 600926.SHG | The price assumes profits shrink 3.8% a year forever · net income +12.1% |
| ALSYDB.CO | The price assumes profits grow 7% a year forever · net income -31.5% |
| CNU.AU | Down 25% since Aug 2025 · sales +8.2% |
| ECHO.US | Down 27% since May 2026 · sales -5.2% |

### Price: computed (30 samples)

| Company | Exact line |
|---|---|
| INVE-B.ST | The price assumes assets grow 11.5% yearly for ten years · sales +28.4% |
| 6724.JP | Price needs cash profits to grow 13.9% a year for ten years · sales +3.7% |
| 002236.SHE | Down 38% since Nov 2021 · sales +1.7% |
| 600176.SHG | Down 46% since Jun 2026 · sales +18.5% |
| 300498.SHE | Down 37% since Jul 2022 · sales -0.9% |
| CPR.MI | Down 53% since Nov 2021 · sales -0.6% |
| UNI.MC | The price assumes profits grow 9% a year forever · net income +10.2% |
| LPP.WAR | Price needs cash profits to grow 31.5% a year for ten years · sales +14.4% |
| ONGC.NSE | Down 33% since Jul 2024 · sales -0.6% |
| 002352.SHE | Down 55% since Dec 2021 · sales +8.4% |
| 6178.JP | The price assumes profits grow 7.9% a year forever · net income +1.1% |
| BBAJIOO.MX | Down 25% since Jan 2023 · net income -15.1% |
| 7741.JP | Price needs cash profits to grow 16.1% a year for ten years · sales +9.4% |
| 002049.SHE | Down 75% since Nov 2021 · sales -27.3% |
| TECHM.NSE | Up 35% since Oct 2023 · sales +7.2% |
| 300957.SHE | Down 86% since Oct 2021 · sales -6.6% |
| 024110.KO | Down 22% since Feb 2026 · net income +2.5% |
| LAGR-B.ST | Price needs cash profits to grow 18% a year for ten years · sales +13% |
| SIQ.AU | Price needs cash profits to grow 7% a year for ten years · sales +7.7% |
| 6361.JP | Down 25% since Jun 2026 · sales +10.6% |
| GCARSOA1.MX | Down 27% since Dec 2023 · sales -3.2% |
| MCY.AU | Price needs cash profits to grow 49% a year for ten years · sales -7.9% |
| PHM.US | Price needs cash profits to shrink 0.4% a year for ten years · sales -3.5% |
| SGP.AU | Down 35% since Oct 2025 · sales +14.6% |
| 601600.SHG | Down 37% since Jan 2026 · sales +1.4% |
| 601865.SHG | Down 84% since Dec 2021 · sales -16.9% |
| BFT.WAR | Price needs cash profits to grow 33.8% a year for ten years · sales +33.1% |
| 4385.JP | Down 49% since Nov 2021 · sales +19% |
| PETS.LSE | Down 56% since Oct 2021 · sales -0.8% |
| 111770.KO | Down 31% since Feb 2026 · sales +15.5% |

### Price: move or bank/NAV needs (30 samples)

| Company | Exact line |
|---|---|
| HGH.AU | Down 58% since Dec 2021 · net income +140% |
| POWERGRID.NSE | Down 28% since Sep 2024 · sales +2.1% |
| 6618.HK | Down 51% since Dec 2022 · sales +26.3% |
| H4W.F | Down 28% since Feb 2026 · sales -4.4% |
| ATE.PA | Down 50% since Dec 2021 · sales -1.1% |
| HESAY.US | Down 49% since Feb 2025 · "Hermès Stock Tumbles as Birkin Bag Maker Flags Slowdown" (finance.yahoo.com, Apr 2026) · sales +5.5% |
| CRM.US | Down 31% since Jan 2025 · "Salesforce earnings beat, but Q3 sales outlook disappoints" (finance.yahoo.com, Sep 2025) · sales +9.6% |
| AKZA.AS | Down 43% since Oct 2021 · "Akzo Nobel Flags Flat Earnings Outlook as Shares Drop 4.9%" (finance.yahoo.com, Feb 2026) · sales -5.2% |
| 600754.SHG | Down 71% since Mar 2023 · sales -2.2% |
| 0175.HK | Down 46% since Oct 2021 · "Geely’s HY profit falls amid intense local competition; shares decline" (investing.com, Aug 2025) · sales +25.1% |
| 2890.TW | The price assumes profits grow 8.2% a year forever · net income +19.5% |
| ADP.US | Down 21% since May 2025 · "ADP Earnings Beat as Client Funds Income Powers Stronger FY27 Outlook" (finance.yahoo.com, Aug 2026) · sales +6.7% |
| ROVI.MC | Down 36% since Jul 2024 · sales -2.7% |
| 000776.SHE | Up 34% since Oct 2023 · sales -6.9% |
| GTK.AU | Down 77% since Nov 2024 · sales -26.1% |
| 006650.KO | Down 52% since Feb 2026 · sales +19.6% |
| BRG.AU | Down 22% since Jan 2025 · sales +6.7% |
| CLNX.MC | Down 57% since Oct 2021 · "Cellnex Net Loss Widens on Layoff Costs" (finance.yahoo.com, May 2025) · sales +8.6% |
| 3405.JP | Down 22% since Jan 2025 · sales -2.2% |
| WST.US | Down 22% since Dec 2021 · "However, pricing headwinds and tariff risks are concerning." (finance.yahoo.com, Jan 2026) · sales +6.3% |
| 026960.KO | Up 60% since Oct 2023 · sales +9% |
| PZU.WAR | The price assumes profits grow 1.4% a year forever · net income +25.4% |
| WDS.AU | Down 9% since Oct 2023 · "JKM and TTF price markers and lower volumes due to NWS natural field decline." (SEC filing, Feb 2026) · sales -1.5% |
| WYNN.US | Down 41% since Nov 2025 · "WYNN Q4 Deep Dive: Margin Pressures and International Expansion Shape Outlook" (finance.yahoo.com, Feb 2026) · sales +0.1% |
| COLO-B.CO | Down 64% since Dec 2021 · "Organic Growth: 6% in Q2, revised annual expectation to 7% from 8%-9%." (finance.yahoo.com, May 2025) · sales +3.1% |
| IOS.DU | Price EUR 32.18 |
| RIGD.LSE | Down 7% since Aug 2026 · sales +9.6% |
| DIM.PA | Down 60% since Nov 2021 · sales +6.7% |
| 3697.JP | Down 63% since Dec 2023 · sales +17.3% |
| A5G.IR | The price assumes profits grow 8.6% a year forever · net income -9% |

### Q3: computed (30 samples)

| Company | Exact line |
|---|---|
| 002179.SHE | Kept about a 35% gross margin through 2022 cost inflation. |
| FSG.LSE | Kept about a 94% gross margin through 2022 cost inflation. |
| 081660.KO | Kept about a 48% gross margin through 2022 cost inflation. |
| AZZA3.SA | Kept about a 54% gross margin through 2022 cost inflation. |
| SPK.AU | Kept about a 52% gross margin through 2022 cost inflation. |
| ALFA.LSE | Kept about a 61% gross margin through 2022 cost inflation. |
| MC.PA | Kept about a 68% gross margin through 2022 cost inflation. |
| BOSS.XETRA | Kept about a 62% gross margin through 2022 cost inflation. |
| 9432.JP | Kept about a 79% gross margin through 2022 cost inflation. |
| ORLY.US | Kept about a 51% gross margin through 2022 cost inflation. |
| SLR.MC | Kept about a 99% gross margin through 2022 cost inflation. |
| 5631.JP | Kept about a 22% gross margin through 2022 cost inflation. |
| CKN.LSE | Kept about a 96% gross margin through 2022 cost inflation. |
| 002074.SHE | Kept about a 16% gross margin through 2022 cost inflation. |
| MMT.PA | Kept about a 52% gross margin through 2022 cost inflation. |
| STZ.US | Kept about a 52% gross margin through 2022 cost inflation. |
| VCT.LSE | Kept about a 51% gross margin through 2022 cost inflation. |
| 2503.JP | Kept about a 46% gross margin through 2022 cost inflation. |
| 600941.SHG | Kept about a 28% gross margin through 2022 cost inflation. |
| AAF.LSE | Kept about a 69% gross margin through 2022 cost inflation. |
| 300957.SHE | Kept about a 75% gross margin through 2022 cost inflation. |
| TRST.LSE | Kept about a 82% gross margin through 2022 cost inflation. |
| KOFUBL.MX | Kept about a 44% gross margin through 2022 cost inflation. |
| AKE.PA | Kept about a 22% gross margin through 2022 cost inflation. |
| 1099.HK | Kept about a 9% gross margin through 2022 cost inflation. |
| BN.TO | Kept about a 15% gross margin through 2022 cost inflation. |
| GBF.XETRA | Kept about a 10% gross margin through 2022 cost inflation. |
| HO.PA | Kept about a 25% gross margin through 2022 cost inflation. |
| BIMBOA.MX | Kept about a 52% gross margin through 2022 cost inflation. |
| ALK-B.CO | Kept about a 62% gross margin through 2022 cost inflation. |

### Price: ten-year needs (30 samples)

| Company | Exact line |
|---|---|
| ANDR.VI | Price needs cash profits to grow 3.7% a year for ten years · sales -5.2% |
| FOX.US | Price needs cash profits to grow 2.3% a year for ten years · "Advertising Revenue: 65% growth, driven by the Super Bowl and Tubi." (finance.yahoo.com, May 2025) · sales +5.1% |
| DSCV.LSE | Price needs cash profits to grow 6.3% a year for ten years · sales +4.8% |
| 9433.JP | Price needs cash profits to grow 5.3% a year for ten years · sales +4.1% |
| FFIV.US | Price needs cash profits to grow 29.6% a year for ten years · "AI Security, Institutional Inflows Push F5 Shares Up 75% YTD" (finance.yahoo.com, Sep 2026) · sales +9.7% |
| 9602.JP | Price needs cash profits to grow 11.2% a year for ten years · sales +15.2% |
| 6098.JP | Price needs cash profits to grow 25.5% a year for ten years · sales +3.9% |
| REC.MI | Price needs cash profits to grow 10.7% a year for ten years · sales +11.8% |
| 1303.TW | Price needs cash profits to grow 31.4% a year for ten years · sales +0.1% |
| GOOGL.US | Price needs cash profits to grow 22.5% a year for ten years · "Alphabet cloud revenue jumps 82% YoY as AI infrastructure spending doubles" (finance.yahoo.com, Jul 2026) · sales +15.1% |
| BGA.AU | Price needs cash profits to grow 46.5% a year for ten years · sales +6.3% |
| 021240.KO | Price needs cash profits to shrink 1.6% a year for ten years · sales +15.2% |
| TTE.PA | Price needs cash profits to grow 5.5% a year for ten years · "TotalEnergies to Cut Costs While Boosting Oil, Gas Output Through 2030" (finance.yahoo.com, Sep 2025) · sales -6.8% |
| FII.PA | Price needs cash profits to grow 18.1% a year for ten years · sales -2.6% |
| 2059.TW | Price needs cash profits to grow 42.8% a year for ten years · sales +72.8% |
| BLK.US | Price needs cash profits to grow 13% a year for ten years · "BlackRock's Surge in Crypto: Bitcoin ETFs Now Its Top Revenue Driver" (finance.yahoo.com, Dec 2025) · sales +18.7% |
| OCBA.F | Price needs cash profits to grow 2.2% a year for ten years · sales +0.7% |
| CDR.WAR | Price needs cash profits to grow 21.8% a year for ten years · sales -12% |
| 3008.TW | Price needs cash profits to grow 15% a year for ten years · sales +2.8% |
| 600803.SHG | Price needs cash profits to grow 18.3% a year for ten years · sales -3.4% |
| EVN.VI | Price needs cash profits to grow 31.8% a year for ten years · sales +3.8% |
| CDA.AU | Price needs cash profits to grow 31.7% a year for ten years · sales +29.8% |
| SCHP.SW | Price needs cash profits to grow 8.8% a year for ten years · "Schindler forecasts modest 2026 revenue growth amid China pressure" (finance.yahoo.com, Feb 2026) · sales -2.6% |
| 9434.JP | Price needs cash profits to grow 4.3% a year for ten years · sales +7.6% |
| 6326.JP | Price needs cash profits to grow 9.9% a year for ten years · sales +0.1% |
| 007340.KO | Price needs cash profits to shrink 3.8% a year for ten years · sales +7% |
| SON.LS | Price needs cash profits to grow 43.6% a year for ten years · sales +14.2% |
| ISAE3.SA | Price needs cash profits to grow 6% a year for ten years · sales +18.1% |
| NBIS.US | Price needs cash profits to grow 83% a year for ten years · "Nebius Stock Jumps on $27B Meta AI Infrastructure Agreement" (finance.yahoo.com, Mar 2026) · sales +350.9% |
| BWP.AU | Price needs cash profits to grow 6.6% a year for ten years · sales +3.3% |

### Price: literal (30 samples)

| Company | Exact line |
|---|---|
| IBM.US | Down 28% since Nov 2025 · "IBM forecasts preliminary Q2 revenue below estimates as spending shifts to AI" (finance.yahoo.com, Jul 2026) · sales +7.6% |
| MSFT.US | Price needs cash profits to grow 19.5% a year for ten years · "Microsoft’s new OpenAI deal strengthens long-term Azure growth outlook" (finance.yahoo.com, Oct 2025) · sales +17.8% |
| TGT.US | Down 40% since Oct 2021 · "Tariff-related uncertainty, consumer boycotts, and weak demand for discretionary hurt the retailer’s first quarter." (finance.yahoo.com, May 2025) · sales -1.7% |
| MRO.LSE | Down 30% since Mar 2024 · "Melrose shares fall 3.5% as Garden Grove incident drives £30m exceptional cost outlook" (finance.yahoo.com, Jul 2026) · sales +3.5% |
| COLO-B.CO | Down 64% since Dec 2021 · "Organic Growth: 6% in Q2, revised annual expectation to 7% from 8%-9%." (finance.yahoo.com, May 2025) · sales +3.1% |
| VTY.LSE | Down 83% since Jul 2024 · "Vistry Shares Sink 11.5% After Buyback Halt And Profit Warning" (finance.yahoo.com, May 2026) · sales -4.4% |
| PEP.US | Down 34% since Apr 2023 · "PepsiCo shares slip as Bloomberg reports retreat from snack price cuts" (finance.yahoo.com, Sep 2026) · sales +2.3% |
| HLN.LSE | Down 21% since May 2025 · "Haleon Shares Fall on Cut to Organic Revenue Guidance" (finance.yahoo.com, Jul 2025) · sales -1.8% |
| UMG.AS | Down 50% since May 2024 · "Universal Music Logs Slower Subscriptions and Streaming Growth" (finance.yahoo.com, Oct 2025) · sales +5.7% |
| 1299.HK | Down 23% since Jan 2026 · "AIA's new business value climbs in first quarter on strong Hong Kong, China demand" (finance.yahoo.com, Apr 2026) · sales +26.7% |
| QCOM.US | Down 26% since May 2026 · "Management itself expects the revenue through Apple products to decline sharply." (finance.yahoo.com, Jul 2026) · sales +13.7% |
| ASM.AS | Price needs cash profits to grow 25.9% a year for ten years · "ASM International’s Record Margin Highlights AI Driven Growth And Key Risks" (finance.yahoo.com, Apr 2026) · sales +8.2% |
| ICE.US | Price needs cash profits to grow 8.1% a year for ten years · "ICE Q2 Earnings Beat on Data Growth and Mortgage Strength" (finance.yahoo.com, Jul 2026) · sales +7.5% |
| SAN.PA | Down 32% since Jan 2025 · "Sanofi Ends Late-Stage Study on Neurology Drug Over Weak Results" (finance.yahoo.com, Jun 2026) · sales +5.5% |
| HAL.US | Down 25% since Apr 2026 · "Halliburton tops Q2 earnings estimates as CEO warns of softer oilfield services market" (finance.yahoo.com, Jul 2026) · sales -3.3% |
| WYNN.US | Down 41% since Nov 2025 · "WYNN Q4 Deep Dive: Margin Pressures and International Expansion Shape Outlook" (finance.yahoo.com, Feb 2026) · sales +0.1% |
| TD.TO | The price assumes profits grow 5.7% a year forever · "Toronto-Dominion Bank Plans to Slash Costs With AI, Revives Medium-Term Growth Targets" (finance.yahoo.com, Sep 2025) · net income +140.2% |
| MNST.US | Up 68% since Oct 2023 · "Monster Beverage (MNST) Valuation Check as Coca-Cola Partnership and Strong Western Sales Lift Optimism" (finance.yahoo.com, Dec 2025) · sales +10.7% |
| UBER.US | Down 30% since Sep 2025 · "Uber Cuts 10% of its Workforce to Fund a $10 Billion Robotaxi Bet" (finance.yahoo.com, Sep 2026) · sales +18.3% |
| SBAC.US | Down 59% since Dec 2021 · "SBA Communications (SBAC) Slid on Slower 5G Deployment" (finance.yahoo.com, Oct 2025) · sales +5.1% |
| META.US | Up 142% since Oct 2023 · "Meta Platforms Boosts Ad Engagement With AI: More Upside Ahead?" (finance.yahoo.com, Sep 2026) · sales +22.2% |
| GILD.US | Up 84% since Oct 2023 · "Gilead Sciences, Inc. (GILD) Wins FDA Approval for World’s First Twice-Yearly HIV Preventive Therapy" (finance.yahoo.com, Sep 2025) · sales +2.4% |
| UHS.US | Down 28% since Nov 2025 · "Universal Health Services Stock Sinks as CFO Says Post-Covid Care Recovery Has Slowed" (finance.yahoo.com, Jun 2025) · sales +9.7% |
| BOSS.XETRA | Down 48% since Jul 2023 · "Hugo Boss Expects Lower Sales, Earnings in Next Stage of Transformation Plan" (finance.yahoo.com, Mar 2026) · sales -0.9% |
| TIETO.HE | Down 39% since Feb 2023 · "Non-Cash Impairment: EUR80 million related to the banking platform in Norway." (finance.yahoo.com, Jul 2025) · sales -1.4% |
| IVZ.US | Up 136% since Oct 2023 · "Invesco stock gains as Barclays sees QQQ reclassification boosting revenue" (investing.com, Jul 2025) · sales +5.1% |
| HESAY.US | Down 49% since Feb 2025 · "Hermès Stock Tumbles as Birkin Bag Maker Flags Slowdown" (finance.yahoo.com, Apr 2026) · sales +5.5% |
| DOW.US | Down 59% since May 2022 · "Citi cautious on Dow and LyondellBasell: demand weakness caps polyethylene upside" (finance.yahoo.com, Sep 2026) · sales -7% |
| ADP.US | Down 21% since May 2025 · "ADP Earnings Beat as Client Funds Income Powers Stronger FY27 Outlook" (finance.yahoo.com, Aug 2026) · sales +6.7% |
| SWK.US | Down 52% since Dec 2021 · "However, softness in the DIY market and depressing demand for power tools remain concerning." (finance.yahoo.com, Apr 2025) · sales -1.5% |

### Q6: literal (30 samples)

| Company | Exact line |
|---|---|
| QCOM.US | "Failures in our products, or in the products of our customers or licensees" (SEC filing, Nov 2025) |
| KLAC.US | "We are exposed to risks associated with a highly concentrated customer base." (SEC filing, Aug 2026) |
| HSY.US | "Market demand for new and existing products could decline." (SEC filing, Feb 2026) |
| VRTX.US | "Our business is substantially dependent on the success of our CF medicines." (SEC filing, Feb 2026) |
| STT.US | "Fee revenue represents a significant majority of our consolidated revenue" (SEC filing, Feb 2026) |
| FITB.US | "Deteriorating credit quality has adversely impacted Fifth Third in the past" (SEC filing, Feb 2026) |
| DOC.US | "Our level of indebtedness may increase and materially adversely affect our future operations." (SEC filing, Feb 2026) |
| SYK.US | "MARKET RISKS" (SEC filing, Feb 2026) |
| HBAN.US | "Our emphasis on commercial lending may expose us to increased lending risks." (SEC filing, Feb 2026) |
| BIIB.US | "We are substantially dependent on revenue from our products." (SEC filing, Feb 2026) |
| FERG.US | "The Company’s strategy could be materially adversely affected by its indebtedness." (SEC filing, Sep 2023) |
| MRK.XETRA | "The Company is dependent on its patent rights" (SEC filing, Feb 2026) |
| MSFT.US | "We may have additional tax liabilities." (SEC filing, Jul 2026) |
| CVS.US | "We may not be able to accurately forecast health care and other benefit costs" (SEC filing, Feb 2026) |
| UHS.US | "Our performance depends on our ability to recruit and retain quality physicians." (SEC filing, Feb 2026) |
| HIG.US | "Insurance Industry and Product Related Risks" (SEC filing, Feb 2026) |
| PFE.US | "CONCENTRATION" (SEC filing, Feb 2026) |
| ABT.US | "Abbott will incur additional indebtedness in connection with the Exact Sciences acquisition" (SEC filing, Feb 2026) |
| APTV.US | "The cyclical nature of automotive sales and production can adversely affect our business." (SEC filing, Feb 2026) |
| 9735.JP | "①メディカルサービス事業におけるリスク" (9735 filing, Jun 2026) |
| FSLR.US | "Our failure to effectively manage module manufacturing and related costs" (SEC filing, Feb 2026) |
| MTD.US | "Financial Risks" (SEC filing, Feb 2026) |
| LNT.US | "Our utility business is significantly impacted by government legislation, regulation and oversight" (SEC filing, Feb 2026) |
| CHRW.US | "Our sourcing business is dependent upon the supply and price of fresh produce." (SEC filing, Feb 2026) |
| ED.US | "The Utilities’ Rate Plans May Not Provide A Reasonable Return." (SEC filing, Feb 2026) |
| RDDT.US | "We generate a majority of our revenue from advertising." (SEC filing, Feb 2026) |
| AMCR.US | "Key Customers and Customer Consolidation" (SEC filing, Aug 2026) |
| NXPI.US | "Our business has suffered, and could in the future suffer, from manufacturing problems." (SEC filing, Feb 2026) |
| CIEN.US | "We may experience difficulties in the development and production of our products" (SEC filing, Dec 2025) |
| KHC.US | "Commodity, energy, and other input prices are volatile" (SEC filing, Feb 2026) |

### Q3: literal (19 samples)

| Company | Exact line |
|---|---|
| IMB.LSE | "Tobacco price mix was strong at +5.4% due to strong pricing." (IMB filing, Feb 2026) |
| CTAS.US | "Revenue improved from increases in sales representative productivity and price increases." (SEC filing, Jul 2026) |
| DOV.US | "Customer pricing favorably impacted revenue in 2025 by approximately 3.1%." (SEC filing, Feb 2026) |
| FDX.US | "On January 5, 2026, a 5.9% average list price increase was implemented for services." (SEC filing, Jul 2026) |
| LIN.US | "Higher pricing contributed 3% to sales." (SEC filing, Feb 2026) |
| MLM.US | "Aggregates pricing continued to improve, increasing 6.9% year over year." (SEC filing, Feb 2026) |
| WDC.US | "The increase in ASPs per exabyte was due to an improved pricing environment." (SEC filing, Aug 2026) |
| CSX.US | "These decreases were partially offset by pricing gains in merchandise and higher intermodal volume." (SEC filing, Feb 2026) |
| SBSP3.SA | "This tariff adjustment became effective on January 1, 2026." (SEC filing, Apr 2026) |
| PKG.US | "Packaging prices and mix reflected our 2025 price increases for containerboard and corrugated products." (SEC filing, Feb 2026) |
| FTV.US | "Sales growth in 2025 was driven by favorable pricing of 2.2%." (SEC filing, Feb 2026) |
| TATE.LSE | "Revenue decreased by 5%, with pricing lower and volume broadly flat." (TATE filing, Jun 2026) |
| HWM.US | "Product price increases are in excess of inflationary cost pass through to our customers." (SEC filing, Feb 2026) |
| MKC-V.US | "Pricing actions favorably impacted sales by 0.7%." (SEC filing, Jan 2026) |
| MOWI.OL | "Consequently, feed sales prices were reduced during 2024 in line with industry cost-plus pricing." (MOWI filing, May 2025) |
| CINF.US | "Our 6% increase in 2025 agency renewal written premiums included higher average pricing." (SEC filing, Feb 2026) |
| TXT.US | "The increase in revenues reflected higher pricing, partially offset by lower volume and mix." (SEC filing, Feb 2026) |
| PEP.US | "Net revenue increased 2%, primarily reflecting effective net pricing." (SEC filing, Feb 2026) |
| VMC.US | "Shipments decreased 1%, and pricing increased 2.3%, or $1.84 per ton." (SEC filing, Feb 2026) |

## Every changed repository file

- `components/value/PriceStory.module.css` — Fit the story drawer and its line at all four sizes using fixed width, local columns and viewport-scaled type.
- `components/value/PriceStoryPanel.tsx` — Use the story-owned layout and make the existing lease/tax basis explicit on computed flags.
- `lib/value/price-story/compose.ts` — Permit only complete literal first-clause trims and reject dangling fragments.
- `lib/value/price-story/corpus.ts` — Load recovered/hash-bound filing headings and the verified Toyota news alias.
- `lib/value/price-story/publication.ts` — Carry optional per-kind and event cache hashes/versions into normal publication records.
- `lib/value/price-story/selection.ts` — Select/score literal sources with strict heading provenance, issuer matching, exclusions, bounded tournaments and supporting risk exposure.
- `scripts/value/stages/price-story.ts` — Reuse independently unchanged selections safely, revalidate cached quotes/events, and force fresh selection for weekly movers.
- `scripts/value/story-risk-headings.ts` — Recover exact heading offsets from original SEC filing markup with gzip storage and disk guards.
- `scripts/value/consistency-audit.ts` — Honor the explicitly authorized free-disk floor while retaining the default.
- `scripts/value/release-gate.mjs` — Honor the explicitly authorized free-disk floor without relaxing visual checks.
- `scripts/value/story-2-qa.mjs` — Honor the explicitly authorized free-disk floor for the required screenshot run.
- `tests/unit/value/selected-sources.test.ts` — Regress literal boundaries, verified headings, issuer/advice filtering, bounded choice/score calls, risk support and weekly-mover refresh.
- `.superpowers/sdd/2026-09-29-value/story-2d-labels.json` — Record the forty manual candidate-hash-bound reviews, accepted source IDs and known misses.
- `.superpowers/sdd/2026-09-29-value/story-2d-report.md` — Record final coverage, samples, calibration, verification, screenshots, scope and disk incident.
- `/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/story-2d-report.md` — Identical report at the explicitly requested sibling location; no sibling application code changed.

Retained generated/local files are enumerated with hashes and one-line purposes in the artifact manifest. The normal local snapshot, compressed source/candidate caches, selection records, quota ledger, final logs and screenshot evidence remain available. `.next` is reusable build output only. Earlier resumes’ `.story-2b/` and `.story-2c/` files were left untouched.
