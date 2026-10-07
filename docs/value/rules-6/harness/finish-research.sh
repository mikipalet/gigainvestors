#!/usr/bin/env bash
set -euo pipefail
root="$PWD/.audit/rules-6"
while ! tail -1 "$root/evidence/replay.log" | rg -q '^DONE '; do
 test ! -e "$root/evidence/DISK_STOP"
 sleep 5
done
python3 docs/value/rules-6/harness/refresh-research.py
REPLAY_REFRESH=flow_inputs,combined PART=0 PARTS=2 node --import tsx docs/value/rules-6/harness/replay.ts > "$root/evidence/replay-refresh-0.log" 2>&1 &
p0=$!
REPLAY_REFRESH=flow_inputs,combined PART=1 PARTS=2 node --import tsx docs/value/rules-6/harness/replay.ts > "$root/evidence/replay-refresh-1.log" 2>&1 &
p1=$!
wait "$p0"
wait "$p1"
python3 docs/value/rules-6/harness/evaluate.py > "$root/evidence/evaluation.log" 2>&1
