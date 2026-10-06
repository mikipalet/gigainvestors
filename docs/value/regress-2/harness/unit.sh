#!/usr/bin/env bash
set -u
root=/Users/miki/data/regress/run2
unset VALUE_NO_EODHD VALUE_STORE_DIR
export NODE_OPTIONS="$NODE_OPTIONS --require=$PWD/docs/value/regress-1/harness/test-home.cjs"
node node_modules/vitest/vitest.mjs run tests/unit > "$root/evidence/unit-final-isolated.log" 2>&1
code=$?
echo "$code" > "$root/evidence/unit-final-isolated.exit"
exit "$code"
