#!/usr/bin/env bash
set -euo pipefail
ulimit -c 0
repo=$(pwd)
root=/Users/miki/data/value-rules/.audit/rules-2
export TMPDIR="$root/tmp"
test ! -e "$root/evidence/DISK_STOP"
sudo -n unshare -mn bash -c '
 set -e
 mount --make-rprivate /
 mount --bind "$1" "$1"
 mount -o remount,bind,ro "$1"
 mount --bind "$3/tmp" /tmp
 ip link set lo up
 shift
 exec runuser -u miki -- env -i HOME=/Users/miki USER=miki PATH="$2/harness-bin:/usr/local/bin:/usr/bin:/bin" PUBFIX_REAL_CLOCK=1 PUBFIX_ROOT="$2" VALUE_CORPUS_DIR="$2/corpus" VALUE_STORE_DIR="$2/corpus/publish-repo" VALUE_NO_EODHD=1 VALUE_MIN_FREE_GB=4 VALUE_DATA_READ_WRITE_TOKEN=vercel_blob_rw_regress_local VALUE_REVALIDATE_URL=https://pubfix.invalid/revalidate VALUE_REVALIDATE_SECRET=local-noop TMPDIR="$2/tmp" XDG_CACHE_HOME="$2/tmp/xdg-cache" XDG_CONFIG_HOME="$2/tmp/xdg-config" npm_config_cache="$2/tmp/npm-cache" NEXT_TELEMETRY_DISABLED=1 PLAYWRIGHT_BROWSERS_PATH=/Users/miki/.cache/ms-playwright NODE_OPTIONS="--max-old-space-size=1024 --require=$1/docs/value/pubfix-2/harness/preload.cjs" bash "$1/docs/value/rules-2/harness/inside.sh" "${@:3}"
' -- /Users/miki/value-corpus "$repo" "$root" "$@"
