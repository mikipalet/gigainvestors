#!/usr/bin/env bash
# Same production build, bound live archive store: separates pre-existing from new findings.
set -u
root=/Users/miki/data/value-rules/.audit/rules-7
export VALUE_STORE_DIR="$root/baseline"
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
export BROWSER_IDS="$(cat "$root/evidence/browser-ids.txt")"
python3 docs/value/rules-7/harness/clear-browser-pages.py || exit 1
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3193 > "$root/evidence/server-live.log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for ((i=0;i<60;i++)); do
 if curl --silent --fail http://127.0.0.1:3193/value -o /dev/null; then break; fi
 sleep 1
done
paths=$(echo "$BROWSER_IDS" | tr ',' '\n' | sed 's#^#/s/#' | paste -sd,)
QA_VIEWPORTS=1728x970,390x844 node scripts/value/release-gate.mjs http://127.0.0.1:3193 "$root/evidence/browser-live" "$paths" > "$root/evidence/browser-live.log" 2>&1
echo "$?" > "$root/evidence/browser-live.exit"
node --conditions=react-server --import tsx docs/value/rules-7/harness/browser-semantics.ts live > "$root/evidence/semantics-live.log" 2>&1
echo "$?" > "$root/evidence/semantics-live.exit"
