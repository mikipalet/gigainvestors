# Isolated controller reproduction

These commands do not publish externally. Work from `~/data/value-jev` on
`value-jev-2`. `~/data/jev-2` must be a new task directory. Stop and commit if
`/` or `~/data` has less than 4 GiB available. Never run the daily-runner lock
preamble. Do not source production environment files.

```bash
cd ~/data/value-jev
export PUBFIX_ROOT=/Users/miki/data/jev-2
df -h / ~/data
mkdir -p "$PUBFIX_ROOT"/{corpus,evidence,storage,tmp,harness-bin,test-home}
python3 docs/value/jev-2/harness/watch-disk.py &
rsync -aL --exclude=daily-runner.lock --exclude=.daily-runner.lock \
  ~/value-corpus/ "$PUBFIX_ROOT/corpus/"
cp docs/value/pubfix-2/harness/git "$PUBFIX_ROOT/harness-bin/git"
mkdir -p "$PUBFIX_ROOT/baseline-code"
git archive ab804f26a4ef567e65803a4251c7031da009ef5b \
  lib scripts data package.json tsconfig.json | tar -x -C "$PUBFIX_ROOT/baseline-code"
ln -s "$PWD/node_modules" "$PUBFIX_ROOT/baseline-code/node_modules"
bash docs/value/jev-2/harness/run-proofs.sh
node --max-old-space-size=512 --conditions=react-server --import tsx \
  docs/value/jev-2/harness/attribution.ts > "$PUBFIX_ROOT/evidence/attribution.log"
python3 docs/value/jev-2/harness/compare.py
bash docs/value/jev-2/harness/real.sh
```

`run-proofs.sh` checks the entire copy, creates the local bare remote, then
executes the ordinary baseline and candidate `publish --out` paths. The
pubfix-2 harness gives both the same publication clock (2026-10-05 09:10:50 UTC),
read-only access to the source corpus, loopback-only networking, blocked
unexpected fetches, disabled dotenv, local Blob stubs and a local git origin.
Use `--max-old-space-size=1536` for large publisher processes if the shared
host is under memory pressure; the real-path retry uses 2,048 MiB. Avoid overlapping large jobs.

`real.sh` deliberately retains the production Buy-now invariant. Its failure
on the unapproved additional transitions is the current blocker. Do not add
approvals merely to obtain a green harness. The two existing approvals are
in `scripts/value/approved-verdict-changes.json`; additional entries require
an explicit controller decision and source review. `approved.py` can reproduce
the exact two already-approved states from the baseline and candidate.

For browser verification, copy a cached Inter WOFF2 to
`$PUBFIX_ROOT/storage/inter.woff2`, then run:

```bash
bash docs/value/pubfix-2/harness/run-isolated.sh bash docs/value/jev-2/harness/build.sh
# JEV_PREVIEW=1 explicitly serves --out, including when the real path was blocked.
bash docs/value/pubfix-2/harness/run-isolated.sh env JEV_PREVIEW=1 \
  bash docs/value/jev-2/harness/browser.sh
```

After a successful real path, run the browser harness without `JEV_PREVIEW`
and verify every emitted JSON byte with
`python3 docs/value/pubfix-2/harness/byte-proof.py`. A failed real path must not
be described as a completed publication. `finish-audit.py` records the actual
local, bare and live source heads and receipt status.

The full suite was run with an isolated test home and the existing browser
cache, not the source corpus. Preserve that isolation when re-running tests:

```bash
PLAYWRIGHT_BROWSERS_PATH=/Users/miki/.cache/ms-playwright \
HOME="$PUBFIX_ROOT/test-home" TMPDIR=/tmp \
  node node_modules/vitest/vitest.mjs run --maxWorkers=2 --testTimeout=15000
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Save evidence outside the corpus copy, stop the disk watcher with
`touch "$PUBFIX_ROOT/evidence/done"`, and delete the copies using
`python3 docs/value/jev-2/harness/cleanup.py`. Remove only this task's `.next`
build. Never remove the source corpus or shared `node_modules`.
