# Controller commands — blocked while the report or bundle is NOT

These commands were not executed. Keep the live `publish.hold` set while fixing
or approving the residual list. A NOT bundle is a review artifact, not permission
to publish. Reissue the proof and READY bundle after every residual and failed
gate is resolved; do not merely edit its status. Integrate the release commit
through the controller's normal code handoff first.

Gracefully pause the managed runner through its existing process manager. Do not
remove, acquire, recover or modify its lock. Prepare a fresh, independent full
copy of the live corpus at `~/data/regress/controller-corpus`, excluding the live
runner lock/guard and `publish.hold`. The hold stays in the live corpus. Use the
controller's existing copy procedure; do not follow links back into live data.
Keep all temporary files, dependencies and builds on `~/data`, and stop below
4 GiB on either volume.

```bash
set -euo pipefail
cd /Users/miki/data/regress/repo
export TMPDIR=/Users/miki/data/regress/tmp
mkdir -p "$TMPDIR"
# Task scratch dependencies were removed at handoff; install on the data volume.
export npm_config_cache=/Users/miki/data/regress/tmp/npm-cache
npm ci --no-audit --no-fund
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/regress-1-report.md
bundle=/Users/miki/data/regress/release-bundle
stage=/Users/miki/data/regress/controller-corpus
live=/Users/miki/value-corpus
test "$(head -n 1 "$report")" = READY
test -f "$live/publish.hold"
test ! -e "$stage/publish.hold"
python3 docs/value/regress-1/harness/stage-bundle.py "$bundle" "$stage"

# The staging repo must retain the real controller-managed remote, not the
# regression harness's local bare remote or its transport wrapper.
export VALUE_CORPUS_DIR="$stage"
export VALUE_STORE_DIR="$stage/publish-repo"
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=2048

# Publish only the already reviewed held quotes through the ordinary price
# transaction. This does not fetch EODHD or ask Jev; expired quotes abort.
node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx \
  docs/value/regress-1/harness/controller-held-prices.ts "$bundle"

# Ordinary publication and its ordinary post-publication verification.
# Live hold remains SET throughout both commands.
node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/cli.ts publish
node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/post-publish-cli.ts

# Only after publication and verification succeed, install the validated inputs
# and published archive into the paused live corpus. Retain a controller backup
# of the overwritten paths first. The overlay contains no hold, lock or secrets.
tar --no-same-owner -xzf "$bundle/corpus-overlay.tar.gz" -C "$live"
rsync -a --delete "$stage/publish-repo/" "$live/publish-repo/"
test "$(git -C "$live/publish-repo" rev-parse HEAD)" = \
     "$(git -C "$stage/publish-repo" rev-parse HEAD)"

# This is deliberately AFTER the release publishes and verifies.
rm "$live/publish.hold"
```

Resume the managed nightly only after that installation succeeds. Retain the
review bundle and backups, then delete the controller's scratch corpus and build
artifacts. If any step fails, retain the live hold and inspect the publication
receipt; do not retry installation or publication blindly.
