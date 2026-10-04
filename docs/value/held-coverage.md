# Held-company coverage and controller resume

The publication scope is selected index members plus operating-company listings
held by tracked investors during the latest eight global quarters. Holdings do
not acquire an index label. Country filters, search, and the full agent catalogue
include every public analyzed row; Western remains the default market filter.

`held-membership/latest.json` contains the input quarters, company identities,
and an audit row for every stock record. `outside-window` is a scope decision,
`excluded` is an instrument classification, and `unresolved` is pending identity
research. A missing current US symbol is **not** evidence of delisting. The store
does not supply CUSIPs for most holdings; the mapper accepts explicit CUSIPs when
available and records the matched vendor ISIN. Unresolved foreign listings,
renames, and retired tickers require source-backed reconciliation before release.

Prepare a separate corpus on the data volume, without overwriting source caches:

```sh
python3 scripts/value/prepare-held-coverage.py
VALUE_CORPUS_DIR="$HOME/data/value-cover" npm run value -- held-membership
python3 scripts/value/prepare-held-coverage.py
```

`VALUE_BASE_CORPUS` defaults to `~/value-corpus`; `VALUE_CORPUS_DIR` defaults to
`~/data/value-cover` in the preparation and resume scripts. The generic CLI still
requires its explicit corpus variable. Set `VALUE_ENV_FILE` to the existing
credential file; credentials are read directly and never copied into artifacts.

```sh
VALUE_ENV_FILE=/path/to/existing/.env.local \
  NODE_OPTIONS=--max-old-space-size=512 VALUE_ANALYZE_CONCURRENCY=2 \
  node --import tsx scripts/value/run-held-coverage.ts --cache-only
```

The runner checks `/user`, shares the account's conservative usage ledger, and
enforces a hard 100,000-call ceiling including FX. Remove `--cache-only` on a
controller relaunch after quota reset. The controller must first coordinate with
the existing daily runner: an occupied daily-runner lock forces cache-only work.
Paid coverage acquires that same lock and releases it on exit. It never stops the
daily runner, publishes data, revalidates, or schedules background work. An EODHD
reset poisoned by the prior provider day must be reconciled through the existing
confirmed-reset procedure; do not zero a ledger by hand.

Raw responses, normalized fundamentals, filings and Jev readings are reused.
The analysis stage checks its input fingerprint again on resume, so newly arrived
prices or filings invalidate an earlier analysis checkpoint. Source failures and
incomplete batches remain retryable. Exit 75 means the run is incomplete, including
cache-only runs. `held-membership/progress.json` and `analyzed-checkpoint.json` are
the durable progress records. The final controller report must be written last;
no work continues afterward.

Stage and inspect the local candidate:

```sh
VALUE_CORPUS_DIR="$HOME/data/value-cover" VALUE_NO_EODHD=1 \
  NODE_OPTIONS=--max-old-space-size=1536 npm run value -- publish \
  --additions-only --out="$HOME/data/value-cover/staging/coverage"
python3 scripts/value/audit-held-coverage.py
python3 scripts/value/check-held-sources.py
VALUE_STORE_DIR="$HOME/data/value-cover/staging/coverage" \
  NODE_OPTIONS=--max-old-space-size=4096 npm run build -- --webpack
```

Use a fresh `--out` path, or `--overwrite` only for a complete earlier local
snapshot. The additions-only path rejects remote publication. It retains every
baseline dossier, index row, relative rank, historical row, and existing quote.
New search splits retain the previous parent entries and frozen identities in
new children, and still enforce the 60 KB shard limit. New-company buys can
increase counts; unexplained buy changes to existing companies remain blocked.

The second-source sample is fixed before validation (seed 20261004). Missing
facts and disagreements remain failures. Its current annual-share comparison
must distinguish reported weighted averages from the pipeline's documented
annual-share proxies; ADR units and issuer-specific revenue tags also require
review. Do not change the sample or widen tolerances to obtain a passing result.
The raw independent evidence is retained under `held-validation/raw`.
