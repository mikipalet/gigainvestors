#!/usr/bin/env bash
set -euo pipefail
repo=/Users/miki/data/value-rules
root="$repo/.audit/rules-7"
test ! -e "$root/evidence/DISK_STOP"
sudo -n unshare -m bash -c '
 mount --make-rprivate /
 mount --bind /Users/miki/value-corpus /Users/miki/value-corpus
 mount -o remount,bind,ro /Users/miki/value-corpus
 exec runuser -u miki -- env -i HOME=/Users/miki PATH=/usr/local/bin:/usr/bin:/bin VALUE_CORPUS_DIR="$1/corpus" VALUE_NO_EODHD=1 VALUE_MIN_FREE_GB=4 NODE_OPTIONS="--require=$2/docs/value/rules-7/harness/jev-only.cjs" node --env-file=/Users/miki/GitHub/superinvestors-wt/value/.env.local --conditions=react-server --import tsx scripts/value/cli.ts analyze --only=001800.KO
' -- "$root" "$repo"
