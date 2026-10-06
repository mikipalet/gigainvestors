#!/usr/bin/env bash
set -euo pipefail
export PUBFIX_REAL_CLOCK=1
if [[ "${JEV_PREVIEW:-0}" == 1 ]]; then export VALUE_STORE_DIR="$PUBFIX_ROOT/dry-run"; fi
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3189 > "$PUBFIX_ROOT/evidence/server.log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for ((i=0;i<60;i++)); do
 if curl --silent --fail http://127.0.0.1:3189/value -o /dev/null; then break; fi
 sleep 1
done
node --conditions=react-server --import tsx docs/value/jev-2/harness/browser.ts
