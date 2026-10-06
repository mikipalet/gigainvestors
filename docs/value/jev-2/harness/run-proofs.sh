#!/usr/bin/env bash
set -euo pipefail
export PUBFIX_ROOT=/Users/miki/data/jev-2
python3 docs/value/pubfix-2/harness/copy-audit.py > "$PUBFIX_ROOT/evidence/copy-audit.log"
python3 docs/value/pubfix-2/harness/setup.py > "$PUBFIX_ROOT/evidence/setup.log"
bash docs/value/pubfix-2/harness/run-isolated.sh bash -c 'export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=1536"; exec node --conditions=react-server --import tsx "$PUBFIX_ROOT/baseline-code/scripts/value/cli.ts" publish --out "$PUBFIX_ROOT/baseline-out"'  > "$PUBFIX_ROOT/evidence/baseline-out.log" 2>&1
bash docs/value/pubfix-2/harness/run-isolated.sh bash -c 'export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=1536"; exec node --conditions=react-server --import tsx scripts/value/cli.ts publish --out "$PUBFIX_ROOT/dry-run"'  > "$PUBFIX_ROOT/evidence/dry-run.log" 2>&1
