#!/usr/bin/env bash
set -u
root=/Users/miki/data/regress/run2
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=2048"
node --conditions=react-server --import tsx scripts/value/cli.ts publish --out "$root/candidate-final" > "$root/evidence/publish-out-final.log" 2>&1
code=$?
echo "$code" > "$root/evidence/publish-out-final.exit"
exit "$code"
