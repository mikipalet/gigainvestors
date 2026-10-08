# Evolve-1 implementation plan

Specification: frozen principles.md at commit78f5e87. Execute inline; no agents. Research freeze precedes every code edit. Candidate code and parameters must also be sealed before returns are opened.

- [x] Primary-source chronology, full rule attribution, judgment gaps and candidate specification.
- [x] Complete independent live snapshot, source/archive hashes, loopback-only and read-only-live proof wrapper.
- [x] Meaningful failing fixtures: discount/return separation and monotonic price gate; missing/low bond boundaries; earnings improvement despite market rerating, falling EPS despite rising stock, missing EPS.
- [x] Implement government-discount candidate and economic-progress candidate in independent frozen engines; seal source hashes.
- [x] Recompute baseline3.6.0 and each candidate/combined on research-1/rules-5 inputs; absolute/delta CAGR/drawdown, hit rates/new buys/losers; enforce only owner2pp/5pp gates.
- [x] Apply accepted changes; update all affected explanatory displays and method3.7.0/changelog with primary citations.
- [x] Fetch and merge origin/master with shipped rules-7; re-run candidate/baseline computations as needed and all release proofs without buy approvals.
- [x] Full cached analysis, full unit suite, production build, ordinary publish--out diff, REAL isolated publish and post-check, browser8 companies×2sizes.
- [x] Rebind/reprove if live changes; final checks outside03:00–09:45UTC; package evidence/overlay/controller env-file commands; secret scan; final commit and copy cleanup.

Hard stop: if / or ~/data below4GiB, terminate this task's copying/computation, preserve evidence, write NOT report, commit and delete disposable copies. Never touch the runner lock, value-rules worktree, production corpus or remote publication.

Status 2026-10-08 11:26 UTC: all items executed; see report.md. rules-7 had not shipped; origin/master (ecc27a1, devices fixes) merged and re-proved. Government-discount candidate NOT shipped (owner veto).
