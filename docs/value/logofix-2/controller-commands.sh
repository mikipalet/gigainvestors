#!/usr/bin/env bash
# Controller only. This task has NOT executed any release command.
set -euo pipefail
repo="$HOME/data/value-logofix"
live="$HOME/value-corpus"
daily=/Users/miki/GitHub/superinvestors-wt/value-daily
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/logofix-2-report.md
paused="$repo/controller-runner-paused-logofix-2.json"
export TMPDIR="$repo/tmp"
export VALUE_CORPUS_DIR="$live"
export VALUE_STORE_DIR="$live/publish-repo"
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=2048
cd "$repo"
check_disk() {
  python3 -c 'import pathlib,shutil; assert min(shutil.disk_usage(p).free for p in ["/",pathlib.Path.home()/"data"]) >= 4*1024**3, "DISK STOP: commit and stop"'
}
check_disk
test ! -e "$live/publish.hold"
test "$(head -n 1 "$report")" = READY
release=$(git rev-parse HEAD)
test "$(git log -1 --format=%s)" = 'value: restore demoted logos; publication guard'
git diff --quiet
git diff --cached --quiet
cmp docs/value/logofix-2/bundle-manifest.json "$repo/bundle-2/manifest.json"
sha256sum -c docs/value/logofix-2/bundle.sha256
node --env-file="$live/.env.local" --import tsx scripts/value/install-logo-recovery.ts "$repo/bundle-2" "$live"

# Pause only the idle controller-managed scheduler and its sleep. Lock stays owned.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"

# Fast-forward master only. If it advanced, stop for integration and revalidation.
git fetch origin master
git merge-base --is-ancestor origin/master "$release"
git push origin "$release:refs/heads/master"
python3 docs/value/logofix-2/controller-wait-vercel.py "$release"

git -C "$daily" diff --quiet
git -C "$daily" diff --cached --quiet
git merge-base --is-ancestor "$(git -C "$daily" rev-parse HEAD)" "$release"
git -C "$daily" switch --detach "$release"
runner_pid=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["root"]["pid"])' "$paused")
check_disk
VALUE_DAILY_LOCK_PID="$runner_pid" node --env-file="$live/.env.local" \
  --import tsx scripts/value/install-logo-recovery.ts "$repo/bundle-2" "$live" --apply

# Ordinary guarded publication only. No force, overlays or copied snapshot.
check_disk
node --env-file="$live/.env.local" --conditions=react-server --import tsx scripts/value/cli.ts publish
node --env-file="$live/.env.local" --conditions=react-server --import tsx scripts/value/post-publish-cli.ts

# Resume only after both commands succeed. On any failure leave the runner paused.
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"
