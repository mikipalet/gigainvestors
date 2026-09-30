# Western markets implementation plan

Owner specification: 2026-09-30, “let’s refocus on what westerners can buy”. Execute inline, no subagents, no publish or deploy.

- [x] Add configured venue allowlist and deterministic home / US ADR / other Western listing selection. Test ADRs, OTC Y/F codes, Japan-only and mainland exclusions, cap priority.
- [x] Publish w on index/dossier/search records; retain global story/funnel/history and add Western populations. Test mixed populations and median denominators.
- [x] Use Western aggregates and rows by default; own Show all markets component persists markets=all. Label alternate listings and non-buyable search results. Test cards, dossiers and toggle.
- [x] Order fundamentals, price history and reports by buyability then cap before limits.
- [x] Rebuild an isolated local snapshot from live data, clear Next fetch cache, build and run tsc/vitest/Playwright. QA four routes at 1728×970 and 390×844; save final screenshots.
- [x] Record counts, names/trading listings, verification and snapshot provenance in requested controller report. Commit value: focus on what Western investors can buy.
