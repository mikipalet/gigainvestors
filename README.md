# GigaInvestors

What 83 widely followed investors own, quarter by quarter from their 13F filings, drawn as treemaps with pencil-sketch portraits.

**https://gigainvestors.com**

- `/` — every investor, tile size = portfolio value, scrub back to 2006
- `/BRK` — one investor's positions; green = buying, red = selling, scaled by the size of the move
- `/s/NVDA` — who holds a stock, since when, and whether they're buying or selling, with shares held stacked by investor over time
- Press `/` to search investors, firms, tickers, companies
- `/newsletter` — one letter a quarter, with its archive and open rates
- Markdown twins: request any investor, stock, letter or trust page with `Accept: text/markdown` (see `/llms.txt`)

## The quarterly letter

When about 80% of the 83 have filed, a GitHub Action builds and sends one issue. `lib/newsletter/issue.ts` derives the facts (every move sized against that investor's own book, who else did the same, what the price did, how long a position was held); `write.ts` hands those facts to a model and then refuses any number, ticker or word that cannot be traced back to them; `hero.ts` draws the lead investor's book as a treemap that doubles as the social card. Nothing is invented, and the build fails rather than sending prose it cannot verify.

```sh
npx tsx scripts/newsletter/build-issue.ts            # newest quarter, reuses stored prose
npx tsx scripts/newsletter/build-issue.ts "2026 Q1" --rewrite
npx tsx scripts/newsletter/send-issue.ts 2026-q2 --test you@example.com
npx tsx scripts/newsletter/check-send.ts             # did the last send actually work
```

## Data

Quarterly SEC 13F filings as compiled by [dataroma.com](https://www.dataroma.com). Values are quarter-end reported values; prices are value ÷ shares, split-adjusted. 13F covers US-listed long positions only and lags quarter end by up to 45 days. Not investment advice.

The dataset lives in the repo (`data/store/`) and the whole site is static: no runtime data fetching, no accounts, no tracking. The only server code is the handful of newsletter routes under `app/api/`.

## Run it

```sh
npm install
npm run sync -- --full   # rebuild data/store from dataroma (change-driven without --full)
npm run faces            # regenerate face assets from assets/sketches/*.png (not in repo)
npm run dev
npm test                 # unit tests; `npx playwright test` for e2e against `npm start`
```

Portraits are pencil sketches generated from public photographs in a single house style. Norbert Lou has no public photograph anywhere, so he is drawn as a mystery man.
