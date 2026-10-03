# Since then — since-2 report

Status: **partial; stopped at disk guard; not release-ready**. No subagents, push, deployment, or remote publication. Worktree: `value-zn-since`.

## First action: master merge

Merged the requested `origin/master` (`2713930d7785d57b857150303d53ed586157c5a8`) in local merge commit `42f42b5`. Resolved conflicts in `history-snapshots.ts` and `publish.ts`, preserving master's preference for quarterly history, split corrections, and memo handling alongside the since-return refresh. Master’s SidePanel, search, bottom bar, slider, filters and drawer sizing are unchanged. CompanyList keeps master's sizing/pagination behavior; its only differences from master are the requested return label, metadata and last-traded title.

## Mandatory disk stop

The running return refresh threw **`DISK STOP: below 5 GiB`** after the 1,400-company progress line. The cache contains **1,499 companies fetched on 2026-10-03**. The exact byte count at the instant of the exception was not logged. The guard uses 5 × 1024³ bytes; no claim is made that decimal 5,000,000,000 bytes was crossed. The stop was honored conservatively. A subsequent `df -k .` showed 6,115,348 KiB available; work was not resumed after recovery. The release gate independently stopped at its existing, stricter 6 GiB threshold.

Disk allocation: `.next` started at 880,336 KiB and ended at 2,028,192 KiB (growth 1,147,856 KiB); return cache grew from 5,264 to 11,896 KiB; evidence ~13,360 KiB, with small logs/source/report additions. Total new allocation approximately **1.20 GB**, within 1.5 GB. The completed build reused `.next`. The task's local production server was stopped.

## Completed implementation and checks

- `npm run build`: **passed**, including TypeScript and all 8,218 generated pages. An earlier attempt caught a test-fixture variable typo; that typo was corrected before the successful build.
- Focused tests: **84 passed across five files** (`value-since-return`, `nightly-history`, `publish`, `value-main-layout`, `history`). `git diff --check` passed.
- Added a red-then-green terminal-price regression: EODHD raw closes are adjusted using later split factors only; cash-dividend-adjusted closes are ignored. Confirmed delisted listings retain their last trade date. Active stale quotes remain failures, never silently marked delisted.
- Yahoo return inputs are checked against the listing's local currency family. Yahoo failures have an EODHD daily-close plus splits fallback.
- History loading enriches only identities present in the historical frames instead of the entire corpus repeatedly. Historical rows are retained even if no longer eligible today.
- Nightly `publish` invokes the return refresh before publication, blocks on fetch failures, recomputes `perQuarter` / `western.perQuarter`, and regenerates hashed browser payloads. Tests verify fresh arithmetic means for both market scopes and preservation of forecasts. The daily runner calls this publish stage. **No nightly remote publication was run.** The existing publish hold remains untouched; integration with the parallel nightly work still requires verification.

## Fifteen randomly selected price checks

Selected before fetching using seed `20261003`: uniform company-quarter sampling from existing history with a recorded return, rejecting duplicate companies. Independently fetched Yahoo **daily** closes around quarter end and latest five-day closes; compared `latest / quarter-close − 1` with the monthly return cache. These are local-currency, split-adjusted close comparisons; no `adjclose` or annualisation. The table gives the operands so the arithmetic is reviewable. All cache endpoints are from the current refresh date.

**14 agree within 0.001 percentage point; one fails.** `GN.CO / 2014Q2` has daily quarter close 154.899994 versus cached monthly close 156.000000. Both latest endpoints are approximately 105.40; the return differs by **0.479800 percentage point**. This is an unresolved monthly-versus-daily source discrepancy, not a passed price check. No further data requests or fix were attempted after the disk stop.

| Company | Quarter | Currency | Start trade | Start close | Latest trade | Latest close | Daily calculation | Cached calculation | Check |
|---|---|---|---|---:|---|---:|---:|---:|---|
| CLX.US | 2018Q1 | USD | 2018-03-29 | 133.110001 | 2026-10-02 | 80.410004 | -39.591313% | -39.591316% | PASS |
| EQNR.OL | 2019Q4 | NOK | 2019-12-30 | 175.500000 | 2026-10-02 | 402.799988 | +129.515663% | +129.515670% | PASS |
| LUV.US | 2012Q3 | USD | 2012-09-28 | 8.770000 | 2026-10-02 | 42.470001 | +384.264527% | +384.264513% | PASS |
| 601288.SHG | 2016Q4 | CNY | 2016-12-30 | 3.100000 | 2026-09-30 | 6.970000 | +124.838710% | +124.838717% | PASS |
| PCAR.US | 2013Q4 | USD | 2013-12-31 | 39.446667 | 2026-10-02 | 109.680000 | +178.046308% | +178.046307% | PASS |
| PHP.LSE | 2023Q1 | GBp | 2023-03-31 | 101.199997 | 2026-10-02 | 90.349998 | -10.721343% | -10.721341% | PASS |
| BRG.AU | 2025Q4 | AUD | 2025-12-30 | 29.469999 | 2026-10-02 | 30.040001 | +1.934176% | +1.934173% | PASS |
| ACA.PA | 2020Q1 | EUR | 2020-03-31 | 6.690000 | 2026-10-02 | 16.885000 | +152.391631% | +152.391627% | PASS |
| SCA-B.ST | 2016Q2 | SEK | 2016-06-30 | 54.868877 | 2026-10-02 | 119.599998 | +117.974203% | +117.974206% | PASS |
| 601899.SHG | 2022Q2 | CNY | 2022-06-30 | 9.330000 | 2026-09-30 | 29.790001 | +219.292617% | +219.292607% | PASS |
| AMBU-B.CO | 2019Q3 | DKK | 2019-09-30 | 113.500000 | 2026-10-02 | 67.349998 | -40.660794% | -40.660793% | PASS |
| WM.US | 2012Q1 | USD | 2012-03-30 | 34.959999 | 2026-10-02 | 204.449997 | +484.811219% | +484.811228% | PASS |
| WCN.TO | 2009Q3 | CAD | 2009-09-30 | 19.217722 | 2026-10-02 | 219.250000 | +1040.874036% | +1040.874036% | PASS |
| VU.PA | 2019Q4 | EUR | 2019-12-31 | 31.700001 | 2026-10-02 | 129.199997 | +307.570958% | +307.570968% | PASS |
| GN.CO | 2014Q2 | DKK | 2014-06-27 | 154.899994 | 2026-10-02 | 105.400002 | -31.956097% | -32.435897% | FAIL |

Raw operands, endpoint URLs, dates, seed, and differences: [spot-checks.json](since-2-evidence/spot-checks.json). The scratch sampling script is preserved alongside it. Yahoo's [historical price table](https://finance.yahoo.com/quote/AAPL/history/) distinguishes close from dividend-adjusted close; [EODHD split API examples](https://github.com/EodHistoricalData/EODHD-openapi/blob/main/EXAMPLES.md) document the split data used by the fallback. [EODHD delisted-data documentation](https://eodhd.com/financial-apis/delisted-stock-companies-data-2) describes retained terminal histories.

## Release gate and consistency: incomplete

- Gate on the local completed production build captured **48 states at 1728×970** across LULU, ADBE, GOOGL and KO, plus a disk-stop record before JPM. The captured states have **zero cut/overlap or other non-whitespace findings**. All 19 reported layout findings were fixed-width drawer whitespace; the largest reported raster empty area was 20.5%, within the contract's stated tolerance. This does **not** establish the full four-viewport release gate.
- Full report and PNGs: [gate-dossiers/report.json](since-2-evidence/gate-dossiers/report.json). Screenshots were captured automatically but were **not visually reviewed before the stop**. They are not shipping approval.
- 2056×1180, 1440×800 and 390×844 were not reached. Requested Today / 2018Q3 / 2020Q1 / 2011Q4 screenshots at both desktop sizes remain outstanding, as do the remaining gate states.
- The consistency audit was attempted but could not start its assertions: the old temporary store's copied `meta.json` refers to a browser-view hash absent from its symlinked current `views` directory (`50a5cb84af8a6f6bf1c4d9cb.json`). **No consistency pass is claimed.**
- A local history/view regeneration scratch script was prepared but not executed. Do not use `/tmp/value-since-store` as a release candidate yet.
- The live-versus-candidate change-review script was not run. Full UI diffs against `2713930` were read; no unrequested shared-chrome changes were introduced.

## Remaining blockers

1. Resolve the GN.CO quarter-close discrepancy; prefer verified daily quarter endpoints if monthly candles do not reproduce them.
2. Complete the 2,079-company refresh (1,499 cached at stop), investigate any failures, and validate missing-quarter coverage and terminal listings.
3. Regenerate an internally consistent isolated local store, preserving master's frozen predictions and dossier data, then validate all since summaries and browser payloads.
4. Run the complete consistency audit and four-viewport release gate with zero cut/overlap failures; capture and look at all required screenshots and change-review pairs.
5. Reconfirm the nightly integration after the parallel nightly branch lands. Unit tests establish the code path; they do not establish successful full-universe nightly publication.
6. Historical source membership is still the existing hindsight dataset. Retaining all stored historical rows prevents additional survivor filtering, but does not reconstruct companies absent from that original dataset. No claim of a survivorship-free historical universe is made.

## Every changed source file relative to master

- `app/value/ValueIndex.tsx` — passes outcome metadata and renders the precomputed historical headline.
- `app/value/main-view.css` — styles historical return labels and allows their longer headline to wrap.
- `components/value/AboutMethod.tsx` — explains prediction then versus absolute price change since, excluding dividends.
- `components/value/CompanyList.tsx` — displays the outcome in master's compact/table rows, with terminal-date title.
- `components/value/MainView.tsx` — displays outcomes in cards, accessible labels and hover tooltip.
- `lib/value/browser-view.ts` — transports outcome date/status to the browser.
- `lib/value/result-entry.ts` — types the outcome metadata for rendered entries.
- `lib/value/types.ts` — extends snapshot metadata and documents arithmetic-mean headline fields.
- `lib/value/since-return.ts` — formats absolute returns/headlines and refreshes return-only fields.
- `scripts/value/stages/history-snapshots.ts` — preserves master's quarterly selection, retains historical rows and loads only relevant identities.
- `scripts/value/stages/publish.ts` — refreshes returns before publishing and preserves historical eligibility independently of today's rows.
- `scripts/value/stages/history-returns.ts` — refreshes dated Yahoo prices, checks currency, falls back to split-only EODHD prices, and enforces the 5 GiB disk guard.
- `tests/unit/value-since-return.test.ts` — covers formatting, arithmetic, prediction preservation and split-only terminal prices.
- `tests/unit/value/nightly-history.test.ts` — verifies quarterly preference and fresh all/western summaries without forecast changes.
- `tests/unit/value/publish.test.ts` — verifies fresh outcomes and historical retention through full and partial publication.

This round changed the two history stage files and three test files above; the remaining feature files are inherited from since-1. The master merge also imports master's existing changes, rather than creating new scope here. Report and evidence are saved at the owner-requested location. Local completion commit uses `value: show return since then on past quarters`; this is a disk-stop checkpoint, not a release-readiness claim.
