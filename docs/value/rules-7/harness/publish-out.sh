#!/usr/bin/env bash
set -u
root=/Users/miki/data/value-rules/.audit/rules-7
rm -f "$root/evidence/publish-out-final.exit"
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=2048"
node --env-file="$root/harness.env" --conditions=react-server --import tsx scripts/value/cli.ts publish --out="$root/candidate-final" > "$root/evidence/publish-out-final.log" 2>&1
code=$?
echo "$code" > "$root/evidence/publish-out-final.exit"
exit "$code"
