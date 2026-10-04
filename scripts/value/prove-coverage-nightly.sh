#!/usr/bin/env bash
# Must be invoked through with-daily-lock.sh. Entire proof is local/cache-only.
set -eu
export VALUE_CORPUS_DIR=${VALUE_CORPUS_DIR:-"$HOME/value-corpus"}
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=1536
cover=${VALUE_COVER_CORPUS:-"$HOME/data/value-cover"}
out="$cover/staging/cover-3-nightly"
python3 scripts/value/integrate-coverage.py
npm run value -- publish --out="$out"
node --import tsx scripts/value/prove-coverage-release.ts "$out" docs/value/held-coverage-evidence/cover-3/nightly-proof.json
