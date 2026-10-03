# Nightly 4 implementation plan

User specification: attribute all nightly-3 quality flips; repair missing-data regressions; sample each causal class against three issuer filings; rerun local replay/diff; commit and retain publish.hold.

Architecture: consume frozen live dossiers and preserved source observations, compare exact numeric test inputs and replay input-group counterfactuals. Historical inputs inferred from public series are explicitly labelled reconstructions and must reproduce the released numeric result before attribution. Never label missing historical evidence a vendor restatement. Filing approval is separate from mechanical attribution.

- [x] Inventory live/new inputs, versions, fiscal windows and missing-data paths.
- [x] Add tested attribution engine and CLI recording input deltas, reproductions and counterfactual outcomes.
- [x] Reproduce completion history-loss regressions with tests, preserve prior valid facts when an unverified replacement invalidates history, repair filing-proven source errors.
- [ ] Validate three members of each observed class against primary filings and cached EODHD actions; retain blockers for unproved claims.
- [x] Replay all analyses and local publishing under guards; run exact diff and attribution again.
- [x] Write nightly-4-report.md plus machine-readable per-flip evidence and verdict-change inventory; commit `value: every nightly verdict change explained`.

Constraints: no subagents/push/deploy/publish; hold unchanged; no secrets in logs; disk floor 4 GiB (stop with commit); existing isolated worktree. Use frozen/hardlinked source corpus and copy-on-write outputs to conserve disk. Run meaningful failing-then-passing regression tests, focused typecheck and diff checks. KEEP HOLD if any evidence or regression target remains unsatisfied.

Outcome: KEEP HOLD. 33 original flips resolved, 106 remain; 94 remain unapproved (19 old numeric verdicts unreproduced). Zero verdict-to-n/a regressions, but seven broader nonrolling history-start losses and source-validation gaps remain blockers. Three filing samples per every proposed class and zero UNEXPLAINED were not achieved.
