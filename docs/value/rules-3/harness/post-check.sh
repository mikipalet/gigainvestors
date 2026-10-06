#!/usr/bin/env bash
set -euo pipefail
root=/Users/miki/data/value-rules/.audit/rules-3
test "$VALUE_CORPUS_DIR" = "$root/corpus"
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3189 > "$root/evidence/server-post-check.log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for ((i=0;i<60;i++)); do
 if curl --silent --fail http://127.0.0.1:3189/value -o "$root/evidence/post-value.html"; then break; fi
 sleep 1
done
# Production verifyPublication and invariant code; local URL is the only check override.
node --env-file="$PUBFIX_ROOT/harness.env" --conditions=react-server --import tsx docs/value/rules-3/harness/post-check.ts
