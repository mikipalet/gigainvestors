# Controller only — do not execute unless rules-5 is READY

**Current disposition: NOT. Ordinary and REAL publication must pass after resolving missing canonical dossiers RACE.MI/STLAM.MI, and the source corpus drifted during verification; these commands intentionally refuse this bundle until a fresh proof binds the current source under an idle controller.**

The agent has not pushed externally, published live data, paused the runner, or changed the live corpus. The only publication proof used an isolated local bare remote and stub Blob. Method remains 3.5.0: all numerical candidates were rejected. The approval file is empty; proposal files are evidence, never authorization. These commands are the controller's release procedure. Any failure leaves the runner paused for inspection. No command opens or modifies the runner lock.

```bash
set -euo pipefail
cd ~/data/value-rules
export TMPDIR="$PWD/tmp"
export npm_config_cache="$TMPDIR/npm-cache"
mkdir -p "$TMPDIR"
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/rules-5-report.md
bundle="$PWD/release-bundle-rules-5"
stage="$PWD/controller-corpus-rules-5"
backup="$PWD/controller-backup-rules-5"
paused="$PWD/controller-runner-paused-rules-5.json"
live="$HOME/value-corpus"
daily=/Users/miki/GitHub/superinvestors-wt/value-daily
check_disk() {
  python3 -c 'import pathlib,shutil; assert min(shutil.disk_usage(p).free for p in ["/",pathlib.Path.home()/"data"]) >= 4*1024**3, "DISK STOP"'
}
check_disk
test "$(head -n 1 "$report")" = READY
python3 - "$bundle" <<'PY'
import hashlib,json,sys
from pathlib import Path
b=Path(sys.argv[1]);m=json.loads((b/'manifest.json').read_text())
assert m['status']=='READY' and m['method']=='3.5.0'
assert json.loads(Path('scripts/value/approved-verdict-changes.json').read_text())==[]
assert json.loads((b/'approved-verdict-changes.json').read_text())==[]
assert hashlib.sha256((b/'approved-verdict-changes.json').read_bytes()).hexdigest()==m['approvalManifestSha256']
PY
release_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["codeCommit"])' "$bundle/manifest.json")
test "$(git rev-parse HEAD)" = "$release_commit"
baseline_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["baselineCommit"])' "$bundle/manifest.json")
test "$(git -C "$live/publish-repo" rev-parse HEAD)" = "$baseline_commit"
git diff --exit-code
git diff --cached --exit-code

# Pause the existing idle scheduler, then push code without force.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"
git push origin "$release_commit:refs/heads/master"

# Bind GitHub's Vercel status to this exact release SHA and require production Ready.
python3 docs/value/logofix-2/controller-wait-vercel.py "$release_commit"

git -C "$daily" diff --exit-code
git -C "$daily" diff --cached --exit-code
git -C "$daily" switch --detach "$release_commit"
npm --prefix "$daily" ci --no-audit --no-fund

# Install the verified overlay into independent staging first. The installer
# verifies every artifact, live archive binding, and analyzed source hash.
check_disk
test ! -e "$stage"
python3 - "$bundle" "$stage" <<'PY'
import shutil,json,sys
from pathlib import Path
size=json.loads((Path(sys.argv[1])/"manifest.json").read_text())["sourceBytes"] * 1.2
assert shutil.disk_usage(Path(sys.argv[2]).parent).free > size + 4*1024**3, "Insufficient room for independent corpus plus 4 GiB reserve"
PY
mkdir -p "$stage"
rsync -aL --exclude='/daily-runner*' --exclude='/publish.hold*' \
  --exclude='/.env*' --exclude='/backups' --exclude='/logs' "$live/" "$stage/"
python3 docs/value/regress-1/harness/stage-bundle.py "$bundle" "$stage"
export VALUE_CORPUS_DIR="$stage"
export VALUE_STORE_DIR="$stage/publish-repo"
export VALUE_NO_EODHD=1
export NODE_OPTIONS=--max-old-space-size=2048
cd "$daily"
check_disk
node --env-file="$HOME/value-corpus/.env.local" --conditions=react-server --import tsx \
  scripts/value/cli.ts publish
check_disk
node --env-file="$HOME/value-corpus/.env.local" --conditions=react-server --import tsx \
  scripts/value/post-publish-cli.ts

# After both publication checks pass, back up only affected corpus paths and
# the archive. Install the same overlay and verified published archive for the
# resumed daily runner. Do not copy or manipulate any daily-runner file.
check_disk
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
tar --no-same-owner -xzf "$bundle/corpus-overlay.tar.gz" -C "$live"
rsync -a --delete "$stage/publish-repo/" "$live/publish-repo/"
test "$(git -C "$live/publish-repo" rev-parse HEAD)" = \
     "$(git -C "$stage/publish-repo" rev-parse HEAD)"
test ! -e "$live/publish-repo/.git/value-publish-pending.json"

# The controller may clear the publication hold after successful publication.
rm -f "$live/publish.hold"
cd ~/data/value-rules
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"
python3 - "$stage" <<'PY'
import shutil,sys
from pathlib import Path
p=Path(sys.argv[1]);assert p==Path('/Users/miki/data/value-rules/controller-corpus-rules-5')
shutil.rmtree(p)
PY
```

Retain the rollback backup and release bundle. If source/archive bindings, deployment identity, any guard, or post-publish checks fail, stop and leave the scheduler paused; do not weaken a guard or resume against stale live state.
