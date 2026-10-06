#!/usr/bin/env bash
set -u
ulimit -c 0
export PUBFIX_ROOT=/Users/miki/data/jev-3
bash docs/value/pubfix-2/harness/run-isolated.sh bash -c 'export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=2048 --require=$PWD/docs/value/jev-3/harness/proposed-approvals.cjs"; exec node --conditions=react-server --import tsx scripts/value/cli.ts publish' > "$PUBFIX_ROOT/evidence/real-publish.log" 2>&1
result=$?
printf '%s\n' "$result" > "$PUBFIX_ROOT/evidence/real-publish.exit"
exit "$result"
