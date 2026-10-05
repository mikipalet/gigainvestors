#!/usr/bin/env bash
# Must be invoked through with-daily-lock.sh. Entire proof is local/cache-only.
set -eu
export VALUE_CORPUS_DIR=${VALUE_CORPUS_DIR:-"$HOME/value-corpus"}
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=1536
cover=${VALUE_COVER_CORPUS:-"$HOME/data/value-cover"}
batch=${VALUE_COVER_BATCH:-cover-3}
out="$cover/staging/$batch-nightly"
evidence="docs/value/held-coverage-evidence/$batch/nightly-proof.json"
mkdir -p "$(dirname "$evidence")"
python3 scripts/value/integrate-coverage.py
npm run value -- publish --out="$out"
node --import tsx scripts/value/prove-coverage-release.ts "$out" "$evidence"
