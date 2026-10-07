#!/usr/bin/env bash
set -euo pipefail
root="$PWD/.audit/rules-6"
set +e
bash docs/value/rules-6/harness/run-isolated.sh bash docs/value/rules-6/harness/build.sh > "$root/evidence/build-candidate.log" 2>&1
code=$?
echo "$code" > "$root/evidence/build-candidate.exit"
set -e
test "$code" = 0
set +e
bash docs/value/rules-6/harness/run-isolated.sh bash docs/value/rules-6/harness/post-check.sh > "$root/evidence/post-check.log" 2>&1
code=$?
echo "$code" > "$root/evidence/post-check.exit"
set -e
test "$code" = 0
bash docs/value/rules-6/harness/run-isolated.sh bash docs/value/rules-6/harness/browser-final.sh || true
bash docs/value/rules-6/harness/run-isolated.sh bash docs/value/rules-6/harness/price-dom-audit.sh candidate > "$root/evidence/price-dom-candidate.log" 2>&1
python3 docs/value/rules-6/harness/compare-browser.py > "$root/evidence/browser-comparison.log" 2>&1
