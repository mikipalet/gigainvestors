READY

Branch `value-devices`, based on `master` 6f7e0c1. Nothing pushed or published; the daily-runner lock and `~/value-corpus` were not touched. Screenshot paths are relative to `docs/value/devices-1/` in the worktree (`~/data/value-devices`).

This round (resume 3) fixes the three regressions from the controller's review of d959c2f and one more iPad defect found while checking. It also replaces the previous run's desktop workaround with a root-cause fix.

## What was broken, and what was fixed

1. **iPad stock pages showed empty chart boxes.** At 768x1024 the quality tiles had numbers but no charts, and the price panel was empty. The chart-sizing hook could stay at zero height, and tablet CSS hid some charts. Charts now measure themselves when they appear, and the tablet CSS no longer hides them. Production is also broken here: its price chart grows to over 7,000px tall at this size.
   - Before: `screenshots/final-dev6-webkit-768x1024-_s_GOOGL.png`
   - Production vs fixed, side by side: `screenshots/resume3-compare-webkit-768x1024-_s_GOOGL.png` and `screenshots/resume3-compare-chromium-768x1024-_s_GOOGL.png`
   - Checked across GOOGL, KO, NTES, JPM (bank), NVDA, 7203.JP (Japan) and 005930.KO (Korea) at all four iPad sizes in both engines. The price caption now sits inside its card; before, it overlapped the border.

2. **Desktop `/value` showed only 2 "Next closest" cards and no time slider.** The grid read its column and row counts once and then only watched its own box. Those counts come from the size of the surrounding section, which settles later, so the count stayed at 2. The slider looked for its slot in the bottom bar before the bar existed. The grid now also watches the surrounding section, and the slider waits for its slot.
   - The previous run's fix forced a 5x4 minimum and wrote the counts back into the page. That froze the grid when the window shrank, so I removed it.
   - Before: `screenshots/final-dev6-chromium-1728x970-_value.png`
   - After, production on the left and local on the right: `screenshots/resume3-compare-chromium-1728x970-_value.png`, `screenshots/resume3-compare-chromium-1440x900-_value.png`. Both are pixel-identical to production: 20 and 16 cards, slider present.
   - Resizing 1728 → 1024 → 1180 → 1440 → 1728 gives 20 → 6 → 9 → 16 → 20 cards in Chromium and WebKit.
   - Also confirmed on `next dev --webpack`, where the controller saw the bug: `screenshots/resume3-dev-chromium-1728x970-_value.png`.

3. **Phone stock page had a large blank area above the bottom bar.** The price card now grows into that space and shows the price-vs-value chart. It is 110–177px tall at 390x844, depending on the company.
   - At 375x667 the chart is 56px tall with one price label. It used to be a 6px line with overlapping labels. The duplicate "2. Is the price low enough?" heading is hidden there, because the card is already titled "Price · separate check".
   - After: `screenshots/resume3-final-webkit-local-390x844-_s_GOOGL.png`, `screenshots/resume3-final-webkit-local-375x667-_s_GOOGL.png` (Chromium equivalents alongside)

4. **New: iPad portrait and 1024 landscape had no way to filter `/value`.** This is broken on production too. The desktop filter row is hidden below 1100px, and a later stylesheet also hid the Filters button on anything 768px or wider, so neither appeared. The Filters button now shows at 768–1099px and opens the existing filter drawer (countries, sectors, all three toggles). It is a 44px touch target.
   - Before: left half of `screenshots/resume3-compare-webkit-1024x768-_value.png`
   - After: `screenshots/resume3-filters-webkit-1024x768-_value.png`
   - In the drawer, toggling Near misses sets `?near=1`, Apply closes the drawer, and Back restores `/value`.

## Desktop non-regression (production vs local, side by side, 1728x970 and 1440x900)

`/value`, `/s/GOOGL`, `/s/KO` and `/HA?q=2026Q2` have 0 differing pixels against production. `/` differs only in anti-aliasing of the hand-drawn portraits; the layout is identical. Files: `screenshots/resume3-compare-chromium-{1728x970,1440x900}-{_,_value,_s_GOOGL,_s_KO,_HA_q_2026Q2}.png`.

## Interaction pass on the local build

Script `resume3-interactions.cjs`, results in `resume3-interactions.jsonl`. It covers all 8 sizes in Chromium and WebKit, with touch on the phone and iPad sizes:

- Time slider: keyboard to a past quarter and back to Today; tap a past quarter, then browser Back; drag to a past quarter and back.
- "Next closest" list drawer: open, then close with Back.
- Company card: open the dossier, then Back.
- Quality evidence drawer: open, scroll, close with Back, close with the button.
- Search: type "nvidia", select with the keyboard, land on `/s/NVDA`.

Every step passed everywhere, with no horizontal overflow, no failed requests and no Chromium console errors.

For comparison, the same script on production WebKit (`resume3-interactions-prod.jsonl`) shows Back failing to close the list drawer at 1440 and 1728; Back changes the quarter instead. d959c2f already fixes that locally.

## Verification

- `BASE_URL=http://localhost:3998 npx playwright test tests/e2e/value-devices-regression.spec.ts`: 5 passed. It covers iPad charts, the desktop grid and slider, phone chart placement, the grid resizing both ways, and the iPad Filters button.
- `npx next typegen` and `npx tsc --noEmit`: passed (`typegen-resume3.log`, `typecheck-resume3.log`).
- `npm test`: 260 files, 2509 passed, 1 skipped (`unit-resume3.log`).
- `npx next build --webpack`: passed (`build-resume3.log`).
- All screenshots come from a local production build (`next start`), not the dev server, so no static-file workaround was needed. The previous run's `_next/static` interception was dropped.

## Left unfixed, with reasons

- **NTES at 375x667:** the verdict wraps to two lines, which pushes the bottom ~7px of the price card's border under the bottom bar. The chart and its labels stay visible. Fitting it would mean shrinking 44px touch targets or changing the shared bottom bar, which the owner's rules forbid. (`screenshots/resume3-final-webkit-local-375x667-_s_NTES.png`)
- **WebKit "ResizeObserver loop completed" console warning:** it appears occasionally (2 of 8 WebKit runs, on /value). It comes from older observers that are unchanged in this branch (time slider, list drawer, treemap) and has no visible effect. I left them alone rather than change shared components.
- **WebKit console noise on localhost only:** "Prefetch request denied: URL must be secure" (plain-HTTP localhost) and cancelled `/api/search` fetches on navigation. Neither is an app defect.
- **Production build with Turbopack** fails on the symlinked `node_modules`, as the owner noted. Webpack was used for build and dev.
