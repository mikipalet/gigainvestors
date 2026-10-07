READY

GOOGL, NVDA and MSFT now use owner earnings with stock compensation charged once and normal margins applied to today’s revenue. The release changes 163 quality verdict sets and 2496 comparable value ranges (plus 28 safety-margin-only changes) across 3,915 companies. It changes **zero Buy verdicts**. The existing 151 explicitly frozen records also remain byte-for-byte intact under the unchanged publication guards. There are **26 proposed Buy flips**, all unapproved; each proposal’s complete live record is preserved in the release candidate.

- **GOOGL:** cash for owners fail → pass; estimated value $115.42 → $239.99; Buy price $86.56 → $203.99; quoted price $347.68; expected annual return 5.13% → 7.79%.
- **NVDA:** quality verdicts unchanged; estimated value $25.30 → $123.94; Buy price $12.65 → $61.97; quoted price $239.24; expected annual return 3.67% → 6.66%.
- **MSFT:** cash for owners fail → pass; estimated value $193.46 → $319.04; Buy price $145.09 → $271.18; quoted price $529.30; expected annual return 5.56% → 7.26%.

Quality codes are understandable / moat / economics / management / accounting: P = pass, F = fail, U = unknown. Values above are the actual released candidate, including any required continuity; computed proposals are separate.

**Proposed approval manifest:** [full before/after evidence](evidence/proposed-buy-approvals.json). Proposed IDs: ADBE.US, INTU.US, NTES.US, BR.US, NVR.US, LDOS.US, SEIC.US, OSK.US, SSD.US, CRUS.US, EXP.US, TGS.US, FCN.US, NTB.US, ITRN.US, CFG-PH.US, 259960.KO, 001800.KO, 0700.HK, 600519.SHG, 300760.SHE, 000786.SHE, IPS.PA, SIQ.AU, CURY3.SA, DNP.WAR. Each entry includes all five quality tests and evidence, full valuation, Buy price, quote/date, expected return, filing and balance sources, and complete before/proposed dossier and index record. Nineteen proposals have bound primary-filing URLs. Seven (259960.KO, 0700.HK, 600519.SHG, 300760.SHE, 000786.SHE, SIQ.AU, CURY3.SA) have only cached statement provenance and are explicitly not ready for Buy approval without primary-filing verification. Their actual source files and hashes are included in `approval-source-evidence.tar.gz`; no filing citation is invented. Approved manifest remains `[]`; no proposal is silently enabled.

What changed

- Removed the second SBC deduction from the net-income bridge. The OCF bridge still deducts SBC. The existing five-year-total cash-conversion presentation is retained.
- Replaced the minimum of median/latest/TTM dollar earnings with the median of the last five annual owner-earnings margins × current annual or complete newer TTM revenue, for every operating company. The bridge labels its scaled estimates rather than presenting them as current reported flows.
- Applied the same estimated maintenance-capex model to TTM, with annual PPE/revenue context. Cleared inherited annual maintenance judgements and assembled actual quarterly consolidated-profit and lease flows; missing lease evidence stays explicit.
- Fixed mixed-period parent allocation (TTM parent earnings had been paired with annual consolidated earnings), and restored the OCF fallback when NI is absent but D&A is present. That fallback uses the available maintenance estimate consistently.
- Fixed publication balance-refresh FX conversion and used cached same-issuer SEC/current-vendor ordinary-share agreement through the existing independent-source reconciliation. No new vendor acquisition, tolerance change or cap-check bypass.
- Restored currently indexed canonical issuers missing from the raw universe and honored already-published dynamic aliases in release membership.

Edge cases and remaining accounting limitations

The [pre-evaluation decisions](plan.md) require five consecutive, finite annual margins with positive revenue. Missing history cannot be replaced by older profitable years. Zero/negative median margins and nonpositive current revenue produce no positive earnings valuation; tiny positive margins are retained without a fitted floor. Loss years stay in cyclical margins. Revenue collapse reduces current scale immediately, the three-year decline override still sets growth to zero, and the cyclical safety discount remains. Five years may not span a complete cycle. Financial book-value/ROE and NAV methods keep their own paths. Retained published valuations are visibly retained evidence, not newly computed estimates.

Three reported accounting concerns remain ambiguous with the available fields: required maintenance working-capital reinvestment versus total cash working-capital changes; issuer-specific operating-lease/ROU maintenance overlap versus financing principal; and cash-attributable after-tax interest versus generic interest income. Balance deltas, a universal lease percentage, and an invented cash yield would guess the missing accounting facts. These limitations are documented in valuation assumptions. Explicit capitalized lease financing cash remains charged; operating lease cash is not newly deducted. No claim is made that these unresolved model limitations have been eliminated.

Backtest — reported, not a veto

Method 3.6.0 — owner correctness override, 7 October 2026

Replay coverage: 2,058 identities and 99,691 company-quarter rows; 93,961 paired, 5,572 reporting/trading-currency mismatches excluded and 158 snapshots unavailable.

Annual-return changes below are percentage points against the same baseline. Training is 2005–2015; later is 2016–2026. U.S. later is CONTAMINATED by prior inspection and is not an untouched holdout. The legacy return gate rejects SBC/current-scale/combined; accounting correctness still ships under the explicit owner instruction.

| Correction | U.S. train | U.S. later (contaminated) | Western ex-U.S. train | Western ex-U.S. later | All ex-U.S. train | All ex-U.S. later |
|---|---:|---:|---:|---:|---:|---:|
| SBC charged once | +0.218 | -1.280 | -0.714 | -0.399 | -0.613 | -0.295 |
| Current revenue × median margin | +3.682 | +1.752 | +2.622 | -1.650 | +2.302 | +0.025 |
| TTM maintenance estimator | +0.188 | -0.014 | +0.361 | -0.083 | +0.328 | +0.005 |
| Same-period parent allocation | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 |
| Missing-NI OCF fallback / maintenance | +0.000 | +0.000 | +0.000 | -0.220 | +0.000 | +0.036 |
| Flow corrections together | +0.000 | +0.000 | +0.000 | -0.220 | +0.000 | +0.036 |
| Combined shipping accounting | +2.791 | +0.943 | +3.306 | -2.072 | +3.079 | +0.089 |

The complete decision-metrics.json and backtest-fixes.csv retain drawdown changes, missing-return allocations, new-buy cohorts and legacy gate results. Positive drawdown delta means a less severe worst drawdown. This is a retrospective diagnostic with survivorship, restatement, present bond inputs and incomplete return/FX coverage; no causal or point-in-time performance claim.

Raw-provider TTM flow clearing has no separate historical replay effect: quarterly-snapshot replay already constructs its own TTM flows and does not call raw trailingInputs. Its regression fixtures demonstrate the cleared annual judgement/lease/consolidated-profit leakage. FX-refresh, canonical-identity and cached-share publication fixes are publication-layer corrections outside this historical engine; historical return impact is not measured, and is not presented as zero. Their complete current-release impact is in the release audit and proposal manifest.

Ambiguous maintenance working-capital reinvestment, issuer-specific lease/ROU overlap and cash-attributable after-tax interest remain disclosed limitations. No invented adjustment is included in the replay or release.

Rules-5 blockers

- RACE.MI and STLAM.MI were absent from the loader, while aliases still pointed to them. Static-only release filtering compounded the omission. Both canonical dossiers and current memberships now survive the ordinary and REAL publisher.
- The REAL logo failure was the same two omitted canonical issuers. The comparable-value losses came from publication FX/share-input handling; the old snapshot also drifted in 1,309 inputs. This release starts from a fresh independently copied snapshot, rather than reusing that snapshot.
- All 33 specifically lost rules-5 comparable valuations are present in both outputs. The unchanged production logo, valuation, page, issuer-alias, capitalization and Buy guards pass. [Per-company root causes and values](evidence/blocker-resolution.json).

Verification and handoff

- Fresh independent, symlink-dereferenced input copy: 789,963 source files and 6,278 archive files, live archive `c6b12018c04a6a70bdaa41cd58844c2f941062cd`. Complete end checks found no source/archive drift or added inputs. Binding checks ran outside 03:00–09:40 UTC (2026-10-07T12:05:13.323773+00:00 to 2026-10-07T12:12:12.453981+00:00).
- Full cached nightly scope: 38,281 jobs, 38,270 written, 0 unchanged, 11 unavailable/changed cached readings retained exactly from the bound source; zero unexpected failures. No limit or selected-company shortcut.
- Full unit suite: 260 files, 2,509 passed, one skipped. Production build and standalone TypeScript check pass. Ordinary `publish --out` passes. REAL publisher passes with a local bare remote, local Blob stub and every production guard; local post-publish checks pass.
- Browser gate: GOOGL, NVDA, MSFT, AAPL and COST at 1728×970 and 390×844; 130 candidate interaction states, 30 quality-surface audits and 10 price-surface audits, zero new findings. Existing 12px owner chrome/whitespace, unchanged mobile Method-table overflow and identical legacy semantic discrepancies remain listed, not counted as newly passing semantics. Ten final cash-for-owners screenshots were personally inspected, alongside price/normalization evidence.
- Complete unapproved records match live bytes across dossier, index, history, search and price records. Ordinary and REAL core records match apart from run-clock price-story timestamps. Stub Blob bytes and its version hash match the local published archive; local remote HEAD matches and the archive is clean.
- [Controller commands](controller-commands.md) use the publish-token env-file for publish and post-publish, verify source/archive/code bindings, and preserve zero approved Buy changes. They are documentation only and were not executed. The bundle is `~/data/value-rules/release-bundle-rules-6`; its manifest binds the final local code commit and all artifacts.
- Commit subject: `value: 3.6.0 values owner earnings correctly`. The exact SHA is in the final bundle manifest. No external push, deployment or publication was performed. No subagents or EODHD acquisition. The actual daily-runner lock was never opened or modified.

**Execution exception:** an initial unit-test invocation ran before the read-only namespace wrapper was applied. It is not the final test proof. All subsequent test/publisher/browser proof runs used a read-only live-corpus mount and a network namespace with only loopback; fixture home was redirected. The complete final hash and added-file checks establish the live source/archive state, but do not retroactively prove that the initial invocation made no transient writes. This procedural lapse is disclosed rather than described as perfect isolation.

Disposable snapshot, baseline, replay engines/inputs, candidate, local remote/Blob, test fixtures and build copies are deleted after verified packaging. The release bundle and compact review evidence remain; pre-existing owner bundles/backups/tmp and the dependency target are untouched. Disk remained above 4 GiB throughout; minimum and final free bytes are in the verification and cleanup receipts.
