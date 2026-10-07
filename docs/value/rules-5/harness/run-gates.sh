#!/usr/bin/env bash
set -euo pipefail
root=/Users/miki/data/value-rules/.audit/rules-5
while test ! -f "$root/evidence/setup.json"; do
 test ! -e "$root/evidence/DISK_STOP"
 sleep 5
done
set +e
bash docs/value/rules-5/harness/run-isolated.sh env REGRESS_RUN=candidate node --conditions=react-server --import tsx docs/value/rules-5/harness/analyze.ts > "$root/evidence/analyze-candidate.log" 2>&1
echo "$?" > "$root/evidence/analyze-candidate.exit"
set -e
# A cache-only refusal is retained and audited, not bypassed with a fresh call.
python3 docs/value/rules-5/harness/verify-cache-failures.py
bash docs/value/rules-5/harness/run-isolated.sh bash docs/value/rules-5/harness/publish-out.sh
