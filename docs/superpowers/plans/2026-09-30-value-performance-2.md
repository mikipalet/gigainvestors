# Value performance round 2

Scope: user brief, 2026-09-30. Work locally in the existing isolated worktree; no agents, push, deployment, or remote publication. Build only into `.next`, check `/` free space before each build, stop below 5GB. Reuse only `~/value-corpus/staging/perf-1-final` for local publication.

- [x] Restore legacy historical rows without inventing historical discounts; compare 2005, 2012, 2018 and Today in both scopes against source counts. Commit separately.
- [x] Split current quality rows from deferred filter cohorts in `publish-views.ts`; bound every automatic view to 80KB gzip and load other cohorts only on explicit filters/lists.
- [x] Replace all-year and all-search warming with connection-aware adjacent-year idle prefetch; preserve Today in memory, including historical landings.
- [x] Restore one short visible headline. Render stable initial row geometry, limit visible logo slots to 40, use available space for sparse columns, and remove mobile auto-margin above The rest.
- [x] Update the interaction harness and inp.mjs to observe DOM changes and subsequent paint for current UI selectors; retain layout-shift source diagnostics.
- [x] Publish locally into the existing staging directory; build, typecheck, run Vitest, Playwright, flows and design QA. Record before/after evidence and limitations in the requested report; commit performance pass separately.

Historical source caveat: 2005 has zero atBuy and null medianReturnAtBuy in both scopes. Tests must match that source, rather than require invented positive buys. Legacy pm is price/estimated value; exact buy-price bands require the newer historicalPrice contract.
