# Superinvestors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A two-view treemap site of dataroma's 83 superinvestors, scrubbable by quarter, synced daily by a change-driven cron, deployed to `superinvestors.vercel.app`.

**Architecture:** Next.js 15 App Router renders both views statically from JSON in Vercel Blob. A cron route fingerprints dataroma's manager list and only re-parses investors that changed. Treemaps are squarified with `d3-hierarchy` and animated with compositor-only CSS transforms.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind 4, `d3-hierarchy`, `@vercel/blob`, `sharp` (build-time only), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-30-superinvestors-design.md`

## Global Constraints

- Colours: only `#111111` (ink) and `#F4F2EC` (paper). Tints are ink at 12% / 4% opacity.
- Client JS ≤ 60 KB gzipped per route; homepage HTML ≤ 80 KB gzipped; fonts ≤ 40 KB.
- No titles, headers, footers, descriptions in the UI.
- Sizing is linear dollar value.
- Cron: typical day = 1 request to dataroma.
- No em dashes in copy.
- Deploy to Miki's personal Vercel account (`mikipalets-projects`), project `superinvestors`.

---

## File map

```
package.json, next.config.ts, tsconfig.json, vercel.json (cron), vitest.config.ts, playwright.config.ts
app/layout.tsx                 html/body, font, paper background
app/page.tsx                   homepage (server)
app/[code]/page.tsx            investor page (server)
app/api/cron/sync/route.ts     thin cron transport
lib/types.ts                   Index, InvestorData, Quarter, Position, Activity
lib/dataroma/client.ts         fetchHtml(path) with UA + gap
lib/dataroma/parse-tables.ts   HTML table → string[][] (shared)
lib/dataroma/parse-managers.ts parseManagers(html) → ManagerRow[]
lib/dataroma/parse-holdings.ts parseHoldings(html) → HoldingsPage
lib/dataroma/parse-hist.ts     parseHist(html) → HistRow[]
lib/dataroma/parse-activity.ts parseActivity(html) → ActivityQuarter[]
lib/sync/reconstruct.ts        buildInvestorData({holdings, hists, activity}) → InvestorData
lib/sync/fingerprint.ts        fingerprint(ManagerRow) + diff against state
lib/sync/run.ts                runSync({ full }) orchestrator, Blob writes, revalidate
lib/blob.ts                    readJson/writeJson helpers
lib/data.ts                    getIndex(), getInvestor(code)
lib/treemap/layout.ts          layout(items, w, h) → Rect[]
lib/treemap/tier.ts            tierFor(area) → 'full'|'name'|'face'|'blank'
lib/quarters.ts                quarter parsing/sorting/prev
components/Treemap.tsx         client: tiles + transforms
components/QuarterSlider.tsx   client
components/InvestorTile.tsx
components/PositionTile.tsx
data/roster.json               from the sketch project
scripts/build-faces.ts         sharp → public/faces/*.avif|webp
tests/fixtures/*.html          captured dataroma pages
tests/unit/*.test.ts
tests/e2e/*.spec.ts
```

---

### Task 1: Scaffold + tooling

**Files:** Create `package.json`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `vitest.config.ts`, `.gitignore`, `.env.example`.

- [ ] Init: `npm create next-app@latest . --ts --tailwind --app --src-dir=false --import-alias "@/*" --use-npm --no-eslint`; add deps `d3-hierarchy @vercel/blob`, dev `@types/d3-hierarchy vitest @vitejs/plugin-react playwright @playwright/test sharp tsx`.
- [ ] `app/globals.css`: `:root{--ink:#111111;--paper:#F4F2EC}` `html,body{margin:0;background:var(--paper);color:var(--ink);font-variant-numeric:tabular-nums}`. Use `next/font/google` Inter with `subsets:['latin']`, `axes` none (keeps it small) in layout.
- [ ] `vitest.config.ts` with `environment:'node'`, include `tests/unit/**`.
- [ ] `.env.example`: `BLOB_READ_WRITE_TOKEN=`, `CRON_SECRET=`.
- [ ] Run `npx vitest run` (0 tests) and `npx next build`. Commit `chore: scaffold`.

### Task 2: Types + quarters

**Files:** `lib/types.ts`, `lib/quarters.ts`, `tests/unit/quarters.test.ts`.

**Produces:**
```ts
export type Activity = 'new'|'add'|'reduce'|'hold'|'sold';
export interface Position { ticker:string; name:string; shares:number; pct:number; value:number; activity:Activity }
export interface Quarter { q:string; total:number; positions:Position[] }          // q = "2026 Q2"
export interface InvestorData { code:string; person:string; firm:string; quarters:Quarter[] }
export interface IndexInvestor { code:string; slug:string; person:string; firm:string; sketch:boolean; series:{q:string;total:number;positions:number}[] }
export interface Index { generatedAt:string; quarters:string[]; investors:IndexInvestor[] }
// quarters.ts
export const parseQuarter=(s:string)=>{y:number;q:number}|null  // accepts "2026 Q2" and "Q2 2026"
export const qKey=(y,q)=>`${y} Q${q}`; export const compareQ=(a,b)=>number; export const prevQ=(q)=>string; export const nextQ=(q)=>string
```
- [ ] Tests: parse both orders, sort ascending, prevQ("2026 Q1")==="2025 Q4". Implement. Commit `feat: types and quarter utils`.

### Task 3: Table parser + fixtures

**Files:** `lib/dataroma/parse-tables.ts`, `tests/fixtures/{managers,holdings-BRK,hist-BRK-AAPL,activity-BRK}.html`, `tests/unit/parse-tables.test.ts`.

- [ ] Capture fixtures with curl (UA `Mozilla/5.0 ... Chrome/120`) from `/m/managers.php`, `/m/holdings.php?m=BRK`, `/m/hist/hist.php?f=BRK&s=AAPL`, `/m/m_activity.php?m=BRK`.
- [ ] `parseTables(html): {rows:Cell[][]}[]` where `Cell={text:string;href?:string}` using a small state-machine tokenizer over `<table|tr|td|th|a` (no dependency). Whitespace collapsed. Test: holdings fixture table 0 row 1 has cell[1].href `/m/stock.php?sym=AAPL`.
- [ ] Commit `feat: html table parser + fixtures`.

### Task 4: Page parsers

**Files:** `lib/dataroma/parse-managers.ts`, `parse-holdings.ts`, `parse-hist.ts`, `parse-activity.ts`, tests for each.

**Produces:**
```ts
parseManagers(html): {code:string; label:string; portfolioValue:number; stockCount:number}[]   // "$2.05 B" → 2.05e9, "$192 M" → 1.92e8
parseHoldings(html): {period:string; portfolioValue:number; positions:{ticker,name,pct,shares,reportedPrice,value,activity:string}[]}
parseHist(html): {q:string; shares:number; pct:number; activity:string; price:number}[]   // q normalised to "2026 Q2"
parseActivity(html): {q:string; items:{ticker:string; name:string; kind:'Buy'|'Add'|'Reduce'|'Sell'; shareChange:number}[]}[]
mapActivity(raw:string): Activity   // "Add 45.24%"→'add', "Reduce"→'reduce', "Buy"→'new', "Sell"→'sold', ''→'hold'
```
- [ ] Tests from fixtures: managers has 83 rows and BRK value ≈ 2.99e11; holdings BRK period "Q2 2026" → "2026 Q2", first ticker AAPL pct 22.04 shares 227917808; hist first row q "2026 Q2"; activity groups by quarter header rows (rows with a single cell matching `/^Q[1-4] \d{4}$/`).
- [ ] Commit `feat: dataroma page parsers`.

### Task 5: Reconstruction

**Files:** `lib/sync/reconstruct.ts`, `tests/unit/reconstruct.test.ts`.

**Produces:** `buildInvestorData({code,person,firm,holdings,hists:Record<ticker,HistRow[]>,names:Record<ticker,string>,activity}): InvestorData`

Rules:
- Quarter set = union of hist quarters ∪ current period.
- For each quarter, position value = shares×price from hist; current quarter uses holdings values directly.
- `total = Σvalue / (Σpct/100)`; if Σpct is 0 skip the quarter.
- Activity per position from hist row via `mapActivity`; first quarter a ticker appears with no activity string → 'new'.
- Sold ghosts: for each activity item kind 'Sell' at quarter Q, add a position `{ticker, name, shares:0, pct:0, value:<its value at prevQ(Q)>, activity:'sold'}` at Q if it has a prevQ entry.
- Quarters sorted ascending.
- [ ] Tests: synthetic two-ticker case gives expected totals; sold ghost appears once with previous value; missing hist for a ticker doesn't throw.
- [ ] Commit `feat: quarter reconstruction`.

### Task 6: Blob + fingerprints + sync

**Files:** `lib/blob.ts`, `lib/sync/fingerprint.ts`, `lib/sync/run.ts`, `lib/dataroma/client.ts`, `app/api/cron/sync/route.ts`, `vercel.json`, `tests/unit/fingerprint.test.ts`.

**Produces:**
```ts
readJson<T>(key):Promise<T|null>; writeJson(key, data)   // @vercel/blob, addRandomSuffix:false, access:'public', cacheControlMaxAge:60
fingerprint(m:ManagerRow):string   // `${portfolioValue}|${stockCount}`
diffManagers(rows, state:{[code]:string}): string[]   // codes changed or unknown
fetchHtml(path:string):Promise<string>  // UA header, 250ms gap, 3 retries
runSync({full=false}):Promise<{changed:string[]; skipped:string[]; durationMs:number}>
```
`runSync`: managers → diff → for each changed (4 workers): holdings → if period+positions equal stored latest and !full, skip → else hists for tickers with changed shares or new (all if full or no stored data) → activity → build → write `investors/{code}.json` → update `sync/state.json` after each manager (checkpoint). Then rebuild `index.json` from all `investors/*.json` (list via `list({prefix:'investors/'})`), write, `revalidatePath('/')` and each changed `/${code}`.
Route: verify `authorization === Bearer ${CRON_SECRET}`, `export const maxDuration=300`, accepts `?full=1`. `vercel.json`: `{"crons":[{"path":"/api/cron/sync","schedule":"0 6 * * *"}]}`.
- [ ] Test diffManagers. Commit `feat: change-driven sync`.

### Task 7: Roster + faces

**Files:** `data/roster.json`, `scripts/build-faces.ts`, `public/faces/*`.

- [ ] Copy `roster.json` and the 82 sketch PNGs from the sketch project into `data/` and `assets/sketches/` (assets gitignored? No: commit AVIF outputs only; keep source PNGs out of git, in `assets/` gitignored).
- [ ] Script: for each roster entry with a file, sharp → grayscale → cover-crop 4:5 → widths 320 and 1200 → `.avif` (quality 45) and `.webp` (quality 70) into `public/faces/{slug}-{w}.{ext}`. Print total bytes. Target ≤ 8 KB / ≤ 60 KB.
- [ ] Generate Norbert Lou mystery-man sketch with the same gateway pipeline (reference Ketterer+Pabrai, prompt: hat brim low, round glasses, upturned collar, playful), review, add as `norbert-lou.png`.
- [ ] Commit `feat: face assets`.

### Task 8: Treemap layout + tiers

**Files:** `lib/treemap/layout.ts`, `lib/treemap/tier.ts`, tests.

**Produces:** `layout(items:{id:string;value:number}[], w:number, h:number, pad=2): {id;x;y;w;h}[]` using `hierarchy({children:items}).sum(d=>d.value)` + `treemap().size([w,h]).paddingInner(pad).tile(treemapSquarify)`; values ≤0 dropped. `tierFor(area:number)`: ≥40000 'full', ≥12000 'name', ≥3000 'face', else 'blank'.
- [ ] Tests: areas sum ≈ w×h minus padding; order stable; tiers at boundaries. Commit `feat: treemap layout`.

### Task 9: Treemap + slider components

**Files:** `components/Treemap.tsx`, `components/QuarterSlider.tsx`, `components/InvestorTile.tsx`, `components/PositionTile.tsx`.

- `Treemap` (client): props `{ frames: Record<q, {id;value;data}[]>, quarters:string[], q:string, render:(item,tier,rect)=>ReactNode, onSelect? }`. Measures container with `ResizeObserver`; memoises `layout` per (q,w,h). Renders a `div` per id present in any frame, `position:absolute; left:0; top:0; width:1px; height:1px; transform: translate(x,y) scale(w,h); transition: transform .4s, opacity .4s`. Absent ids → `opacity:0; pointer-events:none`. Inner content gets `transform: scale(1/w,1/h)` sized to `w×h` so text isn't distorted. `@media (prefers-reduced-motion)` removes transition.
- `QuarterSlider`: `{quarters, q, onChange}`; `<input type=range>` styled as a thin ink track with a 2px thumb; label under thumb; ←/→ keys; fixed bottom, 40px tall, paper background.
- `InvestorTile`: face `<picture>` (avif/webp, lazy unless `priority`), name, `$4.2B` (`formatMoney`), `+3.1%` (delta vs prevQ from series), tiers per spec. Whole tile is a `<Link href=/{code}?q=...>` with `prefetch`.
- `PositionTile`: ticker, `12.4%`, `$3.1B`; tint overlay per activity (`new|add`: ink 12%; `reduce`: ink 4% + inset 1px; `sold`: dashed 1px, transparent).
- [ ] Commit `feat: treemap and slider components`.

### Task 10: Pages

**Files:** `lib/data.ts`, `app/page.tsx`, `app/[code]/page.tsx`, `app/[code]/not-found.tsx`.

- `getIndex()` / `getInvestor(code)` read Blob with `fetch(url,{next:{revalidate:86400}})`. `export const revalidate=86400` on both pages.
- Homepage: server reads index, passes to a client `Home` component holding `q` state (init from `searchParams.q` else latest); frames built from `series`; slider at bottom; treemap fills `100vh - 40px`.
- Investor page: `generateStaticParams` from index codes; left column 30% with 1200 face + person, firm, total, count, delta; right treemap of positions; slider. `?q` sync via `history.replaceState`.
- 404 for unknown code.
- [ ] Commit `feat: pages`.

### Task 11: First sync + deploy

- [ ] `vercel link --project superinvestors --scope mikipalets-projects --yes` (create project if prompted), `vercel blob store add` or create Blob store in dashboard, `vercel env add BLOB_READ_WRITE_TOKEN CRON_SECRET`, `vercel env pull`.
- [ ] Run `npx tsx scripts/sync-local.ts --full` (thin wrapper calling `runSync({full:true})`) locally; verify `index.json` has 83 investors and BRK has ≥ 30 quarters.
- [ ] `npm run build`, `vercel --prod`. Check `superinvestors.vercel.app`.
- [ ] Commit `chore: deploy config`.

### Task 12: Verification

- [ ] Playwright: `/` renders ≥ 50 tiles; slider to earliest quarter changes tile count; click BRK tile → `/BRK`; `/BRK` slider changes a tile's width.
- [ ] `npx lighthouse https://superinvestors.vercel.app --only-categories=performance` ≥ 95 for `/` and `/BRK`; check JS bundle via `next build` output ≤ 60 KB first-load beyond framework. Fix regressions.
- [ ] Commit `test: e2e + perf check`.
