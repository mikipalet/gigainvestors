# GigaInvestors

What 83 of the world's most followed investors own, and how it changes every quarter — drawn as treemaps with pencil-sketch portraits.

**https://gigainvestors.com**

- `/` — every investor, tile size = portfolio value, scrub back to 2006
- `/BRK` — one investor's positions; green = buying, red = selling, scaled by the size of the move
- `/s/NVDA` — who holds a stock, since when, and whether they're buying or selling, with shares held stacked by investor over time
- Press `/` to search investors, firms, tickers, companies
- Every page has a Markdown twin: request it with `Accept: text/markdown` (see `/llms.txt`)

## Data

Quarterly SEC 13F filings as compiled by [dataroma.com](https://www.dataroma.com). Values are quarter-end reported values; prices are value ÷ shares, split-adjusted. 13F covers US-listed long positions only and lags quarter end by up to 45 days. Not investment advice.

The dataset lives in the repo (`data/store/`) and the whole site is static: no runtime data fetching, no accounts, no tracking.

## Run it

```sh
npm install
npm run sync -- --full   # rebuild data/store from dataroma (change-driven without --full)
npm run faces            # regenerate face assets from assets/sketches/*.png (not in repo)
npm run dev
npm test                 # unit tests; `npx playwright test` for e2e against `npm start`
```

Portraits are pencil sketches generated from public photographs in a single house style. Norbert Lou has no public photograph anywhere, so he is drawn as a mystery man.
