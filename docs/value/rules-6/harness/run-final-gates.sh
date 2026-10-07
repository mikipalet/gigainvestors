#!/usr/bin/env bash
set -euo pipefail
root="$PWD/.audit/rules-6"
while test ! -f "$root/evidence/publish-out-final.exit"; do
 test ! -e "$root/evidence/DISK_STOP"
 sleep 5
done
test "$(cat "$root/evidence/publish-out-final.exit")" = 0
bash docs/value/rules-6/harness/run-isolated.sh node --conditions=react-server --import tsx docs/value/rules-6/harness/proposals.ts
python3 docs/value/rules-6/harness/audit.py
bash docs/value/rules-6/harness/run-isolated.sh bash docs/value/rules-6/harness/publish-real.sh
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
python3 docs/value/rules-6/harness/compare-browser.py
