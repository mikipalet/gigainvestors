# Phone and iPad audit — 8 October 2026

Production was inspected first, with Playwright Chromium and WebKit, touch enabled and mobile emulation, at 390×844, 375×667, 820×1180, 768×1024, 1180×820 and 1024×768. Raw actions, console errors, request failures, target sizes and viewport measurements are in `prod-audit.jsonl` and `prod-japan-audit.jsonl`. Screenshots are relative to this directory. The audit includes `/`, `/index`, five investors (HA, BRK, PSH, SAM, FS), `/value`, and GOOGL, NVDA, KO, NTES, JPM, Toyota (7203.JP), Samsung (005930.KO), AAPL, MSFT and DPZ. `/s/7203.T` was an incorrect probe URL; its 404 is not a site defect. `/index` redirects to the investor home.

## F1 — Quality checks clipped and unreachable on portrait iPad — high

- Devices: 820×1180 and 768×1024; also badly compressed on 1024×768.
- URL: https://gigainvestors.com/s/GOOGL (also reproduced across other dossiers).
- Steps: open the company; try tapping Cash for owners, Value created per $1 kept and Honest profits. The locked page clips the lower rows. Playwright tap times out.
- Before: `screenshots/prod-probe-768-_s_GOOGL.png`, `screenshots/prod-probe-1024-_s_GOOGL.png`; full per-company captures in `prod-audit.jsonl`.
- Cause: the tablet breakpoint retains a large company summary and all business prose, while inherited minimum chart heights exceed the remaining locked canvas.
- Change: tablet company summary uses a compact reference band; business prose stays in the existing detail drawer; the five quality checks get explicit bounded grid rows.

## F2 — Phone company pages require several screens of scrolling — medium

- Devices: 390×844 and 375×667.
- URL: https://gigainvestors.com/s/GOOGL.
- Steps: open the company; seek the fifth quality check and valuation. Each quality card has a 260px minimum height.
- Before: `screenshots/prod-chromium_s_GOOGL.png`.
- Change: phone overview presents all six check answers as 44px buttons, with full charts, numbers and business prose in their existing drawers. Company identity, verdict, price story, price references and holders remain available.

## F3 — Value shelf clips next-closest cards on short phones — high

- Device: 375×667.
- URL: https://gigainvestors.com/value.
- Steps: open Value; inspect the next-closest shelf and remaining-company control above the timeline.
- Before: `screenshots/prod-probe-375-_value.png`.
- Cause: three buy cards consume the short screen's available height before the next-closest shelf.
- Change: show one buy card on short phones and include the other buys in the existing list drawer; use compact next-closest summaries.

## F4 — Shared controls too small for touch — medium

- Devices: all six touch viewports.
- URLs: https://gigainvestors.com/, /value and /s/GOOGL.
- Steps: measure and tap timeline arrows, Search, Method, filter/list buttons, drawer Close and evidence buttons.
- Before: `screenshots/prod-chromium_.png`, `screenshots/prod-chromium_value.png`; exact bounds in audit JSONL.
- Evidence: bottom buttons and drawer buttons are typically 20px high; timeline arrows are 24×28px on phones; dossier evidence headings are approximately 18px high.
- Change: coarse-pointer controls use at least 44px targets. Phone bottom actions use a horizontally scrollable row so all actions remain reachable; desktop chrome retains its existing dimensions.

## F5 — Method drawer overflows sideways on iPad — high

- Devices: all four iPad viewports.
- URL: https://gigainvestors.com/s/GOOGL.
- Steps: tap Method; read through to the final sections. Fixed-height newspaper columns overflow the modal horizontally.
- Before: `screenshots/prod-chromium-768x1024-_s_GOOGL-aboutmethod.png` (also corresponding 820, 1180 and 1024 captures).
- Evidence: measured content overflow ranges from 285px to 534px for the GOOGL probe.
- Change: on tablets, Method uses one readable scrolling column with a fixed accessible close control.

## F6 — Back leaves the page instead of dismissing a drawer — medium

- Device: 390×844 (shared implementation).
- URL: https://gigainvestors.com/value.
- Steps: navigate to Value; open Method; use browser Back. Browser navigates to the previous page (`about:blank` in the isolated reproduction).
- Evidence: `before-navigation.log`; drawer appearance in `screenshots/prod-chromium-390x844-_value-aboutmethod.png`.
- Change: drawers and Search add a transient history entry; Back dismisses the overlay. Cleanup avoids reversing a company navigation.

## F7 — Search has no visible dismiss button — medium

- Devices: phones and tablets.
- URL: https://gigainvestors.com/value.
- Steps: tap Search. Dismissal requires tapping outside or using Escape; there is no visible touch close control.
- Change: visible 44px Close button, keyboard focus containment, and Back dismissal.

## Audit observations and limits

- No document-level horizontal overflow was found in the completed production route matrix. Drawer overflow is recorded separately.
- Production WebKit occasionally reports ResizeObserver loop warnings in company drawers. Some search-request cancellation errors occur during document navigation; these must be separated from persistent failed loads.
- Local Webpack development occasionally served truncated JavaScript (captured by the browser debugger at 524,252 bytes, with an incomplete final string). The audit harness can fulfill local `_next/static` assets directly from the generated files to distinguish this transport problem from application behavior. It still uses the requested dev server for pages and live-data APIs. This workaround does not modify application or production networking.
- `npx next build` fails on the out-of-root node_modules symlink in Turbopack; `npx next build --webpack` is the compatible verification command.
- Final status, verification results and unresolved items are in `report.md`.

## Controller review fixes (resume 2 and 3) — 8 October 2026

Verified on a local production build (`npx next build --webpack` + `npx next start -p 3998`), which avoids the dev server's truncated-chunk flake; the desktop and iPad results were rechecked on `next dev --webpack` too. Production was captured at the same moment and compared side by side.

## F8 — iPad dossier charts render as empty boxes — high

- Devices: 768x1024 (WebKit and Chromium); every iPad size checked.
- URL: `/s/GOOGL`, also KO, NTES, JPM, NVDA, 7203.JP, 005930.KO.
- Steps: open the stock page; look at the quality tiles and the price panel.
- Before: `screenshots/final-dev6-webkit-768x1024-_s_GOOGL.png` (commit d959c2f). Production itself shows the price chart growing to 7,259px tall at this size (left half of `screenshots/resume3-compare-webkit-768x1024-_s_GOOGL.png`).
- After: right half of `screenshots/resume3-compare-webkit-768x1024-_s_GOOGL.png`; `screenshots/resume3-final-webkit-local-1024x768-_s_GOOGL.png`.
- Change: `useWidth` measures on mount and defers observer commits to the next frame. Tablet CSS no longer hides the mini charts. The price chart reserves the measured height of its legend and caption, so on narrow cards the caption stays inside the card.

## F9 — Desktop `/value` loses most next-closest cards and the time slider — high

- Devices: 1728x970 and 1440x900.
- URL: `/value`.
- Before: `screenshots/final-dev6-chromium-1728x970-_value.png` (2 cards, no slider).
- Cause: d959c2f measured the grid's column and row variables once on mount and then only watched the grid box. The variables come from container queries on `.main-next`, so when the container settled later the grid box did not resize and the count stayed at 2x1. The slider portal looked up `#value-timeline` once, before the bottom bar mounted.
- Change: MainView also observes the `.main-next` container and re-measures in the next frame. The timeline portal waits for its slot with a MutationObserver. The earlier forced desktop minimum and inline grid variables were removed; they froze the column count when the window shrank.
- After: `screenshots/resume3-compare-chromium-1728x970-_value.png` and `-1440x900-_value.png` are pixel-identical to production (0 differing pixels): 20 and 16 cards, slider present. Resizing 1728→1024→1180→1440→1728 gives 20→6→9→16→20 cards in both engines.

## F10 — Phone stock page wastes the area above the dock — medium

- Devices: 390x844, 375x667.
- URL: `/s/GOOGL` and the six other companies above.
- Before: `screenshots/final-dev6-chromium-390x844-_s_GOOGL.png`.
- Change: the price card grows into the free space and shows the price-vs-value chart (110–177px at 390x844). On 375x667 the chart has a 56px floor with one price label and tighter margins, and the repeated "2. Is the price low enough?" heading is hidden because the card is titled "Price · separate check".
- After: `screenshots/resume3-final-webkit-local-390x844-_s_GOOGL.png`, `screenshots/resume3-final-webkit-local-375x667-_s_GOOGL.png`.
- Residual: on NTES at 375x667 the two-line verdict pushes the card's bottom border about 7px under the dock; the chart and its year labels stay visible (`screenshots/resume3-final-webkit-local-375x667-_s_NTES.png`).

## F11 — No way to filter `/value` on iPad portrait or 1024 landscape — high

- Devices: 768x1024, 820x1180, 1024x768 (production and local).
- URL: https://gigainvestors.com/value.
- Steps: look for Country/Sector/toggles. The desktop filter row is hidden below 1100px, and `density.css` also hides the Filters button at 768px and up, so neither is shown.
- Before: left half of `screenshots/resume3-compare-webkit-1024x768-_value.png`.
- Change: the Filters button is shown at 768–1099px. It opens the existing filter drawer, which holds countries, sectors and all three toggles.
- After: `screenshots/resume3-filters-webkit-1024x768-_value.png` (drawer open); tapping Near misses sets `?near=1`, Apply closes the drawer and Back restores `/value`.
