#!/usr/bin/env bash
set -euo pipefail
repo=$(pwd)
root=${PUBFIX_ROOT:-$HOME/data/pubfix-2}
# A fresh network namespace allows only loopback for the local production server.
sudo -n unshare -mn bash -c '
 set -e
 mount --make-rprivate /
 mount --bind "$1" "$1"
 mount -o remount,bind,ro "$1"
 ip link set lo up
 shift
 exec runuser -u miki -- env -i HOME=/Users/miki USER=miki PATH="$2/harness-bin:/usr/local/bin:/usr/bin:/bin" PUBFIX_ROOT="$2" VALUE_CORPUS_DIR="$2/corpus" VALUE_STORE_DIR="$2/corpus/publish-repo" VALUE_NO_EODHD=1 VALUE_MIN_FREE_GB=4 VALUE_DATA_READ_WRITE_TOKEN=vercel_blob_rw_pubfix_local VALUE_REVALIDATE_URL=https://pubfix.invalid/revalidate VALUE_REVALIDATE_SECRET=local-noop TMPDIR="$2/tmp" NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS="--require=$1/docs/value/pubfix-2/harness/preload.cjs" bash "$1/docs/value/pubfix-2/harness/inside.sh" "${@:3}"
' -- "$HOME/value-corpus" "$repo" "$root" "$@"
