#!/usr/bin/env bash
set -euo pipefail
repo=$(pwd)
root=${PUBFIX_ROOT:?}
# Tests supply their own fetch doubles and dates. Do not inject the publisher's
# VALUE_NO_EODHD flag or frozen clock: those disable the tested mock requests.
sudo -n unshare -mn bash -c '
 set -e
 mount --make-rprivate /
 mount --bind "$1" "$1"
 mount -o remount,bind,ro "$1"
 ip link set lo up
 exec runuser -u miki -- env -i HOME="$3/test-home" USER=miki PATH=/usr/local/bin:/usr/bin:/bin TMPDIR=/tmp PLAYWRIGHT_BROWSERS_PATH=/Users/miki/.cache/ms-playwright node "$2/node_modules/vitest/vitest.mjs" run --maxWorkers=2 --testTimeout=15000 "${@:4}"
' -- /Users/miki/value-corpus "$repo" "$root" "$@"
