# Superinvestors — design

Two-view site showing the 83 dataroma.com superinvestors as treemaps that can be scrubbed through time. Not a marketing site: no titles, no copy, no navigation chrome.

## Decisions (locked)

- Data source: dataroma.com only, fetched by a daily cron into Vercel Blob (option 1).
- History: everything dataroma has (~2016 onward, quarterly).
- Sizing: linear dollar value, both views.
- Hover: nothing for now.
- Change display: colour tint on tiles; sold-out positions linger one quarter as a ghost.
- Tile text: name + value + quarter-over-quarter %; hides progressively on small tiles.
- Time control: one draggable quarter slider along the bottom, arrow keys too, same on both views.
- Norbert Lou (no photo exists): a "mystery man" pencil sketch in the same style, reviewed before shipping.
- Deploy: project `superinvestors` on Miki's personal Vercel account, `superinvestors.vercel.app`.
- Colours: `#111111` ink and `#F4F2EC` paper, nothing else.
- Performance is a hard requirement (see budget).

## Stack

Next.js 15 App Router, TypeScript, Tailwind, `d3-hierarchy` (squarify only). Vercel Blob for data, Vercel Cron for sync. No other runtime dependencies.

```
app/
  page.tsx                      homepage (server, inlines index JSON)
  [code]/page.tsx               investor page (server, inlines investor JSON)
  api/cron/sync/route.ts        thin: calls lib/sync
lib/
  dataroma/                     fetch + parse (managers, holdings, activity, hist)
  sync/                         orchestrates fetches, reconstructs quarters, writes Blob
  treemap/                      squarify wrapper, text-tier rules
  data.ts                       read index / investor JSON from Blob
components/
  Treemap.tsx                   generic tile layout + CSS transitions
  QuarterSlider.tsx
  InvestorTile.tsx / PositionTile.tsx
public/faces/{slug}-320.avif, {slug}-1200.avif (+ webp fallbacks)
data/roster.json                code → person, firm, sketch slug (from the sketch project)
```

## Data pipeline

### Sources (all server-rendered HTML, parsed from tables)

| Page | Gives |
|---|---|
| `/m/managers.php` | all managers: code, label, portfolio value, stock count |
| `/m/holdings.php?m={code}` | current positions: ticker, name, % of portfolio, shares, reported price, value, recent activity; period label |
| `/m/hist/hist.php?f={code}&s={ticker}` | per-position quarterly rows: period, shares, % of portfolio, activity, % change to portfolio, reported price |
| `/m/m_activity.php?m={code}` | per-quarter list of New / Add / Reduce / Sold with share change |

### Reconstruction

For each investor, for each quarter that appears in any position's history:

- position value = shares × reported price (that quarter)
- portfolio total = Σ position value ÷ (Σ % of portfolio ÷ 100), which corrects for positions exited before today (they are absent from `holdings.php` and so from the hist set)
- activity for the quarter comes from the hist row; the activity page is used only to add sold-out positions (ticker, last quarter held) so ghosts can render

Current quarter uses `holdings.php` values directly.

### Output (Blob)

```
index.json
{ generatedAt, quarters: ["2016 Q1", …, "2026 Q2"],
  investors: [{ code, slug, person, firm, sketch: bool,
                series: [{ q, total, positions }] }] }

investors/{code}.json
{ code, person, firm, quarters: [{ q, total,
    positions: [{ ticker, name, shares, pct, value,
                  activity: "new"|"add"|"reduce"|"hold"|"sold" }] }] }
```

`index.json` has no positions detail; target ≤ 40 KB gzipped.

### Cron (change-driven, not schedule-driven)

13F data changes once a quarter, so the sync must do almost nothing on an ordinary day.

`GET /api/cron/sync`, daily, protected by `CRON_SECRET`. Steps:

1. Fetch `managers.php` (1 request). For each manager compute a fingerprint `{ portfolioValue, stockCount }` and compare with `sync/state.json`. **Unchanged managers are skipped entirely.** On a typical day this is the whole run: 1 request, a few hundred ms.
2. For each changed manager, fetch `holdings.php` (1 request). Compare the period label and the per-position `{ shares, pct }` set with the stored latest quarter. If identical (dataroma sometimes nudges the displayed value without a new filing), skip.
3. For a manager with a genuinely new quarter: fetch `hist.php` only for positions whose shares changed or that are new (typically 5–15, not 30), and `m_activity.php` once. Positions with unchanged shares carry their stored history forward with the new quarter's price applied. Full hist re-fetch happens only on first sync or when `?full=1` is passed manually.
4. Rebuild that investor's JSON and, once all changed managers are done, `index.json`.

Fetches run 4 at a time with a browser User-Agent and a 250 ms gap per worker. Worst case (a filing deadline day where ~60 managers update) is ~600 requests in under 3 minutes; the first-ever run is ~2,500 requests in ~12 minutes and is checkpointed per manager to Blob so it survives function timeouts, resuming on the next invocation. Function `maxDuration` 300 s.

A manager that fails to parse is logged and skipped, previous data kept. `index.json` is written atomically only after every changed manager succeeds or is skipped.

After a run that changed anything, the handler calls `revalidatePath` for `/` and each changed `/{code}` so the CDN pages refresh without waiting for the daily ISR window.

## Views

### Homepage `/`

Full viewport treemap of investors, sized by portfolio total at the selected quarter. Investors with no data at that quarter are omitted. Slider fixed to the bottom edge. Nothing else.

Tile content by size tier (tile area in px²):
- ≥ 40 000: face (cover), name, `$4.2B`, `+3.1%`
- 12 000–40 000: face, name
- 3 000–12 000: face only
- < 3 000: paper only

Face is an `<img>` with `object-fit: cover`, 320px AVIF, `loading="lazy"` except the first 12 by area.

Click → `/{code}`. Prefetch on pointer enter.

### Investor page `/{code}`

Left column, 30% width: face (1200px), person, firm, portfolio total, position count, quarter-over-quarter %. Right: treemap of positions sized by value at the selected quarter. Slider along the bottom, full width.

Tile text: ticker, `12.4%`, `$3.1B`; same tiering as homepage without the face tier.

Tints, applied as an overlay on the paper tile:
- `new`, `add` → ink at 12% opacity
- `reduce` → ink at 4% opacity plus a 1px ink inset border
- `sold` → tile keeps its previous-quarter size, dashed 1px ink border, no fill, only for the quarter after exit
- `hold` → none

### Slider

Horizontal track of quarter ticks. Drag, click a tick, or ←/→. Current quarter label sits under the thumb. Default position: latest quarter. URL keeps `?q=2024Q3` so a scrubbed view is linkable; changing the quarter replaces state without navigation.

### Animation

Layout for every quarter is computed once on mount and memoised. Changing the quarter sets each tile's `transform: translate(x,y) scale(w,h)` (tiles are 1×1 px boxes scaled, so only compositor properties change) with a 400 ms ease. Tiles absent in the new quarter fade out; new ones fade in. `prefers-reduced-motion` disables the transition.

## Performance budget (hard)

- Client JS ≤ 60 KB gzipped per route. No charting libs; `d3-hierarchy` only.
- Homepage HTML with inlined index ≤ 80 KB gzipped; zero data fetches after load.
- Faces: grayscale AVIF, 320px ≈ 8 KB, 1200px ≈ 60 KB, WebP fallback, `Cache-Control: public, max-age=31536000, immutable`.
- Both routes statically rendered and revalidated daily (`revalidate = 86400`), served from the CDN.
- Investor JSON prefetched on tile pointer-enter.
- Fonts: one self-hosted variable subset with tabular numerals, `font-display: swap`; total font bytes ≤ 40 KB.
- Lighthouse performance ≥ 95, LCP < 1.5 s on both views, checked before every production deploy.

## Face assets

Source: the 82 sketches produced earlier (`superinvestor-sketches/`). Build step `scripts/build-faces.ts` converts each to grayscale AVIF + WebP at 320 and 1200 px wide, centre-cropped to 4:5. Norbert Lou's mystery-man sketch is generated in the same pipeline as the others and added to the set after review.

## Error handling

- Parse failure for a manager: skip, keep previous Blob file, log. Site never shows partial data for one investor.
- Blob unreachable at render: serve the last statically cached page (ISR keeps it).
- Investor code not in index: 404.

## Testing

- Parser unit tests against saved HTML fixtures for each of the four page types (fixtures captured now, so dataroma layout drift fails loudly).
- Reconstruction unit tests: total from partial position sets, sold-out ghost placement, quarter ordering.
- Treemap tier rules unit-tested on synthetic areas.
- One Playwright smoke test per view: renders, slider changes quarter, tile navigates.
- Lighthouse CI on preview deploys enforcing the budget.

## Out of scope

Hover states, stock pages, search, auth, analytics, mobile tuning, custom domain, dark mode.
