# Controller only — do not execute unless rules-7 is READY

Future controller procedure only; these commands have not been executed. The agent has not pushed code, externally published data, or paused the runner. There is no Buy approval manifest step: computed verdicts publish as the data says, in this release and in later nightlies. The overlay installs the reviewed data-error-only `verdict-freeze.json` (41 ids) and the corrected corpus files. Publisher and post-publisher read the publish token with `--env-file` and never print it. Any failure leaves the runner paused for inspection. No command opens or modifies the runner lock.

```bash
set -euo pipefail
cd ~/data/value-rules
export TMPDIR="$PWD/tmp"
export npm_config_cache="$TMPDIR/npm-cache"
mkdir -p "$TMPDIR"
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/rules-7-report.md
bundle="$PWD/release-bundle-rules-7"
stage="$PWD/controller-corpus-rules-7"
backup="$PWD/controller-backup-rules-7"
paused="$PWD/controller-runner-paused-rules-7.json"
live="$HOME/value-corpus"
daily=/Users/miki/GitHub/superinvestors-wt/value-daily
check_disk() {
  python3 -c 'import pathlib,shutil; assert min(shutil.disk_usage(p).free for p in ["/",pathlib.Path.home()/"data"]) >= 4*1024**3, "DISK STOP"'
}
check_disk
git merge-base --is-ancestor 752f825 HEAD  # live code (method 3.7.0) is merged
test "$(head -n 1 "$report")" = READY
python3 - "$bundle" <<'PY'
import json,sys
from pathlib import Path
b=Path(sys.argv[1]);m=json.loads((b/'manifest.json').read_text())
assert m['status']=='READY' and m['method']=='3.7.1'
# Buy verdicts follow the data: no approval manifest exists or is consulted.
assert not Path('scripts/value/approved-verdict-changes.json').exists()
assert m['approvalManifest'] is None
assert json.loads((b/'verdict-freeze.json').read_text())['ids']==m['frozenIds']
PY
python3 docs/value/rules-7/harness/verify-bundle.py
release_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["codeCommit"])' "$bundle/manifest.json")
test "$(git rev-parse HEAD)" = "$release_commit"
git diff --exit-code
git diff --cached --exit-code

# Run only under a later controller instruction authorizing deployment/publication.
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
mkdir -p "$stage"
# The 55 report extracts lost in the value-cover cleanup are absent (their dangling links sit
# under the excluded backups/); the nightly refetches them and those companies keep their prior
# analysis. Exit 23 is tolerated only for files vanishing mid-copy; stage-bundle.py verifies every bound hash.
set +e
rsync -aL --exclude='/daily-runner*' --exclude='/publish.hold*' \
  --exclude='/.env*' --exclude='/backups' --exclude='/logs' "$live/" "$stage/"
code=$?
set -e
test "$code" = 0 || test "$code" = 23
python3 docs/value/rules-7/harness/stage-bundle.py "$bundle" "$stage"
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
m=json.loads((bundle/'manifest.json').read_text())
for rel in [*m['overlayFiles'],*m['removedFiles']]:
    src=live/rel
    if src.is_file():
        dst=backup/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
shutil.copytree(live/'publish-repo',backup/'publish-repo')
PY
tar --no-same-owner --unlink-first -xzf "$bundle/corpus-overlay.tar.gz" -C "$live"
python3 - "$bundle" "$live" <<'PY'
import json,sys
from pathlib import Path
bundle,live=map(Path,sys.argv[1:])
for rel in json.loads((bundle/'manifest.json').read_text())['removedFiles']:
    p=live/rel
    if p.is_file() or p.is_symlink():p.unlink()
PY
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
p=Path(sys.argv[1]);assert p==Path('/Users/miki/data/value-rules/controller-corpus-rules-7')
shutil.rmtree(p)
PY
```

Retain the rollback backup and release bundle. If source/archive bindings, deployment identity, any guard, or post-publish checks fail, stop and leave the scheduler paused; do not weaken a guard or resume against stale live state.
