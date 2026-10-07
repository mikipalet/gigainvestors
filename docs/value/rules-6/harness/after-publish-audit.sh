#!/usr/bin/env bash
set -euo pipefail
root="$PWD/.audit/rules-6"
while test ! -f "$root/evidence/publish-real.exit"; do
 test ! -e "$root/evidence/DISK_STOP"
 sleep 5
done
test "$(cat "$root/evidence/publish-real.exit")" = 0
python3 docs/value/rules-6/harness/audit-logo-files.py
bash docs/value/rules-6/harness/run-isolated.sh node --conditions=react-server --import tsx docs/value/rules-6/harness/coverage-proof.ts
python3 docs/value/rules-6/harness/blockers.py
bash docs/value/rules-6/harness/run-isolated.sh node --conditions=react-server --import tsx docs/value/rules-6/harness/check-price-gate.ts
bash docs/value/rules-6/harness/run-isolated.sh node --conditions=react-server --import tsx docs/value/rules-6/harness/company-summary.ts
python3 docs/value/rules-6/harness/preserved-bytes.py
python3 docs/value/rules-6/harness/final-archive.py
