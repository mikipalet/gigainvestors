# Spin-off targeted publication — local preparation

Prepared in `value-zq-spinoff` on 2026-10-03. **No data publication, push, or deployment was performed.** The normal nightly publish remains held. `/tmp/value-spinoff-store` is the targeted candidate, based on live data commit `634f80f3cc7c9b3d73759843c6b29cc4d386253f`.

## Scope correction

The supplied “77 + 10 = 87” description double-counts the ten spin-offs. The original frozen 77-company inventory already contains **PLX.PA, VLTO.US, SDZ.SW, SOLV.US, KALMAR.HE, TKMS.XETRA, SNDK.US, FDXF.US, SYENS.BR, HONA.US**. The union is **77 unique IDs**, all listed in [spinoff-pub-1-ids.json](spinoff-pub-1-ids.json). This discrepancy was raised during execution; preparation used that explicit union without inventing ten more companies.

All 77 already had direct-only dossiers in live data, but **zero** were in its country/default/search/current-browser indexes. The candidate makes all 77 searchable and available in All companies. Ten now have predecessor-backed seven-period histories and scored dossiers; the remaining **67** retain “Not enough history yet.” None of this cohort is added to Buy now or Next closest.

## Exact data isolation proof

The live directory was copied, excluding `.git`, to `/tmp/value-spinoff-baseline`, then copied to `/tmp/value-spinoff-store`. Both copies were verified against all live file hashes before changes. Copies use separate files, with no writable hardlinks to live. The live working tree was clean. Inputs for the selected dossiers/index entries are the prior verified `.audit/spinoff/store`; the full publisher and analyzer were not rerun.

| Check | Result |
|---|---:|
| Original live files | 5,081 |
| Byte-identical original files | 4,813 |
| Changed original files | 268 |
| New files | 1 deferred browser view |
| Total files in candidate | 5,082 |
| Identity-keyed JSON-path differences | 4,226 |
| Unexpected JSON paths | **0** |
| Other companies' dossiers unchanged | **2,631 / 2,631** |
| Raw non-target company entries compared inside modified shards | **16,423**, byte-identical |
| Existing browser views changed | **0** |
| History files changed | **0** |
| Price, logo, aliases, top, forward, search-manifest files changed | **0** |

The independent Python proof compares every file hash and normalizes row arrays by company ID, so adding a row cannot hide changes to another company behind position shifts. Inside modified dossier, index and search files, every non-target company value also retains its exact serialized bytes and relative order. Search aliases retain existing row offsets; new offsets must point to selected IDs. The only non-company changes are numeric aggregate counts/ratios and one appended deferred-view reference. Unchanged metadata timestamps, versions and labels are preserved.

A negative check injected an unauthorized `ORCL.US` name into a private staged file; the proof rejected `dossiers/023.json` / `ORCL.US`. The exact file bytes were restored. The initial browser-gate attempt was discarded as an incomplete run; the final complete gate began after restoration and no staged-data edits occurred during it. Neither live nor the frozen baseline was edited by this check.

The candidate source contains **no historical snapshot or history-identity rows for any of the 77**. This was checked across every history file in both source and live. Current seven-period predecessor coverage does not authorize invented historical verdicts. Thus all existing history rows, historical returns, aggregate history counts, and history view references remain byte-identical. Existing search routing already covers every target token, so `search/manifest.json` also stays byte-identical.

Metadata counts change from **2,629 analysed / 2,629 scored / 0 insufficient** to **2,706 / 2,639 / 67**. Universe count remains **2,714**; dossier count remains **2,708**. Funnel and story counts use only the selected cohort's contributions. Live Buy now/quality-pass totals and all unrelated financial/memo/price fields are preserved.

Evidence:

- [Complete file hashes before/after for changed files](spinoff-pub-1-file-diff.json).
- [Every changed JSON path, before and after](spinoff-pub-1-json-path-diff.jsonl.gz).
- [All 5,081 frozen baseline file hashes](spinoff-pub-1-baseline-hashes.json.gz).
- [Proof summary](spinoff-pub-1-proof.json).
- [77-company search / All companies / investment-list inventory](spinoff-pub-1-inventory.json).

## Code integration and fresh checks

Merged **origin/master `829adfad148a230942da9235a866c2ccf8cde81f`** into the branch starting at `fbbf819`. The merge was clean. Master's `app/value` UI, `SidePanel`, `BusinessDepth`, `CompanyList`, `MainView`, and its “Since” return behavior are retained. The only UI differences from that master are the branch's four existing short-history/predecessor files: `DossierContent`, `EvidencePanel`, `FilingEvidence`, and `ThresholdSeries`. This task adds no UI/style changes.

The first full suite exposed one stale integration expectation: `data-stages-round7` expected an old historical gain without the separate dated return-price cache introduced on master. The fixture now checks the intended contract: raw research snapshots keep their original return; published rows and aggregates omit an unrefreshed return. No production return logic was weakened. The focused history tests passed, then the entire unit suite passed: **176 files, 1,833 tests passed, one skipped**.

- New merge regressions: **4 passed**; three failed against the no-op implementation before the merge helper was written. They cover unrelated-data preservation, missing-candidate retention, alias-offset preservation, and duplicate-ID rejection.
- TypeScript: `npx tsc --noEmit --incremental false`, exit 0.
- Optimized production compile: `VALUE_STORE_DIR=/tmp/value-spinoff-store VALUE_SITE_HOST=localhost NODE_OPTIONS=--max-old-space-size=3072 npm run build -- --webpack --experimental-build-mode compile`, exit 0. This uses Next's compile mode, with type checking run separately.
- Local production server: `VALUE_STORE_DIR=/tmp/value-spinoff-store VALUE_SITE_HOST=localhost npx next start -p 3027`.
- Full store consistency: **2,708 dossiers, 13,177 quality rules, 1,971 IRR checks, 41 cash-covered cases**.
- Ten predecessor companies' rendered cross-surface checks: **10 passed, zero failures**; [results](spinoff-pub-1-consistency.json).
- All 77 target ticker searches and All companies filters pass; zero target Buy now/Next closest inclusions. All referenced target logo assets exist in the unchanged live assets.
- The screenshot flow checks search “Pluxee” → `PLX.PA` → `/plx.pa`, seven years, both Sodexo predecessor source notes, and Atos's “Not enough history yet” row in the France-filtered All companies drawer.

## Release gate

The complete, unmodified merged release gate checked **989 states**, **23 routes**, and **four viewports**: 1728×970, 2056×1180, 1440×800, and 390×844. This includes home, two historical views, all master control companies, all ten predecessor companies, ARM short history, drawers, filters and search.

**Zero cuts, overlaps, clipping, off-screen content, scroll, forbidden-wording, browser errors, or other non-whitespace failures.** The ten predecessor companies account for **428 states**, also with zero non-whitespace failures. The previously clipped Lululemon 1440×800 In depth control has no geometry failure after the master merge.

The raw gate exits **1**, because **326 states fail only its existing whitespace rules** (bottom empty area, raster empty area, or large empty block). Maximum measured raster empty area is **48.68%**. These failures are retained without waivers or threshold changes; this is a zero-cut/overlap result, **not a claim that the entire raw release gate is green**.

[Gate summary](spinoff-pub-1-gate-summary.json), [every state and every retained failure](spinoff-pub-1-full-gate.json.gz), [gate log](spinoff-pub-1-gate.log.gz). Full screenshots remain under `.audit/spinoff-pub-1/gate/`.

## Screenshots

All eight were captured from the local production build using `/tmp/value-spinoff-store`, visually inspected, and passed the DOM geometry audit with zero issues.

| View | 1728 × 970 | 2056 × 1180 |
|---|---|---|
| Pluxee page | [image](spinoff-pub-1-screenshots/1728x970-pluxee-page.png) | [image](spinoff-pub-1-screenshots/2056x1180-pluxee-page.png) |
| Lasting advantage drawer | [image](spinoff-pub-1-screenshots/1728x970-pluxee-lasting-advantage.png) | [image](spinoff-pub-1-screenshots/2056x1180-pluxee-lasting-advantage.png) |
| Search “Pluxee” | [image](spinoff-pub-1-screenshots/1728x970-search-pluxee.png) | [image](spinoff-pub-1-screenshots/2056x1180-search-pluxee.png) |
| All companies / Atos short history | [image](spinoff-pub-1-screenshots/1728x970-all-companies-short-history.png) | [image](spinoff-pub-1-screenshots/2056x1180-all-companies-short-history.png) |

Pluxee shows seven years, three of five quality tests passing, and “Not a wonderful business.” Its lasting-advantage drawer shows FY2019–2020 Sodexo segment history and FY2021–2023 combined accounts, retaining the source links and null undisclosed fields. The unchanged ROIC hurdle is 15%; the displayed median excluding acquisitions is 11.3%.

## Exact files for a later authorized copy

**Source: `/tmp/value-spinoff-store`. Destination, not written by this task: `/Users/miki/value-corpus/publish-repo`.**

The exact **269 relative file paths** are in [spinoff-pub-1-copy-files.txt](spinoff-pub-1-copy-files.txt); their before/after SHA-256 values are in [spinoff-pub-1-file-diff.json](spinoff-pub-1-file-diff.json). Total payload is **15,829,555 bytes**. No deletions are required.

| Files to copy | Count |
|---|---:|
| Dossier shard files, already merged by ID | 66 |
| Country/default index files | 23 |
| Search shards, existing offsets preserved | 178 |
| `views/3f3fd05ea4bf94ef5d977ad5.json` | 1 |
| `meta.json` | 1 |

If a later task is authorized to copy, verify the complete baseline hashes first; do not overwrite a newer release using this old baseline. Copy the data files/new view before `meta.json`, which references the new view. This report supplies the manifest, not authorization to publish. **Do not copy the original full candidate `.audit/spinoff/store`**: it contains unrelated nightly differences.

Reproduce the read-only proof:

```sh
python3 scripts/value/prove-targeted-spinoff-store.py \
  /tmp/value-spinoff-baseline /tmp/value-spinoff-store \
  .superpowers/sdd/2026-09-29-value/spinoff-pub-1-ids.json \
  .superpowers/sdd/2026-09-29-value
```

The builder is `scripts/value/targeted-spinoff-store.ts` (requires a fresh baseline copy at the dedicated `/tmp` output), the cohort checker is `scripts/value/verify-spinoff-store.ts`, and screenshot reproduction is `scripts/value/capture-spinoff-store.mjs`. The proof rejects any live drift and any changed file family outside the explicit scope.

## Local-only execution and resources

No subagents, remote publication, push, deployment, key output, or writes to `publish-repo` or `publish.hold`. The live-store full hash comparison was rerun after all preparation. Disk was checked throughout; a ten-second monitor was installed to stop and commit if free disk fell below 4 GiB. At final validation, minimum monitored free disk was **9.46 GiB**, with **9.44 GiB** free at that measurement. The 4 GiB stop floor was never reached. [Machine-readable validation](spinoff-pub-1-validation.json) contains the resource measurements and all gate results. Local commit title: `value: targeted publish of short-history and spin-off companies`.

The final live-store audit again reports zero unexpected paths and confirms all 5,081 live file hashes remain unchanged. The normal publish hold remains present. The requested report and its companion evidence are copied to `/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/` after the local commit.
