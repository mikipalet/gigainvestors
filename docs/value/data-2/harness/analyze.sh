#!/usr/bin/env bash
# Re-analyze the given published companies with the checked-out code, offline,
# from the bound corpus copy (cached vendor inputs and cached readings only).
# Usage (inside run-isolated.sh): analyze.sh <ids file> <log name>
set -u
root=/Users/miki/data/value-data2-work/audit
test "$VALUE_CORPUS_DIR" = "$root/corpus" || exit 2
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
ids=$(paste -sd, "$1")
node --env-file="$PUBFIX_ROOT/harness.env" --conditions=react-server --import tsx scripts/value/cli.ts analyze --only="$ids" > "$root/evidence/$2.log" 2>&1
code=$?
echo "$code" > "$root/evidence/$2.exit"
exit "$code"
