# Nightly 7 — NOT LIFT

**NOT LIFT.** The fresh `publish --out` from the current corpus preserves **121/121 frozen IDs** across **5,120 byte-identical records**, but has **44 identity-aligned numeric-to-null occurrences outside the freeze**, **53 unapproved quality-verdict changes**, **89 unapproved price-verdict changes**, and loses **all 10 live predecessor histories**. **1,947 unit tests pass, one is skipped; full typecheck passes.** Browser gate: **581 states, 0 cut/overlap issues**, 87 states with other findings. Keep `publish.hold`.

## What was merged and exported

- Merged `value-eodhd-reset` (`cc8d76c7134e61d4bff3f5968fe048ae1f264df4`) in merge commit `e95cb22`. Fetched and merged `origin/master`; it was already contained at `65a812925e7dc5653a2ea40b1759b4b3128e19c5`.
- Read current `/Users/miki/value-corpus`, with its 121-ID freeze. Input directories are read-only symlinks in a private corpus; the history-return cache is hardlinked with guarded copy-on-write, and publication logs use private staging. No analyze stage ran and no earlier replay analyses were substituted.
- Ran the normal CLI via `python3 .fix5c/nightly-7/run.py publish --out=.fix5c/nightly-7/after-final`. Exit 0; 0 history returns refreshed, 2,079 current caches, 0 failures. An initial attempt stopped at the write guard because the history report directory was read-only; rerun used a private copy of that directory.
- Exact candidate: `/Users/miki/GitHub/superinvestors-wt/value-zp-nightly/.fix5c/nightly-7/after-final`.
- Baseline: `/Users/miki/value-corpus/publish-repo`, commit `43d5c33f` (live price-story release). **2,708 → 2,708 dossiers**, no additions/removals; **2,587** changed dossiers, **121** unchanged frozen dossiers.

## Freeze passes

The controller's freeze was copied without changing its contents. The verifier compares raw JSON record substrings for dossiers, country/default index rows, search rows, history identities and historical snapshots; **5,120 records match byte-for-byte**. All **121 IDs** exist on both sides. Search alias identities and canonical frozen aliases have **0 mismatches**. Receipts: [freeze receipt](./nightly-7-freeze-receipt.json.gz), [audit](./nightly-7-audit.json), [freeze definition](./nightly-7-verdict-freeze.json).

## Current corpus is different from the nightly-6 replay

The previous report's passing verdict subset came from rebuilt private analyses. The current corpus still contains pipeline-19 spin-off analyses from October 1; PLX and SOLV have `insufficient_data` and no predecessor history. Nightly-6's private analyses for those same IDs are pipeline 26, rebuilt October 3, with predecessor histories. Toyota and Sompo similarly have pipeline-20 current analyses while the private replay has pipeline-26 corrected verdicts. The merged publisher loads these current cached analyses; merging code alone does not rebuild them. Exact hashes, versions and verdicts are in [corpus diagnosis](./nightly-7-corpus-diagnosis.json).

This directly explains why extending the freeze alone did not reproduce nightly-6 with 31 more held companies. Before any release, the current runner's analysis output needs to reproduce the corrected inputs and predecessor histories, followed by another export and verification. This report does not approve the stale candidate or silently promote the old private replay.

## Every changed verdict checked

**53 quality verdict changes across 12 companies: 0 approved, 53 unreviewed.** All were compared with nightly-5's recorded approvals. Fifty changes turn live spin-off verdicts into `na`. The remaining three are Toyota management `pass → fail`, and Sompo economics and management `pass → fail`. They do not match the recorded approved flips.

| Company | Unapproved quality changes |
|---|---:|
| 7203.JP | 1 |
| 8630.JP | 2 |
| FDXF.US | 5 |
| HONA.US | 5 |
| KALMAR.HE | 5 |
| PLX.PA | 5 |
| SDZ.SW | 5 |
| SNDK.US | 5 |
| SOLV.US | 5 |
| SYENS.BR | 5 |
| TKMS.XETRA | 5 |
| VLTO.US | 5 |

There are also **89 price-verdict changes**. **0** match the exact quote-only result-change counterfactual using the old financial model and candidate quote. They remain unapproved financial-model changes; they are not blanket-exempted as prices. Full ledger: [verdict adjudication](./nightly-7-verdict-adjudication.json).

## Numeric loss and exact diff

**44 numeric-to-null occurrences** remain after aligning companies, fiscal years and memo questions, across **18 IDs**: dossiers **3**, index **9**, search **22**, history **10**. None belongs to a frozen ID. Multiple public representations count separately. This is a broader audit than nightly-6's same-year top-level series check.

The three dossier losses are:

- `PLX.PA` totalRoic FY2024: **2.3503176344037366 → null**.
- `PLX.PA` totalRoic FY2025: **0.9678057030772265 → null**.
- `VLTO.US` company.marketCapUsd: **23,082,354,688 → null**.

| Company | Store occurrences |
|---|---:|
| 1T5.MU | 1 |
| AMVIF.US | 3 |
| BDRFY.US | 1 |
| CDEVY.US | 1 |
| DHI.US | 1 |
| DSFIR.AS | 1 |
| GMD.AU | 1 |
| GNZ.NZ | 8 |
| HEN3.XETRA | 1 |
| HXGBY.US | 1 |
| IOS.DU | 3 |
| JUP.LSE | 1 |
| KDP.US | 1 |
| PLX.PA | 4 |
| S3Z.F | 8 |
| SDZ.SW | 5 |
| SIA1.F | 1 |
| VLTO.US | 2 |

There are also **876 removed numeric series observations** across 12 companies (874 in the ten spin-offs; one each in ACN and GMD). These are deletions, separately recorded from numeric-to-null. See [semantic losses](./nightly-7-semantic-numeric-losses.json) and [all store nulls](./nightly-7-semantic-store-nulls-summary.json). The semantic audit aligns stable identities; it does not mislabel shifted fiscal-year/list positions as losses.

Exact serialized comparison: **5,082 → 5,082 files**, **4,063 byte-identical**, **215,346 changed JSON leaves**, **2,539 exact quote-counterfactual exclusions**, **212,807 residual leaves**. No file additions/removals. The positional ledger has 3,008 numeric-to-null leaves; it includes row/year reordering, so the identity-aligned count above is the decision count. Residuals include metadata, ordering, merged features and substantive changes. The concrete unapproved verdicts, losses and missing histories prevent certifying them all as prices/new filings/approved fixes. Full evidence: [exact summary](./nightly-7-exact-summary.json), [residual ledger](./nightly-7-exact-diffs.jsonl.gz), [exact price exclusions](./nightly-7-exact-price-diffs.jsonl.gz).

## Live features and browser gate

- Since returns: **87 quarterly / 22 annual frames**, including the populated 2018Q3 summary.
- Short histories: **79 dossiers / 77 searchable** (live had 69 / 67). The two already-unfindable IDs remain `278470.KO` and `TLC.AU`; the extra ten short histories are regressions from lost predecessor coverage.
- Spin-offs: **0/10 predecessor histories retained**. Missing: FDXF.US, HONA.US, KALMAR.HE, PLX.PA, SDZ.SW, SNDK.US, SOLV.US, SYENS.BR, TKMS.XETRA, VLTO.US. All ten remain searchable, but their live predecessor data and verdicts regress.
- Price story: **2,708/2,708 dossiers** retain a price-story field. Browser coverage includes the story drawers.
- Feature details and the seven requested historical spans: [live features](./nightly-7-live-features.json).

The local Next server ran this exact store via `VALUE_STORE_DIR`, on port 3027. Four API responses (default index, US index, dossier shard 024 and search manifest) were compared with the candidate JSON and matched: [server/store receipt](./nightly-7-server-store-receipt.json). Gate paths: current index, 2018Q3, 2011, LULU, WKL, ADBE, GOOGL, KO, JPM, Toyota, Reliance, CBG, PLX and SOLV, including available drawers, search and filters. Viewports: 1728×970, 2056×1180, 1440×800, 390×844. Results: **581 states; 0 cut/overlap issues; 87 states with other findings (126 issue entries)**. The full gate retains its nonzero exit for those findings; only the cut/overlap subgate is described as passing if its count is zero. Missing spin-off controls also reduce exercised state counts relative to nightly-6. Evidence: [gate summary](./nightly-7-gate-summary.json), [full gate report](./nightly-7-gate-report.json.gz); screenshots remain in `.fix5c/nightly-7/gate/`.

## Unit suite and typecheck

Final `npx vitest run --maxWorkers=2`: **183 files passed; 1,947 tests passed, 1 skipped**. Full `npx tsc --noEmit --incremental false`: **exit 0**. `git diff --check`: passed.

The first full run found four stale test expectations, corrected without changing production behavior: the reset waiter's hourly probe reserves calls even when it fails; retained prior shares prevent a destructive refreshed jump; Japan stores unadjusted source years and checks split alignment on a working copy. A new regression test verifies a successful cheap probe immediately exposes the provider reset. The share-basis test now builds complete typed years with `emptyYear`, fixing the full typecheck error without a cast. Logs: [unit suite](./nightly-7-tests.log), [typecheck](./nightly-7-typecheck.log).

## Preservation

Final hashes prove **0 publish-repo file changes**, an unchanged `publish.hold`, unchanged 121-ID freeze, and an unchanged candidate throughout browser testing. No subagents, push, deploy, publish-repo writes or key output. Free disk: **30.07 GiB**; the 4-GiB stop threshold was never reached. The guarded exporter and browser gate both enforce the floor. Evidence: [preservation](./nightly-7-preservation.json), [candidate manifest](./nightly-7-candidate-manifest.json.gz).

The requested commit message is `value: nightly candidate verified with freeze`; “verified” records the completed audit, whose result is **NOT LIFT**.
