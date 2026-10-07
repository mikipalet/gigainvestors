#!/usr/bin/env bash
set -u
root=/Users/miki/data/value-rules/.audit/rules-6
rm -f "$root/evidence/publish-real.exit"
test "$VALUE_CORPUS_DIR" = "$root/corpus" || exit 2
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=2048"
node --env-file="$PUBFIX_ROOT/harness.env" --conditions=react-server --import tsx scripts/value/cli.ts publish > "$root/evidence/publish-real.log" 2>&1
code=$?
echo "$code" > "$root/evidence/publish-real.exit"
exit "$code"
