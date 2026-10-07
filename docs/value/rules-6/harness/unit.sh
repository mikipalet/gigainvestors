#!/usr/bin/env bash
set -u
root=/Users/miki/data/value-rules/.audit/rules-6
rm -f "$root/evidence/unit-final-isolated.exit"
unset VALUE_NO_EODHD VALUE_STORE_DIR
export VALUE_CORPUS_DIR="$root/tmp/unit-corpus"
export VALUE_TEST_TEMP_ROOT="$root/tmp/fixtures"
mkdir -p "$VALUE_CORPUS_DIR" "$VALUE_TEST_TEMP_ROOT"
# Unit tests provide their own provider/Blob mocks. Keep the fixture-home
# redirect and OS isolation, without loading the publication stub in each of
# the runner tests' many bookkeeping subprocesses. Deadlines stay unchanged.
export NODE_OPTIONS="--max-old-space-size=1024 --require=$PWD/docs/value/rules-6/harness/test-home.cjs"
export NODE_COMPILE_CACHE="$root/tmp/node-compile-cache"
node node_modules/vitest/vitest.mjs run tests/unit --no-cache > "$root/evidence/unit-final-isolated.log" 2>&1
code=$?
echo "$code" > "$root/evidence/unit-final-isolated.exit"
exit "$code"
