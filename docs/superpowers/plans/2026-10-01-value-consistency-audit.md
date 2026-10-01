# Value consistency audit

User-authorized scope: local fixes and one commit; no agents, push, deployment or remote publication. Use this existing worktree, `.next` for builds, `.audit/staging` as the only staging directory, and stop below 5 GiB free.

- [x] Reproduce LULU tile/drawer mismatch with rendered-component tests; use the including-acquisitions metric consistently in chart, summaries and annual bars, preserving explicit supporting definitions.
- [x] Publish reporting-currency annual net cash from normalized cash + short-term investments less debt, preserving missing years and avoiding aggregate double counting. Test known cash-source variants.
- [x] Use one compact sortable company list for all list drawers, fitted width/height, logo, return, price need, distance and capital return.
- [x] Select and record a deterministic cohort of 60 published companies plus two required absence cases covering buys/near misses, largest index members, Berkshire holdings and regional/financial samples. Extract actual rendered values/series and compare all surfaces against the staged published JSON; mutation tests must catch drift.
- [x] Record 25 independent annual financial and Yahoo quote comparisons plus hand valuation calculations, with source URLs, dates and explicit residuals.
- [x] Run design and drawer geometry audits, cross-surface checks, TypeScript, Vitest, Playwright and knip. Inspect changes and write the requested report before the requested local commit.
