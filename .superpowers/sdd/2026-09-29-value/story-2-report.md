# Story 2 — local implementation, acceptance gates failed

**Not release-ready.** The implementation is committed locally, but the requested >=90% calibration and zero-failure release gate were not achieved. No push, deploy, remote publish, subagents or text-generation model were used. The new lines use literal source selections and computed numbers only. Existing unrelated memo questions were not reauthored.

## Coverage and blockers

Current store: **2,708 unique dossiers**. The original baseline has 2,709 IDs; `NWS.US` is now aliased to `NWS.AU`, so it is not a missing newly created story. The publisher log counts 2,714 input analyses, not 2,714 public dossiers.

All news fetch attempts stopped at the existing local EODHD budget guard (100,000 reserved calls). A read-only provider check during the run reported 99,739 used / 100,000 daily, with 400 extra; the shared ledger was not reset or bypassed. No news cache existed. Thus there are **zero accepted quoted price lines and zero headline events**. The requested 3–6 event annotations per company are not delivered. Retained filing extraction cannot compensate for missing news. Only 20 complete annual filing documents were retained; other corpus windows can be truncated, which especially limits risk-heading extraction.

| Published line type | Count | % of 2,708 |
|---|---:|---:|
| Price: all computed lines | 2708 | 100.00% |
| Price: move or existing bank/NAV needs | 2031 | 75.00% |
| Q3: computed | 590 | 21.79% |
| Price: ten-year needs | 677 | 25.00% |
| Q3: literal | 6 | 0.22% |
| Price: literal quote | 0 | 0.00% |
| Q6: literal | 0 | 0.00% |

Private selections before the publication gates: `{'price': 0, 'risk': 41, 'pricing': 25}`. News outcomes: `{'budget-exhausted': 2708}`. Q3 omitted when no literal sentence passes the length/source gate and no valid 2021–23 gross-margin fallback exists. Q6 is omitted while its calibration gate is closed. No gap wording is substituted.

## Calibration

Forty companies were reviewed manually by the coding agent, including all seven named tickers and Close Brothers (`CBG.LSE`) as the non-US small cap. These are **not independent human gold labels**. Review IDs, exact candidate hashes, notes and source text/date/URL are in [story-2-labels.json](story-2-labels.json). A missing selected main driver counts as a failure, not a correct abstention.

| Type | Accepted selection / 40 | Accuracy | Required |
|---|---:|---:|---:|
| Price main driver | 0/40 | 0.0% | >=90% |
| Risk heading | 1/40 | 2.5% | >=90% |

Coca-Cola bottler concentration was accepted as a specific material exposure; its literal heading is too long for the 18-word memo. Lululemon’s US tariff/de-minimis heading was labelled acceptable but the model abstained, earning no success credit. Generic Exxon Supply and Demand was rejected during review. Both publication calibration gates remain closed. No threshold was lowered to claim success.

## Implementation and limits

- News candidates use `/api/news?s=TICKER`, an 18-month range and pagination, retaining titles and first-paragraph sentences. Filing candidates use retained MD&A/earnings sentences and anchored risk sections. Jev uses choice and bounded score questions only, plus a choice direction for Q3.
- Price lines are <=30 words; quotes are whole literal strings <=14 words, with source and month/year. An overlong quote is omitted whole. Premium needs reuse the existing valuation and FX. Bank/NAV models retain their own existing horizon rather than claiming a ten-year owner-earnings model.
- The new full-height drawer reuses MiniPrice and the unchanged SidePanel. It shows the same published financial series and existing computed flags. Dated event rendering is implemented but has no accepted live news events in this run.
- Q3 fallback requires all three actual 2021–23 gross-margin observations and a range <=2 percentage points. The last review removed a leading percentage fragment and an unsupported subjective pricing claim through the reader and normal publisher.
- Nightly selection schedules up to 400 stale companies plus >10% weekly movers. Weekly moves use a retained 6–8-day quote comparison. The first snapshot has no historical weekly comparison, so zero movers were detected on this cold start; a backfilled weekly comparison remains outstanding.
- The runner stage precedes residual fundamentals, and publish loads its records directly. Snapshot generation used `publish --out=.story-2/store --overwrite`; no postprocessing or remote publication.
- Full prerender builds exceeded the reserved local build allocation and were stopped. The complete app passed webpack compile mode and generate-env with all output in `.next`; this is not a successful full prerender build.

## Verification

- Focused tests: **123 passed in five files** (selected sources, owner memo, memo consistency, publish, ops integration). The new fragment regression was observed failing before the fix.
- TypeScript: `tsc --noEmit --incremental false` passed. Final subsequent selection edits are regex-only and the focused tests passed.
- Whole-store consistency: **2,708 dossiers, 13,145 quality rules, 1,970 IRR checks, 41 cash-covered cases; zero failures**.
- Browser consistency: ADBE, NVDA, KO, LULU, GOOGL, 7203.JP, JPM and CBG: **8/8 passed, zero failures**.
- Requested screenshot harness: **16 company/viewport pairs, 32 PNGs, zero page-scroll/full-height/JavaScript errors**. All 32 were opened in contact sheets; drawer content inspected. This narrow result does not override the release-gate failures.
- Shared chrome: all protected files found by path inspection are byte-identical; see `.story-2/protected-files.json`. The full UI diff was read. No SidePanel.tsx, side-panel.css, search, bottom bar, filter or time slider edits.
- No deployment was requested or performed; the live-vs-candidate predeployment change-review was not run. This is a local failed acceptance checkpoint.

### Four-viewport release gate

The unmodified release gate ran home, 2018Q3, 2011, LULU, WKL, ADBE, GOOGL, KO, JPM, Toyota, Reliance, CBG and NVDA, including existing drawers, filters and search, plus Price story. Its raster threshold is 15%; the binding contract is stricter at <8%. Passing that script would not itself establish <8%.

| Viewport | States | Failed | Report |
|---|---:|---:|---|
| 1440x800 | 157 | 38 | [JSON](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/release-1440x800/report.json) |
| 1728x970 | 157 | 38 | [JSON](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/release-1728x970/report.json) |
| 2056x1180 | 157 | 39 | [JSON](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/release-2056x1180/report.json) |
| 390x844 | 154 | 36 | [JSON](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/release-390x844/report.json) |

**Zero-failure release requirement: FAILED.** Price-story drawers still fail measured whitespace in multiple states. The unchanged search popover is also flagged for not being full-height and excess empty area; other baseline drawers can fail density. Shared chrome was left intact under the scope lock. Full issues are preserved in the linked JSON reports.

## Named companies and requested screenshots

Each source line below is the final published computed line. No selected price headline is implied. All drawers currently have zero headline events.

### ADBE.US

Down 64% since Nov 2021 · sales +10.5%

Drawer needs: Price needs cash profits to grow 7.2% a year for ten years. Filing facts: sales +10.5%; gross margin 89.3%.

- 1728×970: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-ADBE.US-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-ADBE.US-drawer.png)
- 2056×1180: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-ADBE.US-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-ADBE.US-drawer.png)

### NVDA.US

Price needs cash profits to grow 38.2% a year for ten years · sales +65.5%

Drawer needs: Price needs cash profits to grow 38.2% a year for ten years. Filing facts: sales +65.5%; gross margin 71.1%.

- 1728×970: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-NVDA.US-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-NVDA.US-drawer.png)
- 2056×1180: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-NVDA.US-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-NVDA.US-drawer.png)

### KO.US

Price needs cash profits to grow 14.4% a year for ten years · sales +1.9%

Drawer needs: Price needs cash profits to grow 14.4% a year for ten years. Filing facts: sales +1.9%; gross margin 61.6%.

- 1728×970: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-KO.US-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-KO.US-drawer.png)
- 2056×1180: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-KO.US-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-KO.US-drawer.png)

### LULU.US

Down 81% since Dec 2023 · sales +4.9%

Drawer needs: Price needs cash profits to shrink 5.2% a year for ten years. Filing facts: sales +4.9%; gross margin 56.6%.

- 1728×970: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-LULU.US-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-LULU.US-drawer.png)
- 2056×1180: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-LULU.US-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-LULU.US-drawer.png)

### GOOGL.US

Price needs cash profits to grow 22.3% a year for ten years · sales +15.1%

Drawer needs: Price needs cash profits to grow 22.3% a year for ten years. Filing facts: sales +15.1%; gross margin 59.7%.

- 1728×970: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-GOOGL.US-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-GOOGL.US-drawer.png)
- 2056×1180: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-GOOGL.US-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-GOOGL.US-drawer.png)

### 7203.JP

Down 24% since Feb 2026 · sales +5.5%

Drawer needs: Price needs cash profits to grow 0.3% a year for ten years. Filing facts: sales +5.5%; gross margin 16.7%.

- 1728×970: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-7203.JP-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-7203.JP-drawer.png)
- 2056×1180: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-7203.JP-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-7203.JP-drawer.png)

### JPM.US

The price assumes profits grow 6.3% a year forever · net income -2.1%

Drawer needs: The price assumes profits grow 6.3% a year forever. Filing facts: net income -2.1%.

- 1728×970: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-JPM.US-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-JPM.US-drawer.png)
- 2056×1180: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-JPM.US-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-JPM.US-drawer.png)

### CBG.LSE

Down 72% since Oct 2021 · net income -177.6%

Drawer needs: The price assumes profits shrink 23% a year forever. Filing facts: net income -177.6%.

- 1728×970: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-CBG.LSE-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/1728x970-CBG.LSE-drawer.png)
- 2056×1180: [line](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-CBG.LSE-line.png) · [drawer](/Users/miki/GitHub/superinvestors-wt/value-zo-story/.story-2/screens-final/2056x1180-CBG.LSE-drawer.png)

## Rejection-reason histogram

Counts include deterministic candidate rejections and Jev tournament/score decisions; they are not mutually exclusive company counts.

| Type | Reason | Count |
|---|---|---:|
| price | gap-wording | 16 |
| price | long-or-broken-excerpt | 20089 |
| price | no-supported-choice | 542 |
| price | score-below-gate | 217 |
| price | targets-ratings-sentiment-listicles | 5 |
| price | unanchored-cause | 328 |
| pricing | gap-wording | 6 |
| pricing | long-or-broken-excerpt | 1272 |
| pricing | no-supported-choice | 195 |
| pricing | score-below-gate | 326 |
| pricing | sentence-fragment | 1 |
| pricing | subjective-pricing-claim | 1 |
| risk | gap-wording | 6 |
| risk | generic-risk | 432 |
| risk | long-or-broken-excerpt | 691 |
| risk | no-supported-choice | 97 |
| risk | score-below-gate | 467 |
| risk | targets-ratings-sentiment-listicles | 1 |

## Thirty random lines per available type

Deterministic random sample without replacement, seed 20261002 per type. Where fewer than 30 exist, all are shown; no fabricated substitutes. The all-price sample overlaps its subtypes by design.

### Price: all computed lines

2708 total; 30 shown.

- **601919.SHG** — Price needs cash profits to shrink 9.2% a year for ten years · sales -6.6%
- **600809.SHG** — Down 64% since Jun 2022 · sales +7.5%
- **REC.MI** — Price needs cash profits to grow 10.7% a year for ten years · sales +11.8%
- **FMS.US** — Down 34% since Jan 2022 · sales +1.5%
- **HNR1.XETRA** — The price assumes profits grow 7.1% a year forever · net income +13.4%
- **EQNR.OL** — Up 7% since Oct 2023 · sales +3.2%
- **300124.SHE** — Down 38% since Sep 2025 · sales +21.8%
- **WM.US** — Price needs cash profits to grow 14.9% a year for ten years · sales +14.2%
- **NOS.LS** — Price needs cash profits to grow 8.7% a year for ten years · sales +7.5%
- **CTC-A.TO** — Price needs cash profits to grow 14.3% a year for ten years · sales -0.3%
- **BME.LSE** — Down 60% since Dec 2021 · sales +3.7%
- **MND.AU** — Price needs cash profits to grow 20.3% a year for ten years · sales +28.9%
- **TKMS.XETRA** — Price EUR 80
- **TOTS3.SA** — Down 25% since Sep 2025 · sales +10.5%
- **BG.US** — Up 1% since Oct 2023 · sales +32.4%
- **001289.SHE** — Down 44% since Mar 2022 · sales -18.6%
- **LABB.MX** — Down 55% since Jan 2025 · sales -5.7%
- **9999.HK** — Price needs cash profits to grow 2.8% a year for ten years · sales +7%
- **CAI.VI** — Down 42% since Oct 2021 · sales -7.5%
- **GAPB.MX** — Down 25% since Jan 2026 · sales +23.2%
- **PEG.US** — Down 28% since Nov 2024 · sales +18.3%
- **2502.JP** — Down 12% since Oct 2023 · sales -1.5%
- **OUT1V.HE** — Up 32% since Oct 2023 · sales -8%
- **VIRI.PA** — Down 41% since Apr 2026 · sales -11.6%
- **4503.JP** — Price needs cash profits to grow 14.2% a year for ten years · sales +11.9%
- **002049.SHE** — Down 75% since Nov 2021 · sales -27.3%
- **ACA.PA** — The price assumes profits grow 4.2% a year forever · net income +3.8%
- **VTY.LSE** — Down 82% since Jul 2024 · sales -4.4%
- **4004.JP** — Up 556% since Oct 2023 · sales -3.2%
- **600025.SHG** — Price needs cash profits to grow 12.4% a year for ten years · sales +6.9%

### Price: move or existing bank/NAV needs

2031 total; 30 shown.

- **300316.SHE** — Down 53% since Oct 2021 · sales -35.4%
- **KNEBV.HE** — Down 21% since Feb 2026 · sales +1.3%
- **251270.KO** — Down 72% since Dec 2021 · sales +6.4%
- **SJM.US** — Down 27% since Dec 2022 · sales +3.7%
- **TMUS.US** — Down 40% since Feb 2025 · sales +8.5%
- **ENT.LSE** — Down 80% since Oct 2021 · sales +3.3%
- **AMVIF.US** — Price USD 40.64
- **BBAJIOO.MX** — Down 25% since Jan 2023 · net income -15.1%
- **LUV.US** — Up 88% since Oct 2023 · sales +2.1%
- **AIZ.AU** — Down 66% since Oct 2021 · sales +3.8%
- **TIMS3.SA** — Down 35% since Feb 2026 · sales +4.6%
- **047810.KO** — Down 34% since Feb 2026 · sales +1.7%
- **IP.MI** — Down 43% since Dec 2021 · sales -0.4%
- **SZG.XETRA** — Down 22% since May 2026 · sales -10.3%
- **DANSKE.CO** — The price assumes profits grow 7% a year forever · net income -2.5%
- **8354.JP** — The price assumes profits grow 8.6% a year forever · net income +18.4%
- **601995.SHG** — Down 38% since Dec 2021 · net income +71.9%
- **COFA.PA** — The price assumes profits grow 1.7% a year forever · net income -15%
- **HCA.US** — Down 20% since Feb 2026 · sales +7.1%
- **MRVE3.SA** — Down 61% since Jul 2023 · sales +21.4%
- **SKC.AU** — Down 81% since Oct 2021 · sales -7.9%
- **HEI.XETRA** — Down 37% since Jan 2026 · sales +1.2%
- **TAH.AU** — Down 23% since May 2023 · sales -17.6%
- **REA.AU** — Down 39% since Nov 2024 · sales +2.5%
- **NXT.AU** — Down 40% since Mar 2024 · sales +16.2%
- **601877.SHG** — Down 59% since Oct 2021 · sales -8.3%
- **000670.KO** — Down 43% since Nov 2022 · sales +4.4%
- **SPI.LSE** — Up 16% since Oct 2023 · sales +4.5%
- **SPK.AU** — Down 69% since Dec 2022 · sales +0.4%
- **KRZ.IR** — Down 28% since Oct 2021 · sales -2.5%

### Q3: computed

590 total; 30 shown.

- **6861.JP** — Kept about a 82% gross margin through 2022 cost inflation.
- **601698.SHG** — Kept about a 36% gross margin through 2022 cost inflation.
- **VEEV.US** — Kept about a 73% gross margin through 2022 cost inflation.
- **IFF.US** — Kept about a 33% gross margin through 2022 cost inflation.
- **LDOS.US** — Kept about a 14% gross margin through 2022 cost inflation.
- **HLE.XETRA** — Kept about a 23% gross margin through 2022 cost inflation.
- **4307.JP** — Kept about a 35% gross margin through 2022 cost inflation.
- **SNA.US** — Kept about a 51% gross margin through 2022 cost inflation.
- **FGP.LSE** — Kept about a 46% gross margin through 2022 cost inflation.
- **CPR.MI** — Kept about a 59% gross margin through 2022 cost inflation.
- **RNO.PA** — Kept about a 20% gross margin through 2022 cost inflation.
- **COR.LS** — Kept about a 50% gross margin through 2022 cost inflation.
- **001040.KO** — Kept about a 27% gross margin through 2022 cost inflation.
- **OTEX.TO** — Kept about a 70% gross margin through 2022 cost inflation.
- **AMUN.PA** — Kept about a 52% gross margin through 2022 cost inflation.
- **CVX.US** — Kept about a 30% gross margin through 2022 cost inflation.
- **IRM.US** — Kept about a 57% gross margin through 2022 cost inflation.
- **T6W.F** — Kept about a 30% gross margin through 2022 cost inflation.
- **300760.SHE** — Kept about a 64% gross margin through 2022 cost inflation.
- **SUL.AU** — Kept about a 47% gross margin through 2022 cost inflation.
- **600332.SHG** — Kept about a 19% gross margin through 2022 cost inflation.
- **002074.SHE** — Kept about a 16% gross margin through 2022 cost inflation.
- **ARG.PA** — Kept about a 81% gross margin through 2022 cost inflation.
- **600050.SHG** — Kept about a 24% gross margin through 2022 cost inflation.
- **600893.SHG** — Kept about a 10% gross margin through 2022 cost inflation.
- **GFRD.LSE** — Kept about a 7% gross margin through 2022 cost inflation.
- **2768.JP** — Kept about a 13% gross margin through 2022 cost inflation.
- **086280.KO** — Kept about a 9% gross margin through 2022 cost inflation.
- **601766.SHG** — Kept about a 21% gross margin through 2022 cost inflation.
- **PAF.LSE** — Kept about a 32% gross margin through 2022 cost inflation.

### Price: ten-year needs

677 total; 30 shown.

- **9532.JP** — Price needs cash profits to grow 22.5% a year for ten years · sales -1.9%
- **8001.JP** — Price needs cash profits to grow 6.2% a year for ten years · sales +0.7%
- **RUI.PA** — Price needs cash profits to grow 8.6% a year for ten years · sales -1.6%
- **GSK.LSE** — Price needs cash profits to grow 3.9% a year for ten years · sales +4.1%
- **ISAE3.SA** — Price needs cash profits to grow 5.7% a year for ten years · sales +18.1%
- **FSG.LSE** — Price needs cash profits to grow 6.4% a year for ten years · sales +7.1%
- **600803.SHG** — Price needs cash profits to grow 18.3% a year for ten years · sales -3.4%
- **WBD.US** — Price needs cash profits to grow 13.4% a year for ten years · sales -5.1%
- **ORNBV.HE** — Price needs cash profits to grow 13.5% a year for ten years · sales +22.5%
- **ELG.XETRA** — Price needs cash profits to grow 13.1% a year for ten years · sales +0.3%
- **CP.TO** — Price needs cash profits to grow 14.2% a year for ten years · sales +3.7%
- **NDAQ.US** — Price needs cash profits to grow 16.2% a year for ten years · sales +11.1%
- **TEN.MI** — Price needs cash profits to grow 1.8% a year for ten years · sales -0.4%
- **TLS.AU** — Price needs cash profits to grow 8.8% a year for ten years · sales +1%
- **CON.XETRA** — Price needs cash profits to grow 27.1% a year for ten years · sales -2%
- **021240.KO** — Price needs cash profits to shrink 1.9% a year for ten years · sales +15.2%
- **MCHP.US** — Price needs cash profits to grow 24.5% a year for ten years · sales +7.1%
- **APA.AU** — Price needs cash profits to grow 19.7% a year for ten years · sales -4.8%
- **CVE.TO** — Price needs cash profits to grow 7.9% a year for ten years · sales -8.4%
- **HINDALCO.NSE** — Price needs cash profits to grow 8.9% a year for ten years · sales +15.3%
- **PSPN.SW** — Price needs cash profits to grow 6.2% a year for ten years · sales +2.1%
- **5108.JP** — Price needs cash profits to grow 4.9% a year for ten years · sales +0%
- **POST.VI** — Price needs cash profits to shrink 1.7% a year for ten years · sales -2.6%
- **VESTA.MX** — Price needs cash profits to grow 5.5% a year for ten years · sales +12.2%
- **6503.JP** — Price needs cash profits to grow 17.5% a year for ten years · sales +6.8%
- **032640.KO** — Price needs cash profits to shrink 3.2% a year for ten years · sales +5.7%
- **ASML.AS** — Price needs cash profits to grow 26.6% a year for ten years · sales +15.6%
- **VPK.AS** — Price needs cash profits to grow 9.8% a year for ten years · sales -1.3%
- **6326.JP** — Price needs cash profits to grow 10.1% a year for ten years · sales +0.1%
- **6988.JP** — Price needs cash profits to grow 6.7% a year for ten years · sales +1.4%

### Q3: literal

6 total; 6 shown.

- **FDX.US** — "On January 5, 2026, a 5.9% average list price increase was implemented for services." (SEC filing, Jul 2026)
- **VMC.US** — "Shipments decreased 1%, and pricing increased 2.3%, or $1.84 per ton." (SEC filing, Feb 2026)
- **IMB.LSE** — "Tobacco price mix was strong at +5.4% due to strong pricing." (IMB filing, Feb 2026)
- **TATE.LSE** — "Revenue decreased by 5%, with pricing lower and volume broadly flat." (TATE filing, Jun 2026)
- **MOWI.OL** — "Consequently, feed sales prices were reduced during 2024 in line with industry cost-plus pricing." (MOWI filing, May 2025)
- **CSX.US** — "These decreases were partially offset by pricing gains in merchandise and higher intermodal volume." (SEC filing, Feb 2026)

### Price: literal quote

0 total; 0 shown.


### Q6: literal

0 total; 0 shown.


## Changed files (one reason each)

- `components/value/DossierContent.tsx` — Place the Price story line directly under the verdict, including short-history dossiers.
- `components/value/PriceStory.tsx` — Open the existing unmodified SidePanel with a lazily loaded story drawer.
- `components/value/PriceStoryPanel.tsx` — Render five-year prices, literal events, valuation needs, filing facts and existing computed flags.
- `components/value/PriceStory.module.css` — Style only the new line and drawer content.
- `components/value/viz/TileCharts.tsx` — Extend the existing price chart with optional price-only mode and dated event markers; preserve defaults.
- `lib/value/budget.ts` — Reserve the documented five EODHD calls per news request.
- `lib/value/build-output.ts` — Compose story numbers from final published series, quote and valuation.
- `lib/value/business/memo-validation.ts` — Validate attributed literal Q3/Q6 without rewriting source text.
- `lib/value/owner-memo.ts` — Retain literal text/source/date metadata on memo lines.
- `lib/value/types.ts` — Carry PriceStory through published analysis and dossier types.
- `lib/value/price-story/selection.ts` — Extract literal candidates, reject unsuitable excerpts, and ask Jev choice/score questions only.
- `lib/value/price-story/compose.ts` — Compose bounded lines, real margin fallback, valuation needs and refresh queues.
- `lib/value/price-story/corpus.ts` — Read retained filings, fetch bounded compressed news and guard disk growth.
- `lib/value/price-story/publication.ts` — Apply freshness/calibration gates and replace Q3/Q6 within publication.
- `scripts/value/cli.ts` — Allow offline candidate preparation for the new stage.
- `scripts/value/run-daily.sh` — Schedule 400 story refreshes before residual fundamentals use the budget.
- `scripts/value/stages/price-story.ts` — Run source selection, weekly-move detection and dated-event selection with durable local records.
- `scripts/value/stages/publish.ts` — Integrate selected-source memo/story inputs into the normal publisher.
- `scripts/value/story-2-calibrate.ts` — Score candidate-ID manual reviews without awarding credit for abstention.
- `scripts/value/story-2-qa.mjs` — Capture the eight companies at both requested desktop sizes and check page/panel geometry.
- `tests/unit/value/selected-sources.test.ts` — Exercise literal preservation, rejection, choice/score-only calls, composition and queue behavior.
- `tests/unit/value/ops-integration.test.ts` — Verify news cost and nightly stage placement.
- `.superpowers/sdd/2026-09-29-value/story-2-labels.json` — Save forty candidate-hash-bound manual agent reviews and retained risk evidence.
- `.superpowers/sdd/2026-09-29-value/story-2-report.md` — Record measured coverage, samples, calibration, screenshots, gate failures and scope review.

A copy of this report is also written to the owner-requested path `/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/story-2-report.md`. Screens, local publish snapshot and logs remain untracked under `.story-2/`; private candidate/reading data remains under `~/value-corpus/price-story/`.

## Disk and continuation

**DISK STOP:** final report write observed 5.83 GiB free, below the required 6 GiB floor. Work stopped and the requested local commit was made. No further builds or source passes were run.

Initial available space: 11,269,428 KiB; initial worktree allocation: 723,692 KiB including pre-existing node_modules. Builds stayed in `.next`. New retained task artifacts are below 2 GB; the build wrapper also stopped oversized attempts before its reserved allocation. Other workspace activity reduced total free space during this task. No external files were removed to regain space.

Outstanding acceptance work: obtain news within the provider budget; provide complete usable international risk headings; obtain independent hand-labelled calibration and achieve >=90% for both types; populate 3–6 accepted events; backfill the initial weekly comparison; fix scoped drawer density and resolve locked baseline gate failures through a separately authorized change. This commit is not a release candidate.
