# Quarterly time travel implementation plan

**Goal:** Implement the owner's six-part quarterly history specification, locally, without touching business drawers or publishing remotely.
**Design:** Preserve annual quality inputs and the existing valuation/IRR. Add a filing-aware interim selector, calendar-quarter snapshots, compact publication, and quarter-mode navigation. Keep legacy yearly contracts as Q4 aliases.
**Binding contract:** `/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/design-contract.md`.
**Constraints:** No subagents; existing isolated worktree; one local staging directory; builds only in `.next`; stop below 5 GB free; no keys in output.

- [x] Test quarter enumeration, filing cutoff, annual fallback, four-quarter/two-half aggregation, missing periods and later amendments.
- [x] Implement `lib/value/quarterly-inputs.ts` and `quarterly-snapshots.ts`; preserve annual-only quality and date-bound stored judgement. Reuse valuation and IRR without synthetic annual observations.
- [x] Extend `history-snapshots.ts`, history types, browser views and publication with quarters, per-quarter summaries, date provenance, expected returns and <=60 KB compressed primary views.
- [x] Update ValueIndex and QuarterSlider quarter mode, year labels/quarter ticks, `?q=` navigation and legacy `?year=` Q4 mapping. Preserve text search under `search`.
- [x] Build one local history staging store. Reproduce KO/AAPL/GOOGL/WKL/Toyota observations for requested quarters and list every quarter's counts in the report.
- [x] Run tsc, vitest, Playwright, knip and prefetched-step performance checks; inspect responsive screenshots. Record limitations with evidence.
- [x] Write quarterly-1-report.md at the requested path and commit `value: quarterly time travel`.

Validation notes: 17 numerical audit cases reproduced; three were correctly excluded by price/annual-history coverage. Knip has eight baseline findings, no new ones. The shared release gate still rejects inherited drawers; the home/history page states pass. See the requested quarterly-1-report.md for exact commands, counts and limits.
