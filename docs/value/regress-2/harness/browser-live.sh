#!/usr/bin/env bash
set -u
root=/Users/miki/data/regress/run2
export VALUE_STORE_DIR="$root/baseline"
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/docs/value/pubfix-2/harness/fonts.cjs"
# Reuse the verified build: production files have not changed. Only the two
# archived canonical identities were restored in the runtime candidate store.
test "$(cat "$root/evidence/build-candidate.exit")" = 0 || exit 1
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3193 > "$root/evidence/server-live.log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for ((i=0;i<60;i++)); do
 if curl --silent --fail http://127.0.0.1:3193/value -o "$root/evidence/live-value.html"; then break; fi
 sleep 1
done
QA_VIEWPORTS=1728x970,390x844 node scripts/value/release-gate.mjs http://127.0.0.1:3193 "$root/evidence/browser-live" /s/ALSN.US,/s/FCN.US,/s/NFLX.US,/s/MCD.US,/s/CFRUY.US > "$root/evidence/browser-live.log" 2>&1
code=$?
echo "$code" > "$root/evidence/browser-live.exit"
exit "$code"
