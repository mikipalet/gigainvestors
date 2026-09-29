# Daily value operations

From the checked-out pipeline directory:

```sh
# Free backfill from cached fundamentals, safe when today's API budget is spent:
npm run value -- price-seed
npm run value -- status

# Starts at the next 00:05 UTC, then repeats every day:
nohup bash scripts/value/run-daily.sh > "$HOME/value-daily.log" 2>&1 &

# Explicit immediate single cycle (consumes provider budgets and publishes):
bash scripts/value/run-daily.sh --once
```

The runner loads `.env.local` with dotenv, respecting existing environment variables.
`VALUE_CORPUS_DIR` defaults to `~/value-corpus`. Stage logs append to
`logs/YYYY-MM-DD-STAGE.log`. A corpus-level `daily-runner.lock` prevents duplicate
runners. After an unclean shutdown, the runner reclaims a lock only when its saved PID
is dead; live or unverifiable owners are left in place. Do not run competing paid stages against the same corpus concurrently.

Order: prices, price-history, fundamentals, renormalize, dedupe, price-seed,
reports, analyze, publish, status. Failures are logged and subsequent stages still
run. Publish is skipped when analyze exits unsuccessfully; its own calibration
and count-drop checks also remain in force. Dedupe uses the existing universe
issuer rules, keeps input backups under `dedupe/` for seven days, and never deletes cached company data.

`T.budget` allocates 100,000 calls: bulk quotes cost 100 per exchange and screener requests cost 5; monthly
history is capped at 15,000 calls per UTC day and only covers companies with
fundamentals, never-fetched first. Fundamentals use the actual remaining budget
at 10 calls each, never-fetched then oldest-fetched. The extra 500 calls are
reserved for FX overhead. With the current 62 exchanges, the full split is
6,200 bulk + 15,000 history + 78,800 fundamentals (7,880 companies). Unused history
capacity flows to fundamentals. Yahoo requests for `.JP` consume no EODHD budget.

`usage/eodhd-YYYY-MM-DD.json` records paid attempts before sending, including
retries and failures. Usage checks take the maximum of that conservative local
counter and the provider counter; midnight switches to a fresh dated ledger.
All paid workloads sharing the account should use this runner/corpus. External
clients are only observed at provider resynchronization, not continuously.

`price-seed` writes local `prices/{country}.json` as `[cap / shares, fetchDate,
"seed"]`. The fetch date comes from raw file mtime, not EODHD's financial period
or the seed run date. Invalid/missing/nonpositive values are skipped. Publish
merges those files into its fetched repository. Real closes always take
precedence, even when older than a seed. Two-element real-close tuples remain
supported; the store reader retains the optional seed marker for UI copy such
as `price derived from market cap on {date}`. It does not label a seed as a close.

Status reports current-universe coverage, the total fundamentals cache (including
retired listings), report kinds, analysis coverage, published-store count,
prices by source, conservative/provider EODHD counters, and today's Jev input
tokens. A remote-store failure is shown explicitly with any local snapshot
fallback. Price counts use local seed and publish-repo files, not a download of
all remote prices.

Provider checks (2026-09-29):

- [EODHD bulk documentation](https://eodhd.com/financial-apis/bulk-api-eod-splits-dividends)
  confirms a whole-exchange request costs 100 calls.
- [Fundamentals documentation](https://eodhd.com/financial-apis/stock-etfs-fundamental-data-feeds)
  identifies `General.CurrencyCode` as the listing currency.
- Cached KO.US: USD cap 375,096,213,504 / 4,302,549,243 shares = USD
  87.1799931434. Raw mtime: 2026-09-29T11:50:08.505Z. This matches the recorded
  KO monthly-history fixture's latest 87.18 close after rounding.
- Cached ASML.AS: EUR cap 590,361,722,880 / 384,100,000 shares = EUR
  1,537.0000595678. Raw mtime: 2026-09-29T11:25:26.264Z. Consistent with raw EUR
  technicals (50-day average 1,489.524, 52-week range 806.8248–1,738.9059).
  This is a currency/scale consistency check, not an independent live-close
  verification. No paid quote requests were made for these checks.
