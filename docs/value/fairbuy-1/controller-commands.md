# Controller only — do not execute unless fairbuy-1 is READY

Future controller procedure only; none of these commands has been executed. The agent has not pushed code, published data or paused the runner, and no command opens or modifies the runner lock.

Method 3.8.0 changes code only. There is no corpus overlay and no verdict-freeze change: the reviewed data-error freeze (41 ids) stays as it is and keeps those companies' last published records. Publisher and post-publisher read the publish token with `--env-file` and never print it. Any failure leaves the runner paused for inspection.

Run after a nightly has published and while the runner sleeps (between about 10:00 and 03:00 UTC). If it is run on a later day than 2026-10-12, the `verify` step will show that the published Buy list differs from the committed snapshot; in that case follow the note at the end instead of editing the committed file.

```bash
set -euo pipefail
cd ~/data/value-fairbuy
export TMPDIR="$PWD/tmp"
export npm_config_cache="$TMPDIR/npm-cache"
mkdir -p "$TMPDIR"
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/fairbuy-1-report.md
bundle="$PWD/release-bundle-fairbuy-1"
stage="$PWD/controller-corpus-fairbuy-1"
backup="$PWD/controller-backup-fairbuy-1"
paused="$PWD/controller-runner-paused-fairbuy-1.json"
live="$HOME/value-corpus"
daily=/Users/miki/GitHub/superinvestors-wt/value-daily
check_disk() {
  python3 -c 'import pathlib,shutil; assert min(shutil.disk_usage(p).free for p in ["/",pathlib.Path.home()/"data"]) >= 4*1024**3, "DISK STOP"'
}
check_disk
test "$(head -n 1 "$report")" = READY
python3 - "$bundle" <<'PY'
import json,sys
from pathlib import Path
b=Path(sys.argv[1]);m=json.loads((b/'manifest.json').read_text())
assert m['status']=='READY' and m['method']=='3.8.0'
assert m['corpusOverlay'] is None and m['approvalManifest'] is None
PY
release_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["codeCommit"])' "$bundle/manifest.json")
git merge-base --is-ancestor 94ab355 "$release_commit"   # live code (method 3.7.1, nfix-2) is included
test "$(git rev-parse HEAD)" = "$release_commit"
git diff --exit-code
git diff --cached --exit-code

# Pause the idle scheduler (it must be sleeping between cycles), then push code without force.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"
git push origin "$release_commit:refs/heads/master"

# Bind GitHub's Vercel status to this exact release SHA and require production Ready.
python3 docs/value/logofix-2/controller-wait-vercel.py "$release_commit"

# The next 03:00 nightly runs 3.8.0 from this checkout.
git -C "$daily" diff --exit-code
git -C "$daily" diff --cached --exit-code
git -C "$daily" switch --detach "$release_commit"
npm --prefix "$daily" ci --no-audit --no-fund

# Publish 3.8.0 now from an independent staging copy of the live corpus.
check_disk
test ! -e "$stage"
mkdir -p "$stage"
set +e
rsync -aL --exclude='/daily-runner*' --exclude='/publish.hold*' \
  --exclude='/.env*' --exclude='/backups' --exclude='/logs' --exclude='/fundamentals-history' \
  --exclude='/raw/esef' "$live/" "$stage/"
code=$?
set -e
test "$code" = 0 || test "$code" = 23
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

# Forward test: the frozen list must be exactly what was just published.
node --import tsx scripts/value/forward-test.ts verify --repo="$stage/publish-repo" \
  --snapshot=docs/value/forward-test/2026-10-12-buy-list.json

# Install only the published repository into the live corpus (no other corpus file changed).
check_disk
test ! -e "$backup"
mkdir -p "$backup"
cp -a "$live/publish-repo" "$backup/publish-repo"
rsync -a --delete "$stage/publish-repo/" "$live/publish-repo/"
test "$(git -C "$live/publish-repo" rev-parse HEAD)" = \
     "$(git -C "$stage/publish-repo" rev-parse HEAD)"
test ! -e "$live/publish-repo/.git/value-publish-pending.json"
# Keep the publication's own verdict-change attribution log with the live corpus.
cp "$stage/staging/verdict-changes.json" "$live/staging/verdict-changes-3.8.0-release.json"

cd ~/data/value-fairbuy
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"
python3 - "$stage" <<'PY'
import shutil,sys
from pathlib import Path
p=Path(sys.argv[1]);assert p==Path('/Users/miki/data/value-fairbuy/controller-corpus-fairbuy-1')
shutil.rmtree(p)
PY
```

Notes:

- **Forward-test scoring in the nightly.** `run-daily.sh` gains a non-fatal `score_forward_test` step after publication. The scheduler is a long-running bash process that parsed its loop when it started, so a paused-and-resumed scheduler keeps its old loop: it will run 3.8.0 code for every stage, but the new scoring step starts only when the scheduler is next restarted. Until then the controller can score by hand at any time (read-only apart from appending to `forward-test/scores.jsonl`):
  `cd "$daily" && VALUE_CORPUS_DIR="$HOME/value-corpus" node --import tsx scripts/value/forward-test.ts score`
- **If `verify` fails** (the controller ran on a later day, so quotes moved): the publication itself is still valid. Do not edit `2026-10-12-buy-list.json`. Freeze the list actually published under a new dated name, commit it in a follow-up, and record the reason:
  `node --import tsx scripts/value/forward-test.ts freeze --repo="$stage/publish-repo" --out=docs/value/forward-test/$(date -u +%F)-buy-list.json`
  then delete `2026-10-12-buy-list.json` in that same follow-up commit only if it was never published (it was not, in that case), so exactly one list describes the first publication.
- **Rollback:** pause the runner, `rsync -a --delete "$backup/publish-repo/" "$live/publish-repo/"`, then republish the previous archive with `scripts/value/cli.ts publish --existing-analysis` from a checkout of 94ab355, and switch `value-daily` back to 94ab355.
