#!/usr/bin/env bash
# Reparse cached EDINET filings offline for the given companies (3.8.1 capex concepts and year-end price, not yet in the live corpus).
# Usage (inside run-isolated.sh): renormalize-edinet.sh <ids file> <log name>
set -u
root=/Users/miki/data/value-currency-work/audit
test "$VALUE_CORPUS_DIR" = "$root/corpus" || exit 2
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
ids=$(paste -sd, "$1")
node --env-file="$PUBFIX_ROOT/harness.env" --conditions=react-server --import tsx scripts/value/cli.ts renormalize-edinet --only="$ids" > "$root/evidence/$2.log" 2>&1
code=$?
echo "$code" > "$root/evidence/$2.exit"
exit "$code"
