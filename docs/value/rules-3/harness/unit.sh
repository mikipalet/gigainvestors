#!/usr/bin/env bash
set -u
root=/Users/miki/data/value-rules/.audit/rules-3
rm -f "$root/evidence/unit-final-isolated.exit"
unset VALUE_NO_EODHD VALUE_STORE_DIR
export VALUE_CORPUS_DIR="$root/tmp/unit-corpus"
export VALUE_TEST_TEMP_ROOT="$root/tmp/fixtures"
mkdir -p "$VALUE_CORPUS_DIR" "$VALUE_TEST_TEMP_ROOT"
export NODE_OPTIONS="$NODE_OPTIONS --require=$PWD/docs/value/rules-3/harness/test-home.cjs"
node node_modules/vitest/vitest.mjs run tests/unit > "$root/evidence/unit-final-isolated.log" 2>&1
code=$?
echo "$code" > "$root/evidence/unit-final-isolated.exit"
exit "$code"
