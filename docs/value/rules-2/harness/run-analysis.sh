#!/usr/bin/env bash
set -euo pipefail
root=/Users/miki/data/value-rules/.audit/rules-2
export TMPDIR="$root/tmp"
# Both engines read the identical cached sources, same UTC day and cached Jev.
mkdir -p "$root/control-code/docs/value/rules-2/harness"
cp docs/value/rules-2/harness/analyze.ts "$root/control-code/docs/value/rules-2/harness/analyze.ts"
set +e
bash docs/value/rules-2/harness/run-isolated.sh env VALUE_ANALYZE_CONCURRENCY=2 REGRESS_RUN=control REGRESS_CODE_DIR="$root/control-code" REGRESS_IDS_FILE="$root/evidence/released-ids.json" node --conditions=react-server --import tsx "$root/control-code/docs/value/rules-2/harness/analyze.ts" > "$root/evidence/analyze-control.log" 2>&1
code=$?
echo "$code" > "$root/evidence/analyze-control.exit"
set -e
python3 docs/value/rules-2/harness/save-control.py
set +e
bash docs/value/rules-2/harness/run-isolated.sh env NODE_OPTIONS="--max-old-space-size=2048 --require=$PWD/docs/value/pubfix-2/harness/preload.cjs" node --env-file="$root/harness.env" --conditions=react-server --import tsx "$root/control-code/scripts/value/cli.ts" publish --out="$root/control-store" > "$root/evidence/publish-control.log" 2>&1
code=$?
echo "$code" > "$root/evidence/publish-control.exit"
set +e
bash docs/value/rules-2/harness/run-isolated.sh env VALUE_ANALYZE_CONCURRENCY=2 REGRESS_RUN=candidate node --conditions=react-server --import tsx docs/value/rules-2/harness/analyze.ts > "$root/evidence/analyze-candidate.log" 2>&1
code=$?
echo "$code" > "$root/evidence/analyze-candidate.exit"
exit "$code"
