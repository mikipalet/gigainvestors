# Value performance implementation plan

**Goal:** Meet the owner's performance budgets, remove public share-resolution work, and verify locally without a deployment.

**Architecture:** ISR embeds quotes and compact initial rows. Publication emits content-addressed browser views with complete year identities; a same-origin route serves them with immutable caching. Client memory deduplicates requests and retains the previous frame during transitions. Share evidence remains in the private corpus; unresolved valuations publish the existing neutral missing-data state.

**Scope:** User's 2026-09-30 performance request, including interaction budgets and zero public verification wording. Execute inline; no subagents, push, deployment, or remote publication.

- [x] Record production-build baseline with the supplied perf/interaction scripts; retain raw artifacts in `/tmp/value-perf-1`.
- [x] Add tests for compact views, quote preservation, complete historical identities, independent share agreement, and public output sanitization.
- [x] Implement `lib/value/browser-view.ts`, publication of hashed views, same-origin data routing and deduplication. Keep historical rows independent of current valuations.
- [x] Render prices and the selected historical year in ISR. Load additional current rows only after first paint; preload years and drawer modules during idle/intent. Keep timeline input urgent and expensive view updates transitional.
- [x] Remove public checking/verification language and valuation flags. Audit every previously flagged company against applicable available sources; persist observations and residual IDs only in the private corpus and daily log.
- [x] Constrain and cache logos, inspect bundles/font preload, and measure full interaction matrix including search, filters, drawers, charts, paging, and timeline.
- [x] Run TypeScript, Vitest, Playwright, QA and flows; inspect screenshots and fix regressions. Record measured results and honest remaining gaps in the requested report.
- [x] Review the final diff and commit `value: performance pass`, preserving unrelated workspace changes.

## Resumed review and verification

The resumed review fixed ICO decoding, retained missing-data companies in country views, restored cached search verdicts/ratios and ticker aliases, audited new analyses before their first publication, and made unavailable valuations neutral gray.

Final verification: production build and TypeScript passed; 91 Vitest files / 1,168 tests; 12 performance/design-13 Playwright tests plus 4 shared-site regressions; both public-output scans; 35 viewport cases and 601 flow screens without issues. Mobile LCP 520–552 ms; home transfer 61.6 KB; historical views at most 58,434 gzip bytes. Worst interaction event 48 ms desktop / 80 ms at 4× CPU. All 372 audited quality passes resolved; 68 other cases remain private.

Report and full timing matrix: `/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/perf-1-report.md`. Raw measurements: `/tmp/value-perf-1/resume-*`.

The literal zero-movement interpretation remains qualified: requested chart/filter/drawer changes reposition content, while interaction CLS is zero and pending year loads retain the previous frame. Full drag input-to-matching-frame can exceed 100 ms when intermediate inputs are superseded. The original mobile timeout did not reproduce. These measurement limits are explicit in the report.

Only `.next` and the existing `~/value-corpus/staging/perf-1-final` were used for resumed build/staging work. No push, deployment or remote publication.
