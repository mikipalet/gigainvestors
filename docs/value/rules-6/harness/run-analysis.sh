#!/usr/bin/env bash
set -euo pipefail
root="$PWD/.audit/rules-6"
while test ! -f "$root/evidence/setup.json"; do
 test ! -e "$root/evidence/DISK_STOP"
 sleep 5
done
set +e
bash docs/value/rules-6/harness/run-isolated.sh env REGRESS_RUN=candidate node --conditions=react-server --import tsx docs/value/rules-6/harness/analyze.ts > "$root/evidence/analyze-candidate.log" 2>&1
echo "$?" > "$root/evidence/analyze-candidate.exit"
set -e
python3 docs/value/rules-6/harness/verify-cache-failures.py
bash docs/value/rules-6/harness/run-isolated.sh bash docs/value/rules-6/harness/publish-out.sh
