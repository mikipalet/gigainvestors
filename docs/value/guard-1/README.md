# Publication coverage gate

Every full/price commit compares coverage with origin/main (HEAD for an isolated archive with no remote ref). Immediately before push, the same invariant gate is repeated against the actual remote SHA, followed by rendering 20 company pages. Missing previous archives fail closed. Local `--out` remains a non-publishing inspection path. It cannot upload without a publication receipt.

Coverage counts are derived from archived dossiers and indexes, never mutable metadata totals. They cover missing logos; public, same-currency valuations; scored companies with all five tests evaluated as pass/fail; dossiers; index rows by country; buys by country/default/all/Western market; and usable monthly price history. For each count, declines greater than max(5 companies, 1% of the previous count) fail. An empty replacement also fails. Previously published logo losses have **zero tolerance**, even when other new logos offset the total. Each retained dossier/index row is protected independently, including a company whose other surface already lacked a logo; leaving a filtered index is normal count churn when remaining logos survive. Logo coverage requires both dossier and index references, with SHA-256 validation of local image assets. This can report more missing logos than an index-only count.

Before push and before Blob upload, the real Company component renders a deterministic sample of 20 pages, spread across the largest countries with logo-bearing companies prioritized. Rendering includes candidate quotes and checks company content and logo img markup. After publication, Playwright loads the same routes and checks company content, HTTP success and decoded logo pixels, alongside existing time-travel checks. Any sampled failure fails closed. No amount of count growth hides a broken sampled page.

Blob upload requires the durable receipt created before push. Verification compares against receipt.before and rolls back on coverage or browser failure. Recovery uploads must exactly match the previous tree. Missing/corrupt baseline data cannot authorize publication. Direct use of scripts/protection/upload-blob.ts is subject to the same gate.

The nightly runner prints a coverage line before stages, forwards the publication gate summaries/errors, and prints post-publication page results. This includes nights with skipped publication or exhausted provider budgets. A coverage rejection makes the runner exit unsuccessfully after checking for pending recovery.

## Explicit review manifest

`scripts/value/approved-coverage-changes.json` is checked into code and starts empty. Each exception requires the exact previous **40-character data commit SHA**, a metric, exact affected IDs, a reason, and HTTPS evidence. Wildcards are rejected; approvals for another baseline do not apply. Example shape (not an active approval):

```json
{"version":1,"approvals":[{"baseline":"<40-character previous published SHA>","metric":"logos","ids":["EXAMPLE.US"],"reason":"Reviewed incorrect issuer logo must be removed","evidence":["https://issuer.example/review"]}]}
```

Metrics are `logos`, `missingLogos` (new missing logos), `valuation`, `quality`, `priceHistory`, `dossiers`, `index:US` (or other country/default), `buy:US` (or other country/default/all/western), and `pages`. A reviewed logo removal also accounts for its missing-logo increase. Each other affected metric needs its own review. Page failures are stricter than count tolerance and require `pages` exceptions. Existing exact verdict-change approvals remain enforced for unexplained buy transitions; coverage buy exceptions also authorize their specified reductions.

## Evidence

- Regression test first failed because the old gate allowed US missing logos 13 -> 148, then passed after the guard.
- Read-only comparison of data `5d00e88562ca5e38720159e4c917a93b6da2aa6e` -> `2d7f1d84db5b28e474a04b8b7f94b29621acbb5f` rejects 153 lost logos across countries. Raw US index missing-logo counts are exactly **13 -> 148**. Dossier + index + asset validation reports US **17 -> 150** and global **32 -> 201**. Full counts and affected IDs are in `archive-regression.log`.
- All test repositories, browser responses and corpus fixtures are isolated under TMPDIR, outside the real corpus. Local Git remotes in rollback tests are temporary bare repositories; no external push, upload or publication was executed.

Validation: the final 176-test publication suite passed (10 files), including all 12 nightly runner tests and the independent dossier/index logo regression cases. TypeScript and shell syntax checks passed. A read-only render of 20 real archived company pages passed. Logs are retained alongside this document.
