# Nightly 6 — verdict freeze implemented; full release gate not cleared

**Recommendation: KEEP HOLD under the requested all-change release condition.** The controller's 17:21 freeze is implemented and its byte-preservation gate passes. A LIFT recommendation is not supported by this exact candidate: **85 same-year numeric-to-null observations across 31 unfrozen companies remain unapproved**, and the full visual gate records whitespace failures. No unapproved quality-verdict flip remains. The requested commit title describes the implementation, not approval of those remaining data changes.

## Candidate and freeze

- **2,708 live dossiers → 2,708 candidate dossiers; no additions or removals.** **2,618 companies change** (including publication metadata); **90 remain frozen**. Nightly-5 has 98 RESIDUAL verdict rows but 90 distinct IDs, not approximately 95. Any residual freezes the whole company: TSCO's corrected management change therefore remains held alongside its residual economics change.
- Freeze definition: [verdict-freeze.json](./verdict-freeze.json), also installed at `/Users/miki/value-corpus/verdict-freeze.json` and in the replay corpus. Remove an ID only after verification to unfreeze it.
- The normal publisher reads the previous publication **before replacing any output**. In-place publication reads its fetched repository; `publish --out` reads the corpus's live `publish-repo`, independently of its destination. Frozen dossiers, country/default index rows, search rows/aliases, canonical aliases, history identities and historical snapshot rows are restored. Rows are replaced in place, preventing artificial historical row shuffling. Summary counts and browser views use the restored rows.
- Missing frozen dossiers, malformed freeze configuration, changed search routing, or search byte-budget violations abort publication. The private log is `corpus/staging/verdict-freeze.jsonl`, with the exact reason **"frozen until second-source check"**. It is outside the published file allowlist and is not shown on the site.
- **4,080 frozen records compared as raw JSON substrings: zero byte mismatches. Search alias identities: zero mismatches.** SHA-256 receipts are in [nightly-6-freeze-receipt.json.gz](./nightly-6-freeze-receipt.json.gz); the reproducible verifier is [nightly-6-audit.py](./nightly-6-audit.py).
- Final staged store: `/Users/miki/GitHub/superinvestors-wt/value-zp-nightly/.fix5c/nightly-6/after-final`.

## Verdict changes in the candidate

All **8** unfrozen quality-verdict changes were explicitly **APPROVED** in nightly-5. These are the changes that would go live if the controller releases this candidate; none has been published by this task.

| Company | Test | Live → candidate | Nightly-5 decision |
|---|---|---|---|
| 8253.JP | economics | fail → pass | APPROVED |
| 8253.JP | management | fail → pass | APPROVED |
| 8253.JP | accounting | fail → pass | APPROVED |
| CBG.LSE | understandable | pass → fail | APPROVED |
| CBG.LSE | moat | pass → fail | APPROVED |
| IBKR.US | moat | fail → pass | APPROVED |
| MU.US | economics | fail → pass | APPROVED |
| SCHW.US | moat | fail → pass | APPROVED |

Credit Saison's three changes use the issuer-supported lending classification; Close Brothers' two changes follow its checked FY2026 filing; IBKR's equity correction agrees with SEC observations; Micron's FY2026 economics inputs were checked against the issuer; Schwab's classification is supported by its holding-company filing. TSCO is excluded because its company remains frozen.

## Master and live features

Merged `origin/master` twice: initial live since/drawer/short-history/spin-off changes, then price story through **65a812925e7dc5653a2ea40b1759b4b3128e19c5**. The price-story merge landed during this task. Final master ancestry was checked; no push or deployment occurred.

The replayed store has **87 quarterly and 22 annual history frames**, with since-return summaries, **69 short-history dossiers**, **67 short-history search/index identities**, **10 predecessor-backed companies**, and **2,708 price-story dossier fields**. The two short-history dossiers absent from search (`278470.KO`, `TLC.AU`) are also absent from the live publication; this task reproduces that existing behavior. All ten predecessor companies remain searchable: PLX, SOLV, FDXF, TKMS, KALMAR, HONA, VLTO, SNDK, SDZ and SYENS. Feature evidence is [nightly-6-live-features.json](./nightly-6-live-features.json).

The seven requested source-history spans remain:

| Company | First–last fiscal year |
|---|---|
| EQNR.OL | 1998–2025 |
| 4043.JP | 2013–2026 |
| 3457.JP | 2013–2026 |
| EVN.AU | 2005–2026 |
| NTRS.US | 1996–2025 |
| AENA.MC | 2011–2025 |
| HMSO.LSE | 1996–2025 |

## Replay, exact comparison, and remaining non-verdict changes

Final replay covered **all 2,716 index members** consumed by the publication pipeline: **2,514 rebuilt, 202 unchanged, zero failed**. A preliminary all-universe run was stopped after establishing the publishable scope; it is not claimed as a completed universe replay. Each member has a current fingerprint. Existing source caches were reused, and cached filing-answer evaluation was permitted by the replay guard. History returns: **0 refreshed, 2,079 current caches, 0 failed**.

Normal `publish --out` completed with exit 0. Its 2,714 loaded-analysis count includes analyses withheld by the existing eligibility rules; the independently enumerated public dossier count is 2,708. The export was repeated after fixing unnecessary freeze row reordering. The current store is that final export.

The live baseline advanced externally from `30e4ddb2` to **43d5c33f** when the controller published price stories. Final freeze receipts and the exact comparison use **43d5c33f**, not nightly-5's older baseline. The end-to-end hash audit found **zero live-file changes since that final baseline** and an unchanged `publish.hold`. The task's replay guard rejects all writes to any `publish-repo` path and writes outside its staging tree.

Exact comparison: **5,082 → 5,083 files**, **4,068 byte-identical files**, **457,329 changed JSON leaves**, **2,119 exact quote-counterfactual exclusions**, **455,210 other leaves**. Those other leaves include authorized merged features, timestamps, structure/order changes and financial changes; they are **not** all claimed to be unapproved financial facts, nor are they blanket-labelled APPROVED/CORRECTED. The complete exact ledger is [nightly-6-exact-diffs.jsonl.gz](./nightly-6-exact-diffs.jsonl.gz), with [summary](./nightly-6-exact-summary.json) and [price exclusions](./nightly-6-exact-price-diffs.jsonl.gz).

The concrete remaining source-agreement gap is **85 numeric-to-null observations outside the 90 frozen companies**. This includes 50 `sbcToOcf`, 11 `retainedEarnings`, 7 `totalRoic`, and 17 other observations. Most affected companies retain the same filing period and publication date, so a generic new-filing exemption would be unjustified. No additional freeze scope or blanket approval was inferred. The user was asked whether to extend the freeze to unapproved non-verdict changes; absent a new ruling, the requested 90-company scope is retained. Exact values and years are in [nightly-6-same-year-nulls.json](./nightly-6-same-year-nulls.json).

| Affected company | Same-year numeric-to-null observations |
|---|---:|
| 1299.HK | 1 |
| ANDR.VI | 3 |
| ATS.VI | 5 |
| CAI.VI | 4 |
| CPI.VI | 4 |
| EDP.LS | 2 |
| EDPR.LS | 1 |
| EGL.LS | 1 |
| EVN.VI | 2 |
| GALP.LS | 2 |
| GIL.TO | 2 |
| GJF.OL | 1 |
| GVR.IR | 3 |
| HFG.LSE | 12 |
| HTWS.LSE | 2 |
| IBKR.US | 1 |
| JMT.LS | 1 |
| KRZ.IR | 2 |
| LNZ.VI | 3 |
| POS.VI | 6 |
| POST.VI | 3 |
| PYIYF.US | 1 |
| SATS.OL | 4 |
| SBO.VI | 3 |
| SHRIRAMFIN.NSE | 1 |
| SON.LS | 1 |
| SREN.SW | 1 |
| STR.VI | 3 |
| VER.VI | 3 |
| VOE.VI | 4 |
| WIE.VI | 3 |

## Tests and browser gate

**188 tests in 11 focused files pass**, including normal/in-place publication, fresh local output, freeze removal, missing-baseline failure, row ordering, predecessor history, source corrections, selected-source price stories, and since-related behavior. Scoped TypeScript checking and `git diff --check` pass. A price-story test initially encountered a `du` race against the replay's temporary files; the complete final test run passed after the replay finished. The full repository suite is not claimed.

The release gate ran against **this exact local staged store**, covering the current index, 2018Q3, 2011, eleven dossier routes including PLX and SOLV, their drawers, price stories, filters and search at **1728×970, 2056×1180, 1440×800 and 390×844**. Results: **665 states; 0 cut/overlap issues; 155 states with other gate findings**. Full gate output is [nightly-6-gate-summary.json](./nightly-6-gate-summary.json) and [nightly-6-gate-report.json.gz](./nightly-6-gate-report.json.gz). The full gate is not represented as passing when whitespace thresholds fail. The first 1440×800 pass exposed three clipped source/calculation links in Alphabet’s business drawer. Short desktop business tables now show four recent annual rows instead of six, retaining the full charts and all source links. The complete 1440×800 sweep was rerun after that fix; the other three viewport sweeps use unchanged layout behavior. Screenshots remain under `.fix5c/nightly-6/gate/`; selected evidence: [Alphabet before](./nightly-6-shots/googl-business-before.png), [Alphabet fixed](./nightly-6-shots/googl-business-after.png), [Adobe desktop](./nightly-6-shots/adbe-page.png), and [Pluxee mobile](./nightly-6-shots/plx-mobile.png).

## Preservation and disk

`publish-repo` was read-only throughout this task; its price-story transition was the controller's publication. `publish.hold` was neither modified nor removed. No subagents, push, deploy or key output. The original corpus write was limited to the requested freeze definition; replay and private publish logs use the isolated staging corpus. The report is copied verbatim to the requested sibling-worktree path.

The superseded nightly-5 output store and the first nightly-6 gate screenshots were deleted. Source corpora and durable prior reports remain because they back replay caches/evidence. Free disk at packaging: **30.33 GiB**, above the 4 GiB stop-and-commit threshold; no disk stop occurred.

**The freeze and eight-approved-flip gates pass. The requested all-change release gate does not yet pass, so LIFT is not recommended for this exact store without a further controller ruling or verification of the remaining non-verdict changes.**
