#!/usr/bin/env bash
set -euo pipefail
root="$PWD/.audit/rules-6"
while test ! -f "$root/evidence/build-candidate.exit"; do
 test ! -e "$root/evidence/DISK_STOP"
 sleep 5
done
test "$(cat "$root/evidence/build-candidate.exit")" = 0
cp "$root/evidence/input-integrity.json" "$root/evidence/input-integrity-interim.json"
bash docs/value/rules-6/harness/run-isolated.sh python3 docs/value/rules-6/harness/verify-live.py > "$root/evidence/integrity-final.log" 2>&1
python3 docs/value/rules-6/harness/final-archive.py
printf '0\n' > "$root/evidence/end-bindings.exit"
