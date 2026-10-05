#!/usr/bin/env bash
set -euo pipefail
test -e "$PUBFIX_ROOT/node_modules" || ln -s "$PWD/node_modules" "$PUBFIX_ROOT/node_modules"
export PUBFIX_REAL_CLOCK=1
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=4096"
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/docs/value/pubfix-2/harness/fonts.cjs"
if [[ "${PUBFIX_SKIP_BUILD:-0}" != 1 ]]; then
 node node_modules/next/dist/bin/next build --webpack > "$PUBFIX_ROOT/evidence/build.log" 2>&1
fi
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3189 > "$PUBFIX_ROOT/evidence/server.log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for ((i=0;i<60;i++)); do
 if curl --silent --fail http://127.0.0.1:3189/value -o "$PUBFIX_ROOT/evidence/value.html"; then break; fi
 sleep 1
done
node --conditions=react-server --import tsx docs/value/pubfix-2/harness/post-check.ts

cp "$PUBFIX_ROOT/evidence/live-check.json" "$PUBFIX_ROOT/evidence/real-live-check.json"
# Reproduce the nightly ordinary branch from the same pre-dedupe git baseline.
source_head=$(python3 -c 'import json,os; print(json.load(open(os.environ["PUBFIX_ROOT"]+"/evidence/setup.json"))["sourceHead"])')
repo="$VALUE_CORPUS_DIR/publish-repo"
git -C "$repo" reset --hard "$source_head" > "$PUBFIX_ROOT/evidence/nightly-reset.log"
git -C "$repo" clean -fd >> "$PUBFIX_ROOT/evidence/nightly-reset.log"
git -C "$repo" update-ref refs/remotes/origin/main "$source_head"
git -C "$PUBFIX_ROOT/storage/remote.git" update-ref refs/heads/main "$source_head"
unset PUBFIX_REAL_CLOCK
bash docs/value/pubfix-2/harness/nightly.sh > "$PUBFIX_ROOT/evidence/nightly.log" 2>&1
cp "$PUBFIX_ROOT/evidence/live-check.json" "$PUBFIX_ROOT/evidence/nightly-live-check.json"
PUBFIX_PROOF_NAME=nightly python3 docs/value/pubfix-2/harness/byte-proof.py > "$PUBFIX_ROOT/evidence/nightly-byte-proof.log" 2>&1
