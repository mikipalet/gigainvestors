READY

Branch `value-devices`, based on `master` 6f7e0c1. No push, no data publication, no daily-runner lock or `~/value-corpus` access.

Production audit notes are in `docs/value/devices-1/findings.md`. Playwright covered Chromium and WebKit with touch/mobile emulation at 390x844, 375x667, 820x1180, 768x1024, 1180x820, and 1024x768 across `/`, `/index`, five investor pages, `/value`, and stock pages including GOOGL, NVDA, KO, NTES, JPM, Toyota `7203.JP`, Samsung `005930.KO`, AAPL, MSFT, and DPZ.

What was broken and fixed:

- iPad company dossiers clipped the lower quality checks, so some evidence buttons could not be tapped. The tablet dossier now compacts the reference band, moves repeated business prose into the existing drawer, and gives the six checks bounded rows. Before: `screenshots/prod-probe-768-_s_GOOGL.png`, `screenshots/prod-probe-1024-_s_GOOGL.png`. After: `screenshots/final-dev6-webkit-768x1024-_s_GOOGL.png`, `screenshots/final-dev6-chromium-768x1024-_s_GOOGL.png`.
- Phone company pages buried the quality checks and valuation below several screens of scrolling, and WebKit 375x667 could place valuation under the bottom bar. Phone dossiers now show all checks as 44px evidence buttons with full detail still available in drawers, and short phones clamp the price story line. Before: `screenshots/prod-chromium_s_GOOGL.png`. After: `screenshots/final-focus3-webkit-375x667-_s_GOOGL.png`, `screenshots/final-dev6-chromium-390x844-_s_GOOGL.png`.
- The Value shelf clipped on 375x667 and could render blank if the first ResizeObserver delivery was missed. Short phones now show one buy card plus the existing list drawer for the rest, and the shelf measures immediately with viewport fallbacks. Before: `screenshots/prod-probe-375-_value.png`. After: `screenshots/final-focus4-chromium-390x844-_value.png`, `screenshots/final-dev6-chromium-375x667-_value.png`.
- Touch targets in the dock, filters, drawer close buttons, pagination, list controls, and evidence buttons were often under 44px. Coarse-pointer CSS now gives those controls 44px targets without changing desktop chrome. Before: `screenshots/prod-chromium_.png`, `screenshots/prod-chromium_value.png`. Desktop non-regression: `screenshots/final-dev6-chromium-1728x970-_value.png`, `screenshots/final-dev6-chromium-1440x900-_value.png`.
- The Method drawer overflowed sideways on iPad because the column layout was fixed inside a narrow dialog. Tablet Method drawers now use a single scrollable column. Before: `screenshots/prod-chromium-768x1024-_s_GOOGL-aboutmethod.png`.
- Browser Back left the page instead of dismissing drawers, and Search lacked a visible close control. Drawers and Search now use a transient overlay history entry, Search has a visible 44px close button and focus containment, and company search navigation no longer closes the overlay before assigning the new URL. Evidence: `before-navigation.log`, `after-navigation.log`, `after-search-devbundle-audit.jsonl`.
- Local `/index` had no route in this checkout even though production redirects it. Added a route-handler redirect from `/index` to `/`.
- WebKit ResizeObserver loop warnings in charts were reduced by committing width changes in `requestAnimationFrame`.

Verification:

- Production crawl evidence: `prod-audit.jsonl`, `prod-japan-audit.jsonl`.
- Local Playwright regression: `BASE_URL=http://localhost:3998 DIRECT_STATIC=0 LABEL=final-dev6 node docs/value/devices-1/regression.cjs` passed; log: `final-regression.log`.
- Focused Search keyboard/select/back-forward check passed; log: `after-search-devbundle-audit.jsonl`.
- `npx next typegen` passed; log: `typegen-final.log`.
- `npx tsc --noEmit` passed; log: `typecheck-final.log`.
- `npm test` passed: 260 files, 2509 tests passed, 1 skipped; log: `unit-final3.log`.
- `npx next build --webpack` passed; log: `build-final2.log`.

Left unfixed / notes:

- The default `npx next build` still uses Turbopack and fails with the symlinked out-of-root `node_modules`; this was already called out by the owner. The requested compatible command, `npx next build --webpack`, passes.
- During heavy local Playwright runs, the live dev server occasionally returned transient JSON/static parse failures that later returned 200. The production matrix for valid URLs did not show a persistent app defect, and no data files or published data were changed.
- The broad exploratory interaction harness remains intentionally noisy for some tap/strict-selector paths. The focused regressions for the real fixed defects passed, and the scripts/logs are kept for follow-up if the harness itself should be hardened.
