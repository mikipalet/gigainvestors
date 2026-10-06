#!/usr/bin/env bash
set -u
export TMPDIR=/Users/miki/data/regress/tmp
root=/Users/miki/data/regress
for run in released remaining; do
 test ! -e "$root/evidence/DISK_STOP" || exit 74
 bash docs/value/regress-1/harness/run-isolated.sh env VALUE_ANALYZE_CONCURRENCY=2 REGRESS_RUN="$run" REGRESS_IDS_FILE="$root/evidence/$run-ids.json" node --conditions=react-server --import tsx docs/value/regress-1/harness/analyze.ts > "$root/evidence/analyze-$run.log" 2>&1
 result=$?
 printf '%s\n' "$result" > "$root/evidence/analyze-$run.exit"
done
