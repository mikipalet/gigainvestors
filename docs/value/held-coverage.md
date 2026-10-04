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
enforces a hard 60,000-call coverage ceiling including FX, reserving at least
40,000 calls for the nightly runner. Remove `--cache-only` on a
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
python3 scripts/value/check-held-sources-v2.py
VALUE_STORE_DIR="$HOME/data/value-cover/staging/coverage" \
  NODE_OPTIONS=--max-old-space-size=4096 npm run build -- --webpack
```

Use a fresh `--out` path, or `--overwrite` only for a complete earlier local
snapshot. The additions-only path rejects remote publication. It retains every
baseline dossier, index row, relative rank, historical row, and existing quote.
New search splits retain the previous parent entries and frozen identities in
new children, and still enforce the 60 KB shard limit. New-company buys can
increase counts; unexplained buy changes to existing companies remain blocked.

The original second-source sample uses seed 20261004; cover-2 adds twenty more
with seed 202610042 and retains the sampled population. Run
`python3 scripts/value/check-held-sources-v2.py` for all forty. Missing facts and
disagreements remain failures. Reviewed share-class dimensions and depositary
ratios are in `docs/value/held-coverage-evidence/cover-2/source-bases.json`.
The generic SEC correction uses annual accounting concepts, currency, fiscal
periods and weighted diluted shares, with evidenced ADS and split conversions.
A proxy is not accepted merely because it has a different basis. Do not change
the sample or widen tolerances to obtain a passing result. Original independent
responses and filings remain under `held-validation/raw`.

Install the reviewed identity ledger before rebuilding held membership:
`cp docs/value/held-coverage-evidence/cover-2/mapping-resolutions.json
~/data/value-cover/held-membership/resolutions.json`. Every override requires the
exact original name/ticker, a reason and linked evidence; retired equity is not
mapped to an acquirer's or reorganized issuer's new shares. Reapply cached SEC
corrections with `node --import tsx scripts/value/correct-held-inputs.ts
docs/value/held-coverage-evidence/cover-2/source-bases.json`, then run
`scripts/value/reanalyse-held.ts` through the same Node/tsx invocation and
credential environment as the runner. Both operate on the isolated corpus.

Reviewed bank and foreign annual-report transcriptions are explicitly marked as
such in `OZK-reviewed-annual.json` and `LTG-reviewed-annual.json`; they are not raw
XBRL responses. Their matching cache locations are
`raw/annual-reviewed/OZK.US.json` and `raw/annual-reviewed/LTG.PSE.json`.
The generic correction also requires independent statement anchors before
changing a vendor currency label or fiscal period, and retains explicit
accounting-basis dimensions instead of mixing IFRS-EU and IFRS-IASB figures.

For bounded cache-only replays, set `VALUE_REPLAY_START` and
`VALUE_REPLAY_LIMIT`. Start at zero, then resume from `nextOffset` in
`held-validation/cover-2-analysis-progress.json`. The final coverage progress
must reflect actual current analyses and missing inputs. Full raw evidence and
screenshots stay on the data volume; compact proof is committed under
`docs/value/held-coverage-evidence/cover-2/`.
