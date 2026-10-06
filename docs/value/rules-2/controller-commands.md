# Controller commands — not executed

Run only after the report says READY **and the owner explicitly approves the exact proposed Buy manifest**. READY means the local gates passed; it does not grant Buy approval or authorize publication. Set `RULES_2_BUY_APPROVAL_SHA256` to the reviewed manifest digest recorded in the report after approval. Abort on changed sources, archive, tuples, prices or expired quotes; repeat review rather than relaxing a guard. No EODHD or fresh Jev reading is used.

```bash
set -euo pipefail
cd /Users/miki/data/value-rules
export TMPDIR=/Users/miki/data/value-rules/tmp
export npm_config_cache="$TMPDIR/npm-cache"
mkdir -p "$TMPDIR"
bundle=/Users/miki/data/value-rules/release-bundle
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/rules-2-report.md
stage=/Users/miki/data/value-rules/controller-corpus
backup=/Users/miki/data/value-rules/controller-backup
live=/Users/miki/value-corpus
daily=/Users/miki/GitHub/superinvestors-wt/value-daily
paused=/Users/miki/data/value-rules/controller-runner-paused.json
check_disk() {
  python3 -c 'import shutil; assert min(shutil.disk_usage(p).free for p in ["/","/Users/miki/data"]) >= 4*1024**3, "DISK STOP"'
}
check_disk
test "$(head -n 1 "$report")" = READY
python3 - "$bundle" <<'PY'
import hashlib,json,os,sys
from pathlib import Path
b=Path(sys.argv[1]);m=json.loads((b/'manifest.json').read_text())
assert m['status']=='READY'
want=hashlib.sha256((b/'proposed-buy-approvals.json').read_bytes()).hexdigest()
assert os.environ.get('RULES_2_BUY_APPROVAL_SHA256')==want, 'Exact owner Buy approval is required'
PY

# Pause the existing idle scheduler. This helper never opens or changes its lock.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"
release_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["codeCommit"])' "$bundle/manifest.json")
git -C "$daily" diff --quiet
git -C "$daily" diff --cached --quiet
git -C "$daily" switch --detach "$release_commit"
npm --prefix "$daily" ci --no-audit --no-fund

# Stage an independent corpus without copying the runner lock, hold or secrets.
test ! -e "$stage"
mkdir -p "$stage"
rsync -a --exclude='/daily-runner*' --exclude='/publish.hold*' \
  --exclude='/.env*' --exclude='/backups' --exclude='/logs' "$live/" "$stage/"
check_disk
python3 docs/value/regress-1/harness/stage-bundle.py "$bundle" "$stage"
export VALUE_CORPUS_DIR="$stage"
export VALUE_STORE_DIR="$stage/publish-repo"
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=2048

# Ordinary publication and post-publication verification. The token is in the
# LIVE CORPUS env file, not the code checkout. Keep this flag on BOTH commands.
cd "$daily"
check_disk
node --env-file="$live/.env.local" --conditions=react-server --import tsx \
  scripts/value/cli.ts publish
node --env-file="$live/.env.local" --conditions=react-server --import tsx \
  scripts/value/post-publish-cli.ts

# Preserve overwritten live paths; install only after both commands pass.
test ! -e "$backup"
mkdir -p "$backup"
python3 - "$bundle" "$live" "$backup" <<'PY'
import json,shutil,sys
from pathlib import Path
bundle,live,backup=map(Path,sys.argv[1:])
for rel in json.loads((bundle/'manifest.json').read_text())['overlayFiles']:
    src=live/rel
    if src.is_file():
        dst=backup/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
shutil.copytree(live/'publish-repo',backup/'publish-repo')
PY
check_disk
tar --no-same-owner -xzf "$bundle/corpus-overlay.tar.gz" -C "$live"
rsync -a --delete "$stage/publish-repo/" "$live/publish-repo/"
test "$(git -C "$live/publish-repo" rev-parse HEAD)" = \
     "$(git -C "$stage/publish-repo" rev-parse HEAD)"

# Remove an existing hold only after publication and post-publication pass,
# then resume the same scheduler without interacting with its lock.
rm -f "$live/publish.hold"
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"
python3 - "$stage" <<'PY'
import shutil,sys
from pathlib import Path
p=Path(sys.argv[1]);assert p==Path('/Users/miki/data/value-rules/controller-corpus')
shutil.rmtree(p)
PY
```

If anything fails, stop and keep the scheduler paused and any existing hold in place. Inspect the publication receipt before retrying. Retain the scoped rollback backup and reviewed bundle. No controller command above was run by this task.
