#!/usr/bin/env bash
set -euo pipefail
root="$PWD/.audit/rules-7"
arm="$1"
code="$PWD"
if test "$arm" = live; then
 
 export VALUE_STORE_DIR="$root/baseline"
 port=3193
else
 export VALUE_STORE_DIR="$root/candidate-final"
 port=3192
fi
export BROWSER_IDS="$(cat "$root/evidence/browser-ids.txt")"
python3 docs/value/rules-7/harness/clear-browser-pages.py
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
(cd "$code" && exec node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port "$port") > "$root/evidence/server-dom-$arm.log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for ((i=0;i<60;i++)); do
 if curl --silent --fail "http://127.0.0.1:$port/value" -o /dev/null; then break; fi
 sleep 1
done
node --conditions=react-server --import tsx docs/value/rules-7/harness/price-dom-audit.ts "$arm"
