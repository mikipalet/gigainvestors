#!/usr/bin/env bash
set -u
root=/Users/miki/data/value-rules/.audit/rules-5
export VALUE_STORE_DIR="$root/baseline"
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/docs/value/pubfix-2/harness/fonts.cjs"
# Reuse the verified build against the bound live archive. Clear runtime page
# caches before each arm so baseline and candidate read their own stores.
test "$(cat "$root/evidence/build-baseline.exit")" = 0 || exit 1
python3 docs/value/rules-5/harness/clear-browser-pages.py "$root/baseline-code" || exit 1
(cd "$root/baseline-code" && exec node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3193) > "$root/evidence/server-live.log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for ((i=0;i<60;i++)); do
 if curl --silent --fail http://127.0.0.1:3193/value -o "$root/evidence/live-value.html"; then break; fi
 sleep 1
done
QA_VIEWPORTS=1728x970,390x844 node scripts/value/release-gate.mjs http://127.0.0.1:3193 "$root/evidence/browser-live" /s/GOOGL.US,/s/NVDA.US,/s/MSFT.US,/s/AAPL.US,/s/COST.US > "$root/evidence/browser-live.log" 2>&1
code=$?
echo "$code" > "$root/evidence/browser-live.exit"
node --conditions=react-server --import tsx "$root/baseline-code/docs/value/rules-5/harness/browser-semantics.ts" live > "$root/evidence/semantics-live.log" 2>&1
echo "$?" > "$root/evidence/semantics-live.exit"
exit "$code"
