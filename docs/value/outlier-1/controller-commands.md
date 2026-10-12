# Controller only — do not execute unless outlier-1 is READY

Future controller procedure only; none of these commands has been executed. The agent has not pushed code, published data or paused the runner, and no command opens or modifies the runner lock.

Method 3.8.1 changes code and therefore the analyses. There is no corpus overlay and no verdict-freeze change. The release re-reads the cached Japanese annual reports (capital spending and the year-end price used for split detection) and re-analyses every published company offline from cached inputs, then publishes. Only the published repository is installed into the live corpus, exactly as for 3.8.0; the next 03:00 nightly re-analyses the whole universe with 3.8.1 anyway (the method version is part of every analysis fingerprint) and runs `renormalize-edinet` before `analyze`. Publisher and post-publisher read the publish token with `--env-file` and never print it. Any failure leaves the runner paused for inspection.

Run after a nightly has published and while the runner sleeps (between about 10:00 and 03:00 UTC); the steps take about 40 minutes. The agent's proof bound the live archive ebacfc75 (3.8.0, published 2026-10-12 10:44 UTC): 175 Buys become 174 (Western 140 -> 139); NFLX.US is removed, nothing is added. `verify --corrected` checks that the published Buy list equals the frozen 2026-10-12 list less the names `corrections.jsonl` removes; on a later day quotes move and the check can differ (see the note at the end).

```bash
set -euo pipefail
cd ~/data/value-outlier
export TMPDIR="$PWD/tmp"
export npm_config_cache="$TMPDIR/npm-cache"
mkdir -p "$TMPDIR"
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/outlier-1-report.md
bundle=/Users/miki/data/value-outlier-work/release-bundle-outlier-1
stage="$PWD/controller-corpus-outlier-1"
backup="$PWD/controller-backup-outlier-1"
paused="$PWD/controller-runner-paused-outlier-1.json"
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
assert m['status']=='READY' and m['method']=='3.8.1'
assert m['corpusOverlay'] is None and m['approvalManifest'] is None
PY
release_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["codeCommit"])' "$bundle/manifest.json")
git merge-base --is-ancestor 66a2839 "$release_commit"   # live code (method 3.8.0) is included
test "$(git rev-parse HEAD)" = "$release_commit"
git diff --exit-code
git diff --cached --exit-code

# Pause the idle scheduler (it must be sleeping between cycles), then push code without force.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"
git push origin "$release_commit:refs/heads/master"

# Bind GitHub's Vercel status to this exact release SHA and require production Ready.
python3 docs/value/logofix-2/controller-wait-vercel.py "$release_commit"

# The next 03:00 nightly runs 3.8.1 from this checkout.
git -C "$daily" diff --exit-code
git -C "$daily" diff --cached --exit-code
git -C "$daily" switch --detach "$release_commit"
npm --prefix "$daily" ci --no-audit --no-fund

# Publish 3.8.1 now from an independent staging copy of the live corpus.
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
export NODE_OPTIONS=--max-old-space-size=3072
cd "$daily"
# Every published company, and the published companies whose statements come from EDINET.
python3 - "$stage" <<'PY'
import json,os,sys
s=sys.argv[1];ids=set()
for f in os.listdir(f'{s}/publish-repo/index'):
    if f!='default.json': ids|={r['id'] for r in json.load(open(f'{s}/publish-repo/index/{f}'))}
edinet={json.loads(l)['id'] for l in open(f'{s}/universe.jsonl') if json.loads(l).get('source')=='edinet'}
open(f'{s}/outlier-1-published-ids.txt','w').write(','.join(sorted(ids)))
open(f'{s}/outlier-1-edinet-ids.txt','w').write(','.join(sorted(ids&edinet)))
print(len(ids),'published',len(ids&edinet),'from EDINET')
PY
check_disk
node --env-file="$HOME/value-corpus/.env.local" --import tsx scripts/value/cli.ts renormalize-edinet \
  --only="$(cat "$stage/outlier-1-edinet-ids.txt")"
check_disk
node --env-file="$HOME/value-corpus/.env.local" --import tsx scripts/value/cli.ts analyze \
  --only="$(cat "$stage/outlier-1-published-ids.txt")"
check_disk
node --env-file="$HOME/value-corpus/.env.local" --conditions=react-server --import tsx \
  scripts/value/cli.ts publish
check_disk
node --env-file="$HOME/value-corpus/.env.local" --conditions=react-server --import tsx \
  scripts/value/post-publish-cli.ts

# Forward test: the published Buy list is the frozen list less the names corrections.jsonl removes.
node --import tsx scripts/value/forward-test.ts verify --repo="$stage/publish-repo" \
  --snapshot=docs/value/forward-test/2026-10-12-buy-list.json --corrected

# Install only the published repository into the live corpus (no other corpus file changed).
check_disk
test ! -e "$backup"
mkdir -p "$backup"
cp -a "$live/publish-repo" "$backup/publish-repo"
rsync -a --delete "$stage/publish-repo/" "$live/publish-repo/"
test "$(git -C "$live/publish-repo" rev-parse HEAD)" = \
     "$(git -C "$stage/publish-repo" rev-parse HEAD)"
test ! -e "$live/publish-repo/.git/value-publish-pending.json"
# Keep the publication's verdict-change attribution and value-outlier logs with the live corpus.
cp "$stage/staging/verdict-changes.json" "$live/staging/verdict-changes-3.8.1-release.json"
cp "$stage/staging/value-outliers.json" "$live/staging/value-outliers-3.8.1-release.json"
# Score once now: the frozen basket and the corrected basket (appends to forward-test/scores.jsonl only).
VALUE_CORPUS_DIR="$live" node --import tsx scripts/value/forward-test.ts score || :

cd ~/data/value-outlier
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"
python3 - "$stage" <<'PY'
import shutil,sys
from pathlib import Path
p=Path(sys.argv[1]);assert p==Path('/Users/miki/data/value-outlier/controller-corpus-outlier-1')
shutil.rmtree(p)
PY
```

Notes:

- **Why analyses are re-run here.** 3.8.1 changes how owner earnings, cash, balance sheets, Japanese capital spending and Japanese share counts are read. Those live in the analyses, so publishing the 3.8.0 analyses with 3.8.1 code would change only the companies whose valuation the publish step refreshes. The release therefore re-reads the cached EDINET filings for published Japanese companies and re-analyses every published company offline (`VALUE_NO_EODHD=1`; cached readings; about 20 minutes). Nothing is fetched from EODHD.
- **If `verify --corrected` fails** because the controller ran on a later day (quotes moved), the publication is still valid. Do not edit `2026-10-12-buy-list.json` or existing lines of `corrections.jsonl`. Record the run's published list with `forward-test.ts freeze --repo="$stage/publish-repo" --out=docs/value/forward-test/$(date -u +%F)-buy-list.json` in a follow-up commit, and continue.
- **Nightly scoring** keeps scoring the frozen basket unchanged; the same line now carries a `corrected` block when `corrections.jsonl` applies.
- **Rollback:** pause the runner, `rsync -a --delete "$backup/publish-repo/" "$live/publish-repo/"`, then republish the previous archive with `scripts/value/cli.ts publish --existing-analysis` from a checkout of 66a2839, and switch `value-daily` back to 66a2839.
