#!/usr/bin/env bash
set -u
root=/Users/miki/data/value-rules/.audit/rules-5
export VALUE_STORE_DIR="$root/candidate-final"
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/docs/value/pubfix-2/harness/fonts.cjs"
# Serve the verified production build against the final candidate store.
test "$(cat "$root/evidence/build-candidate.exit")" = 0 || exit 1
python3 docs/value/rules-5/harness/clear-browser-pages.py || exit 1
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3192 > "$root/evidence/server-candidate.log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for ((i=0;i<60;i++)); do
 if curl --silent --fail http://127.0.0.1:3192/value -o "$root/evidence/candidate-value.html"; then break; fi
 sleep 1
done
QA_VIEWPORTS=1728x970,390x844 node scripts/value/release-gate.mjs http://127.0.0.1:3192 "$root/evidence/browser" /s/GOOGL.US,/s/NVDA.US,/s/MSFT.US,/s/AAPL.US,/s/COST.US > "$root/evidence/browser.log" 2>&1
code=$?
echo "$code" > "$root/evidence/browser.exit"
node --conditions=react-server --import tsx docs/value/rules-5/harness/browser-semantics.ts candidate > "$root/evidence/semantics-candidate.log" 2>&1
echo "$?" > "$root/evidence/semantics-candidate.exit"
exit "$code"
