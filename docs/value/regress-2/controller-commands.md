# Controller commands — execute only after READY

Not executed by this task. The three approved Buy changes are ALSN, FDJU and FCN;
the proposed list is not an approval manifest. Keep the live hold until both real
publication and post-publication verification succeed. Run from the existing
isolated worktree; no external code push is needed for this local controller.

The observed runner is a detached `run-daily.sh` scheduler in the `value-daily`
worktree. Its pause helper checks the process identity and requires an idle sleep
before sending STOP; resume sends CONT to those exact process start times. It
never reads, removes, acquires or repairs the daily-runner lock. This pauses and
resumes the existing scheduler, avoiding a replacement runner contending for its
lock. These are controller instructions, not actions performed in this task.

```bash
set -euo pipefail
cd /Users/miki/data/regress/repo
export TMPDIR=/Users/miki/data/regress/tmp
export npm_config_cache=/Users/miki/data/regress/tmp/npm-cache
mkdir -p "$TMPDIR"
bundle=/Users/miki/data/regress/release-bundle
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/regress-2-report.md
stage=/Users/miki/data/regress/controller-corpus
backup=/Users/miki/data/regress/controller-backup
live=/Users/miki/value-corpus
daily=/Users/miki/GitHub/superinvestors-wt/value-daily
paused=/Users/miki/data/regress/controller-runner-paused.json
check_disk() {
  python3 -c 'import shutil; assert min(shutil.disk_usage(p).free for p in ["/","/Users/miki/data"]) >= 4*1024**3, "DISK STOP"'
}
check_disk
test "$(head -n 1 "$report")" = READY
python3 -c 'import json,sys; assert json.load(open(sys.argv[1]))["status"] == "READY"' "$bundle/manifest.json"

# 1. Stop the idle scheduler without touching its lock or the live hold.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"

# Install the reviewed code into the already isolated nightly checkout.
release_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["codeCommit"])' "$bundle/manifest.json")
git -C "$daily" diff --quiet
git -C "$daily" diff --cached --quiet
git -C "$daily" switch --detach "$release_commit"
npm ci --no-audit --no-fund

# 2. Independently stage the live corpus, then install the held additions/overlay.
# Exclusions avoid reading/copying the runner lock and hold. No live inputs change.
test ! -e "$stage"
mkdir -p "$stage"
rsync -a --exclude='/daily-runner*' --exclude='/publish.hold*' \
  --exclude='/backups' --exclude='/logs' "$live/" "$stage/"
check_disk
python3 docs/value/regress-1/harness/stage-bundle.py "$bundle" "$stage"
export VALUE_CORPUS_DIR="$stage"
export VALUE_STORE_DIR="$stage/publish-repo"
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=2048
# This stage uses the real controller remote/Blob credentials, never test stubs.
# The reviewed quotes must still meet the normal freshness guard; expired quotes abort.
node --env-file="$daily/.env.local" --conditions=react-server --import tsx \
  docs/value/regress-1/harness/controller-held-prices.ts "$bundle"

# 3. Ordinary real publication, then the ordinary post-publish check.
check_disk
node --env-file="$daily/.env.local" --conditions=react-server --import tsx \
  scripts/value/cli.ts publish
node --env-file="$daily/.env.local" --conditions=react-server --import tsx \
  scripts/value/post-publish-cli.ts

# 4. Preserve overwritten live paths and install only after both commands pass.
test ! -e "$backup"
mkdir -p "$backup"
python3 - "$bundle" "$live" "$backup" <<'PY'
import json,shutil,sys
from pathlib import Path
bundle,live,backup=map(Path,sys.argv[1:])
for rel in json.loads((bundle/'manifest.json').read_text())['overlayFiles']:
    src=live/rel
    if src.is_file():
        dst=backup/rel; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst)
shutil.copytree(live/'publish-repo',backup/'publish-repo')
PY
check_disk
tar --no-same-owner -xzf "$bundle/corpus-overlay.tar.gz" -C "$live"
rsync -a --delete "$stage/publish-repo/" "$live/publish-repo/"
test "$(git -C "$live/publish-repo" rev-parse HEAD)" = \
     "$(git -C "$stage/publish-repo" rev-parse HEAD)"

# 5. Only now remove the hold, then restart/resume the same scheduler.
rm "$live/publish.hold"
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"

# 6. Remove the controller scratch copy; keep the scoped backup and release bundle.
python3 - "$stage" <<'PY'
import shutil,sys
from pathlib import Path
p=Path(sys.argv[1]); assert p==Path('/Users/miki/data/regress/controller-corpus')
shutil.rmtree(p)
PY
```

If a command fails, stop. Keep the scheduler paused and the live hold in place;
inspect the publication receipt before retrying. Do not manually manipulate the
runner lock. No command above fetches EODHD or requests fresh Jev analysis.
