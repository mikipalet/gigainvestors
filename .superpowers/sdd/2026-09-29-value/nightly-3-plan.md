# Nightly path correctness plan

Goal: preserve prior same-period facts on lossy vendor refresh; adjudicate all quality flips against filings; replay and report an honest release recommendation.

Constraints: isolated value-zp-nightly worktree; no subagents; no publish-repo writes, push, deploy or publication; hold remains. Check free disk before writes and during replay; below 4 GiB stop with the requested commit. Never log credentials. Cache-first; Jev permitted and EODHD only under its daily guard.

- [x] Reproduce refresh loss in fundamentals-stage tests (missing/null fields, omitted periods, explicit zero/restatement, currency mismatch, provenance).
- [x] Add merge at refresh boundary with immutable prior snapshot provenance and recomputed integrity; test normal analyzer/publication behavior.
- [ ] Inventory prior and refreshed facts for all affected companies; recover only from source snapshots, never from live verdicts.
- [ ] Classify the 105 unchanged-source flips using numeric/Jev/judgement differences, code history and data paths. Verify three cases per cause group against filings; retain unresolved cases explicitly.
- [x] Fix demonstrated pipeline defects with failing regressions, and identify filing-backed cases where live was wrong.
- [x] Run unfiltered cache-first analyze, normal business-backfill, local publish --out, exact diff and per-quality-flip/removal adjudication.
- [x] Record reproducible evidence, intended changes and blockers in nightly-3-report.md; copy report to requested value worktree path; commit value: nightly path correct and stable.

Execution note: full pipeline-24 replay and a second unfiltered pass completed (1 written, 38,055 unchanged, zero failures in the final pass). The original source groups and filing spot checks are recorded, but per-flip adjudication remains incomplete; KEEP HOLD is expected. Full prior normalized bodies were not archived before the earlier vendor refresh and cannot be reconstructed from inventory hashes.

Final gate: 139 quality flips, five filing-backed and 134 UNEXPLAINED; zero dossier removals. KEEP HOLD. The commit does not complete the zero-unexplained target.
