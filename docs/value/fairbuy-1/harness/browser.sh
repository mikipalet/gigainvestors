#!/usr/bin/env bash
# Serve the verified production build against a store and run both browser gates.
# Usage (inside run-isolated.sh): browser.sh <store dir> <comma ids> <evidence subdir>
set -u
root=/Users/miki/data/value-fairbuy/.audit/fairbuy-1
store="$1"; ids="$2"; out="$root/evidence/$3"
export VALUE_STORE_DIR="$store"
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/docs/value/pubfix-2/harness/fonts.cjs"
test "$(cat "$root/evidence/build.exit")" = 0 || exit 1
mkdir -p "$out"
python3 docs/value/fairbuy-1/harness/clear-browser-pages.py "$ids" "$root/evidence" || exit 1
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3194 > "$out/server.log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for ((i=0;i<90;i++)); do
 if curl --silent --fail http://127.0.0.1:3194/value -o "$out/value.html"; then break; fi
 sleep 1
done
code=0
# The semantic gate needs Buys; the baseline arm (SEMANTIC=0) only separates pre-existing layout findings.
if [ "${SEMANTIC:-1}" = 1 ]; then
 node --conditions=react-server --import tsx docs/value/fairbuy-1/harness/browser-fairbuy.ts http://127.0.0.1:3194 "$store" "$ids" "$out/semantic" > "$out/semantic.log" 2>&1
 code=$?
fi
paths="/value,/value/method,$(echo "$ids" | tr ',' '\n' | sed 's#^#/s/#' | tr 'A-Z' 'a-z' | paste -sd,)"
QA_VIEWPORTS=1728x970,2056x1180,390x844,820x1180 node scripts/value/release-gate.mjs http://127.0.0.1:3194 "$out/release-gate" "$paths" > "$out/release-gate.log" 2>&1
code2=$?
echo "$code $code2" > "$out/exit"
test "$code" = 0 && test "$code2" = 0
