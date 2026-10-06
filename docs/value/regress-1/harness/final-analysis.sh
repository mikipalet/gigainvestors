#!/usr/bin/env bash
set -u
root=/Users/miki/data/regress
for run in released remaining; do
 if [[ "$run" == remaining ]]; then
  while test ! -f "$root/evidence/analyze-remaining.exit"; do
   test ! -f "$root/evidence/DISK_STOP" || exit 74
   sleep 2
  done
 fi
 bash docs/value/regress-1/harness/run-isolated.sh env VALUE_ANALYZE_CONCURRENCY=2 REGRESS_RUN="converged-$run" REGRESS_IDS_FILE="$root/evidence/$run-ids.json" node --conditions=react-server --import tsx docs/value/regress-1/harness/analyze.ts > "$root/evidence/analyze-converged-$run.log" 2>&1
 code=$?
 echo "$code" > "$root/evidence/analyze-converged-$run.exit"
done
