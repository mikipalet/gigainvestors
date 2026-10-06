#!/usr/bin/env bash
# Run only after the shipped marker, merge and independent copy are bound.
set -euo pipefail
root=/Users/miki/data/value-rules/.audit/rules-3
export TMPDIR="$root/tmp"
test -f "$root/evidence/merged-master.json"
test -f "$root/evidence/setup.json"
run_gate() {
  local name="$1"
  shift
  test ! -f "$root/evidence/DISK_STOP"
  set +e
  bash docs/value/rules-3/harness/run-isolated.sh "$@" \
    > "$root/evidence/$name.log" 2>&1
  local result=$?
  set -e
  echo "$result" > "$root/evidence/$name.exit"
  echo "$name: exit $result"
  return "$result"
}

# Cache misses are enumerated and restored from their exact bound source bytes.
# Any unexpected analysis failure is fatal in verify-cache-failures.py.
run_gate analyze-candidate env VALUE_ANALYZE_CONCURRENCY=2 REGRESS_RUN=candidate \
  node --conditions=react-server --import tsx docs/value/rules-3/harness/analyze.ts || \
  test "$(cat "$root/evidence/analyze-candidate.exit")" = 1
python3 docs/value/rules-3/harness/verify-cache-failures.py
run_gate ordinary-export bash docs/value/rules-3/harness/publish-out.sh
python3 docs/value/rules-3/harness/audit.py > "$root/evidence/release-audit.log"
run_gate price-gate node --conditions=react-server --import tsx docs/value/rules-3/harness/check-price-gate.ts
run_gate diagnostic-basis node --conditions=react-server --import tsx docs/value/rules-3/harness/diagnostic-basis.ts
run_gate real-publication bash docs/value/rules-3/harness/publish-real.sh
run_gate coverage-proof node --conditions=react-server --import tsx docs/value/rules-3/harness/coverage-proof.ts
python3 docs/value/rules-3/harness/preserved-bytes.py
run_gate full-unit bash docs/value/rules-3/harness/unit.sh
run_gate build-candidate bash docs/value/rules-3/harness/build.sh
run_gate final-types node node_modules/typescript/bin/tsc --noEmit

# Retain strict findings; the comparison permits only exact existing findings
# and previously accepted chrome/whitespace, with every interaction completed.
run_gate browser-live-run bash docs/value/rules-3/harness/browser-live.sh || true
run_gate browser-candidate-run bash docs/value/rules-3/harness/browser-final.sh || true
python3 docs/value/rules-3/harness/compare-browser.py
run_gate post-check bash docs/value/rules-3/harness/post-check.sh
python3 docs/value/rules-3/harness/verify-live.py
python3 docs/value/rules-3/harness/final-archive.py
