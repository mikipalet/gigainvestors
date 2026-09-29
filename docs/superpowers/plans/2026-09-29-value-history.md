# Task 14 implementation plan

Goal: implement the approved Task 14 contract and viz round 3 data requirements.
Architecture: analysis owns volatility, historical valuations, events and per-share series; a resumable price-history stage owns monthly prices; publish joins cached prices and emits compact ROIC data. SEC ticker resolution shares EDGAR's contact header and rate limiter.
Spec: docs/superpowers/specs/2026-09-29-value-design.md plus controller viz-spec-round3.md and Task 14 instructions.

- [x] Add failing analysis/price/publish tests for volatility boundaries, commodity override, historical prefix isolation, FX, events, per-share nulls and ROIC precision. Implement config/types and derivation, migrate every priceTest caller.
- [x] Record monthly EODHD/Yahoo and SEC ticker fixtures once. Add offline tests for parsing, refresh/force/filter, budget exhaustion, SEC resolution/cache and EU fallback. Implement price-history stage and EDGAR resolution.
- [x] Replace per-company buildOutput validation with a cheap shape guard; test malformed inputs and publish history integration.
- [x] Run npx vitest run tests/unit and npx tsc --noEmit, review diff, commit using the requested message, and write the controller report.

Constraints: no network in tests; numeric thresholds in config.ts; no subagents; stay in value-h-history worktree; preserve reporting valuation currency and convert historical ranges with today's FX and bond yield, explicitly stated. Do not publish externally.
