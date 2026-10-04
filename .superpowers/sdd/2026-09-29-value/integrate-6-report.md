# integrate-6 — one site and LTM on the live base

Status: all requested release thresholds pass. The release code is the merge commit containing this report, paired with the store below.

Branch `value-zy-int6`, based on `067f530`, merges `value-zu-merge` and `value-zt-ttm`. No subagents, main-branch writes, pushes or deployments. The controller owns shipping. The live corpus and `~/value-corpus/publish-repo` were read only. Minimum observed free disk remains above 4 GiB.

## Code and conflict resolution

- One public origin: `https://gigainvestors.com`. Checklist home `/value`; canonical company pages `/s/AAPL`, `/s/PLX.PA`, `/s/7203.JP`; legacy value-host requests redirect 308 with query strings preserved. Existing listing aliases and share classes survive.
- Shared brand, dock, search and quarter navigation; dossier plus holder strip/drawer for covered companies; original holders composition for 13F-only companies. Investor holdings use the selected quarter’s independent checklist marks. Neutral activity outlines/hatching and complete labels follow merge-1.
- Preserved the live GigaValue name, agent content, schema, Markdown alternatives, discovery endpoints and x402 API. Agent company URLs, llms, robots and all sitemap families use the unified routes. API remains `/api/v1` on the main origin. Historical Markdown contains its selected snapshot, not current dossier facts. Foreign companies work without 13F data. The API’s optional provisional observation includes its actual LTM period. Historical snapshots, company test cards and Markdown also carry each test’s recorded LTM label, distinct from the annual base and valuation-earnings period.
- Preserved ttm-1’s reconciled four-quarter provisional observation, per-test fallback, two-quarter confirmation, filing-date cutoff and explicit LTM labels. Pipeline 27, method 3.3.0. Valuation and annual memo inputs remain their existing inputs; historical price checks may change through the existing quality-dependent model/discount.
- Integration layout fixes reserve space for LTM captions and holders at compact heights, hide the duplicate annual strip below 1,050px, and allocate sufficient phone dock height for the retained Agent API link. The 1440px quality grid keeps axis labels and tile figures separate.
- Interaction fixes batch treemap label reads before visibility writes; update the quarter control immediately while transitioning the content; cache drawer clipping-ancestor geometry; defer fitting until the modal can paint; isolate overlay state from the unchanged dossier charts; mount drawer bodies after the first header/close-control paint; coalesce company-list fitting; reuse chart number formatters.

## Offline candidate store

Store: `/tmp/value-int6-store`, 2,708 dossiers, 87 quarter frames. The released universe count remains 2,714, including unanalysed members. Current corpus caches only; network fetches are explicitly rejected in the replay/publication scripts. Private writable analysis and history live in `.ttm-1/corpus`; source cache directories are read-only inputs. Publication uses the normal freeze, consistency and structural checks.

The final store passes the nightly-9 semantic numeric audit, including packed vectors: **0 numeric-to-null, 0 lost historical rows or series, 0 blanked price verdicts, 0 unapproved current or historical verdict changes**. All **147** frozen dossiers and **6,647** frozen public records/aliases are identical. Current price verdicts are unchanged.

Full cache replay was compared with an annual-only replay using identical inputs. Historical rows are updated only when their annual control matches the released row (numeric tolerance 1 ppm) and the LTM result removes no number. Released historical returns/outcomes are also unchanged: [check](integrate-6/return-preservation.json). Retained 124,102 row occurrences; updated 3,185 before freeze. Held 829 unrelated cached annual revisions and 22 rows that would remove a number. The freeze removes additional candidate changes. Counts include annual files mirroring Q4; the complete ledger identifies each file, so duplicate period representations are explicit.

After freeze: **22 current quality-test changes**, five aggregate quality changes and CFG-PH’s buy qualification; **1,953 historical quality-test changes**, **25 historical buy changes**, and **1,802 attributable historical price-check changes**. No independent price-data refresh is included. Supplemental annual capital-return series are preserved/recomputed through the existing capital-return function so the LTM overlay cannot blank their published vectors.

Every released change, including company, test, old → new and full LTM observation metadata, is listed in [verdict-changes.tsv](integrate-6/verdict-changes.tsv). Current detail: [JSON](integrate-6/current-verdict-changes.json). Historical attribution: [audit](integrate-6/history-gate.json.gz), [held rows and scope](integrate-6/history-scope.json.gz). [Nightly-9 checks](integrate-6/data-gate.json), [publication checks](integrate-6/publish-diff.json), [stability replay](integrate-6/ltm-stability.json.gz).

The 5,083-file store checksum manifest is [store-sha256.txt](integrate-6/store-sha256.txt); manifest SHA-256: `73106a657792270bb6dff49a46fe88e61fcf865b1bb5bd8230321177c6f3f132`.

### Current verdict ledger

| Company | Test | Old → new | LTM end |
| --- | --- | --- | --- |
| Miwon Commerci (002840.KO) | understandable | fail → pass | 2026-06-30 |
| Biogen Inc (BIIB.US) | understandable | pass → fail | 2026-06-30 |
| Poongsan (103140.KO) | understandable | fail → pass | 2026-06-30 |
| Synchrony Financial (SYF.US) | understandable | pass → fail | 2026-06-30 |
| Skyworks Solutions Inc (SWKS.US) | understandable | pass → fail | 2026-06-30 |
| CSX Corporation (CSX.US) | understandable | fail → pass | 2026-06-30 |
| Rumo S.A (RAIL3.SA) | understandable | fail → pass | 2026-06-30 |
| Yageo Corp (2327.TW) | understandable | fail → pass | 2026-06-30 |
| Quanta Services Inc (PWR.US) | moat | fail → pass | 2026-06-30 |
| Quanta Computer Inc (2382.TW) | understandable | fail → pass | 2026-06-30 |
| VICI Properties Inc (VICI.US) | understandable | fail → pass | 2026-06-30 |
| Comfort Systems USA Inc (FIX.US) | understandable | pass → fail | 2026-06-30 |
| Citizens Financial Group, Inc (CFG-PH.US) | moat | fail → pass | 2026-06-30 |
| Bank of Montreal (BMO.TO) | economics | fail → pass | 2026-04-30 |
| CS Wind Corp (112610.KO) | understandable | fail → pass | 2026-06-30 |
| Deere & Company (DE.US) | economics | fail → pass | 2026-07-31 |
| Cboe Global Markets Inc (CBOE.US) | understandable | fail → pass | 2026-06-30 |
| Alchip Technologies Ltd (3661.TW) | understandable | fail → pass | 2026-06-30 |
| Vertiv Holdings Co (VRT.US) | economics | fail → pass | 2026-06-30 |
| Zalando SE (ZAL.XETRA) | understandable | fail → pass | 2026-06-30 |
| Chong Kun Dang Pharmaceutical (185750.KO) | understandable | pass → fail | 2026-06-30 |
| Walmart Inc. (WMT.US) | moat | fail → pass | 2026-07-31 |

Aggregate quality changes false → true for PWR.US, CFG-PH.US and CBOE.US (LTM end 2026-06-30), and WMT.US (2026-07-31); FIX.US changes true → false (2026-06-30). CFG-PH.US additionally changes buy qualification false → true. The current buy count rises from 15 to 16.

## Change review against production

Both production families were compared at 1728×970, 2056×1180, 1440×800 and 390×844. Main comparisons: `/`, `/BRK`, `/s/AAPL`, Apple search, and `/BRK?q=2018Q3`. Checklist comparisons: home, Wolters search, country filter, all companies, method, quarter step, 2018Q3, KO dossier, business and valuation. The 60 main/checklist pairs were visually reviewed, followed by eight final method/list pairs after the universe-count and fitting fixes. [Main comparison](integrate-6/change-main.json), [checklist comparison](integrate-6/change-value.json), [final comparison](integrate-6/change-final.json). Screenshot directories remain in this worktree’s `.int6/change-main-release`, `.int6/change-value-release3` and `.int6/change-last`.

| Visible difference | Why it belongs in this release |
| --- | --- |
| Brand and dock occupy space; treemap geometry, small labels and portrait sizing adapt | One shared shell required by merge-1; complete ≥13px labels and responsive images. All holdings and investors remain available. |
| Activity colors become outlines/hatching; holdings gain checklist marks | merge-1’s neutral activity system and independent selected-quarter checklist results. |
| Main company opens the dossier; holders move to a compact strip and drawer | Requested unified company page. Full holders, pagination and holdings chart remain accessible. |
| Search is one list with canonical company destinations and neutral selection | Requested unified search; no duplicate company entry or cross-host link. |
| Compact historical BRK URL now displays 2018Q3 rather than latest | merge-1 fixes the spaced/compact quarter mismatch; this is a restoration of the requested snapshot. |
| Checklist cards show a different count before More; dock/filter controls move | Same lists within the space left by the shared shell. Phone dock reserves its complete height. |
| Company card charts/duplicate annual strip yield vertical space | Keeps merged holder strip, LTM captions and figures visible. Original annual figures remain in evidence; the tall desktop retains the strip. |
| Drawer sources are grouped, text fits, and redundant valuation formulas move into the valuation drawer | Included merge-1/ttm-1 presentation fixes; original source links and calculations remain. |
| LTM captions, chart endpoints, provisional API metadata and qualifying verdict/count changes | ttm-1, with every data consequence enumerated in the release ledger. |
| GigaValue branding, Agent API link and historical agent metadata survive | Live-base preservation, not a new product change. Payment routing and prices are unchanged. |

## Verification

- Full unit suite: **2,103 passed, 1 existing skip, 206 files**, using `npm test -- --testTimeout=20000`. One earlier run reached the default five-second timeout in the filing-runner integration test under concurrent QA load; the full rerun passes without relaxing assertions. [Log](integrate-6/unit.log).
- `npx tsc --noEmit`: exit 0. Optimized `npm run build`: exit 0. [Build](integrate-6/build.log), [typecheck](integrate-6/typecheck.log).
- Full visual matrix: **725 states**, both page families at **1728×970, 2056×1180, 1440×800, 390×844**. **Zero cut, overlap, undersized-text or desktop-scroll findings**. Final affected-surface rerun: **198 states**, also zero geometry findings. Historical LTM label and Markdown checks: **8/8**. [Full geometry](integrate-6/visual-full.json.gz), [final recheck](integrate-6/visual-final.json.gz), [historical labels](integrate-6/historical-labels.json).
- The raw full script flags 207 states: 195 have only its existing strict whitespace warnings; 12 PLX page/search states match “unclear” inside intentionally hidden agent-readable Markdown, not a painted label. These raw warnings are retained, not suppressed or presented as all-green script output. The final 198-state rerun has 15 raster-whitespace-only warnings. None is a cut/overlap finding.
- **35/35 redirect/navigation checks**, including **20 old value URLs**, `?q=2018Q3`, `aapl.us`, `plx.pa`, `7203.jp`, yearly links, listing aliases, Markdown redirects, 13F-only routes and shared-quarter navigation. [Results](integrate-6/redirects.json).
- Agent discovery, Markdown, sitemap and free API surfaces return 200 with the unified canonical URLs. Historical Markdown preserves quarter context and LTM observation labels. [URL audit](integrate-6/agent-urls.json). [Production API checks](integrate-6/production-api.json): paid endpoints returned the expected unpaid 402; the local paid endpoint returns 503 because the receiving address is unconfigured locally. Payment contracts pass and no payment/production mutation was attempted.
- Each of the 22 current quality flips also matches an identical-input annual/LTM counterfactual, including released old/new result and period: [attribution](integrate-6/current-attribution.json).
- Performance: **272/272 final interactions ≤100 ms** across all four viewports: 128 search/open/type/close/quarter interactions, maximum **72 ms**; 144 list, method, holders, business, quality and valuation drawer opens, maximum **80 ms**. Every drawer’s fully loaded/fitted body also passed geometry, **0 cuts/overlaps**. [Interaction data](integrate-6/performance.json), [drawer timing and geometry](integrate-6/drawer-performance-geometry.json). The earlier 104–232 ms list/body mounting failures and the merge-1 128 ms regression are addressed by the fixes above. Lab Event Timing measures input through next paint at normal CPU, not field INP or full data-loading completion. Text fitting and asynchronous data can settle after the initial responsive drawer controls paint.

## Controller handoff

Ship the verified branch tip with `/tmp/value-int6-store`; the final code commit directly merges live base `067f530`, merge-1 `ededa7e`, and ttm-1 `25eca9a`. No branch push or deployment was performed. Build ID: `25nQERsOCv9tOkJ6u-zYU`. The minimum observed free disk stayed above 4 GiB.

The exact requested report is also written to `/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/integrate-6-report.md`, with the final code SHA. Audit artifacts are committed beside this report. The offline replay uses `scripts/value/ltm-audit.ts`, `ltm-history.ts`, `ltm-scope-history.ts`, then `VALUE_LTM_OUT=/tmp/value-int6-store npx tsx scripts/value/ltm-publish.ts`; private cache preparation and outputs remain in this worktree’s `.ttm-1`. The full verdict ledger uses P/F for historical pass/fail and includes mirrored annual/Q4 files explicitly.
