#!/usr/bin/env bash
# Complete every independent check and retain failed publisher gates verbatim.
set -u
root=/Users/miki/data/value-rules/.audit/rules-5
python3 docs/value/rules-5/harness/audit.py > "$root/evidence/release-audit.log" 2>&1
echo "$?" > "$root/evidence/release-audit.exit"
python3 docs/value/rules-5/harness/explain-changes.py || exit 1
python3 docs/value/rules-5/harness/proposals.py || exit 1
bash docs/value/rules-5/harness/run-isolated.sh node --conditions=react-server --import tsx docs/value/rules-5/harness/check-price-gate.ts || exit 1
cp "$root/evidence/build-candidate.log" "$root/evidence/build-initial.log"
(
 bash docs/value/rules-5/harness/run-isolated.sh bash docs/value/rules-5/harness/build.sh > "$root/evidence/build-candidate.log" 2>&1
 code=$?
 echo "$code" > "$root/evidence/build-candidate.exit"
 exit "$code"
) &
build=$!
bash docs/value/rules-5/harness/run-isolated.sh bash docs/value/rules-5/harness/publish-real.sh
real=$?
wait "$build" || exit 1
if test "$real" = 0; then
 bash docs/value/rules-5/harness/run-isolated.sh bash docs/value/rules-5/harness/post-check.sh > "$root/evidence/post-check.log" 2>&1
 echo "$?" > "$root/evidence/post-check.exit"
else
 echo 'BLOCKED: REAL publication failed; no successful publication receipt to verify.' > "$root/evidence/post-check.log"
 echo blocked > "$root/evidence/post-check.exit"
fi
bash docs/value/rules-5/harness/run-isolated.sh bash docs/value/rules-5/harness/browser-final.sh > "$root/evidence/browser-final-run.log" 2>&1
python3 docs/value/rules-5/harness/compare-browser.py > "$root/evidence/browser-comparison.log" 2>&1
