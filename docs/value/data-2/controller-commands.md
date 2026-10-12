# Controller only — do not execute unless data-2 is READY

Future controller procedure only; none of these commands has been executed. The agent has not pushed code, published data or paused the runner, and no command opens or modifies the runner lock.

Method 3.8.3 changes code and therefore the analyses (hyperinflation measure, statement blanking, 20-F statements for Petrobras/YPF/JBS, label-flip ordering, the minority profit split) and the publication (a failed test Buy requires decides a company; no vendor balance-sheet refresh of 20-F or US-dollar measured valuations; the currency-scale check at publication). It installs one corpus file: the new `verdict-freeze.json` from the bundle, which lifts the JBS.US freeze, and only after the JBS analysis checks below pass. Publisher and post-publisher read the publish token with `--env-file` and never print it. Any failure leaves the runner paused for inspection.

Run after a nightly has published and while the runner sleeps (between about 10:00 and 03:00 UTC); the steps take about 60 minutes. The agent's proof bound the live archive 578f0974 (3.8.2, published 2026-10-12 18:52 UTC): Buys stay 173 (Western 138), none added or removed; `verify --corrected` checks the published Buy list equals the frozen 2026-10-12 list less the names `corrections.jsonl` removes (NFLX.US, TGS.US). On a later day quotes move and the check can differ (see the notes).

```bash
set -euo pipefail
cd ~/data/value-data2
export TMPDIR="$PWD/tmp"
export npm_config_cache="$TMPDIR/npm-cache"
mkdir -p "$TMPDIR"
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/data-2-report.md
bundle=/Users/miki/data/value-data2-work/release-bundle-data-2
stage="$PWD/controller-corpus-data-2"
backup="$PWD/controller-backup-data-2"
paused="$PWD/controller-runner-paused-data-2.json"
live="$HOME/value-corpus"
daily=/Users/miki/GitHub/superinvestors-wt/value-daily
check_disk() {
  python3 -c 'import pathlib,shutil; assert min(shutil.disk_usage(p).free for p in ["/",pathlib.Path.home()/"data"]) >= 4*1024**3, "DISK STOP"'
}
check_disk
test "$(head -n 1 "$report")" = READY
python3 - "$bundle" "$live" <<'PY'
import hashlib,json,sys
from pathlib import Path
b,live=Path(sys.argv[1]),Path(sys.argv[2]);m=json.loads((b/'manifest.json').read_text())
assert m['status']=='READY' and m['method']=='3.8.3' and m['approvalManifest'] is None
assert m['corpusOverlay']=={'verdict-freeze.json':m['corpusOverlayFiles']['verdict-freeze.json']}
# The freeze being replaced is still the one the proof read.
assert hashlib.sha256((live/'verdict-freeze.json').read_bytes()).hexdigest()==m['verdictFreeze']['liveSha256'],'live verdict-freeze.json changed since the proof'
assert hashlib.sha256((b/'verdict-freeze.json').read_bytes()).hexdigest()==m['verdictFreeze']['newSha256']
PY
release_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["codeCommit"])' "$bundle/manifest.json")
git merge-base --is-ancestor 065d957 "$release_commit"   # live code (method 3.8.2) is included
test "$(git rev-parse HEAD)" = "$release_commit"
git diff --exit-code
git diff --cached --exit-code

# Pause the idle scheduler (it must be sleeping between cycles), then push code without force.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"
git push origin "$release_commit:refs/heads/master"

# Production Ready for exactly this SHA: GitHub's Vercel status, or (when that status never
# posts, as at 18:22 UTC on 2026-10-12) the production deployment `vercel ls -m githubCommitSha=` lists.
python3 docs/value/data-2/controller-wait-vercel.py "$release_commit"

# The next 03:00 nightly runs 3.8.3 from this checkout.
git -C "$daily" diff --exit-code
git -C "$daily" diff --cached --exit-code
git -C "$daily" fetch --quiet origin
git -C "$daily" switch --detach "$release_commit"
npm --prefix "$daily" ci --no-audit --no-fund

# Publish 3.8.3 now from an independent staging copy of the live corpus.
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
python3 - "$stage" <<'PY'
import json,os,sys
s=sys.argv[1];ids=set()
for f in os.listdir(f'{s}/publish-repo/index'):
    if f!='default.json': ids|={r['id'] for r in json.load(open(f'{s}/publish-repo/index/{f}'))}
edinet={json.loads(l)['id'] for l in open(f'{s}/universe.jsonl') if json.loads(l).get('source')=='edinet'}
open(f'{s}/data-2-published-ids.txt','w').write(','.join(sorted(ids)))
open(f'{s}/data-2-edinet-ids.txt','w').write(','.join(sorted(ids&edinet)))
print(len(ids),'published',len(ids&edinet),'from EDINET')
PY
check_disk
node --env-file="$HOME/value-corpus/.env.local" --import tsx scripts/value/cli.ts renormalize-edinet \
  --only="$(cat "$stage/data-2-edinet-ids.txt")"
check_disk
# No --force: the 3.8.3 method version already changes every analysis fingerprint, and --force
# would re-request filing evidence that cached readings already hold. A company whose new
# history needs fresh filing readings (BAP, IFS, DDL, STN in the proof) keeps its released
# record until the nightly reads them; the stage succeeds while such failures stay under 2%.
node --env-file="$HOME/value-corpus/.env.local" --import tsx scripts/value/cli.ts analyze \
  --only="$(cat "$stage/data-2-published-ids.txt")"

# JBS.US: its corrected record is the 20-F (US dollars, FY2023-FY2025, a findable three-year
# dossier). Only then install the new freeze that lifts its 2026-10-08 hold.
python3 - "$stage" "$bundle" <<'PY'
import json,shutil,sys
from pathlib import Path
s,b=Path(sys.argv[1]),Path(sys.argv[2])
a=json.loads((s/'analysis/JBS.US.json').read_text())
memo=next(l['answer'] for l in a['ownerMemo']['lines'] if l['question']==1)
assert a['reportingCurrency']=='USD' and a['historyCoverage']['first']==2023 and a['historyCoverage']['years']>=3, a['historyCoverage']
assert a['report']['kind']=='20-F' and a['report']['url'].startswith('https://www.sec.gov/Archives/edgar/data/1791942/'), a['report']
assert 'USD 86.2 billion' in memo and '471.1' not in memo, memo
years=json.loads((s/'analysis/inputs/JBS.US.json').read_text())['memoYears']
assert years and all(any(w.startswith('Annual statements from the USD 20-F XBRL') for w in y.get('sourceWarnings',[])) for y in years), 'JBS statements are not from its 20-F'
shutil.copyfile(b/'verdict-freeze.json',s/'verdict-freeze.json')
print('JBS.US record complete:',memo)
PY
check_disk
node --env-file="$HOME/value-corpus/.env.local" --conditions=react-server --import tsx \
  scripts/value/cli.ts publish
check_disk
node --env-file="$HOME/value-corpus/.env.local" --conditions=react-server --import tsx \
  scripts/value/post-publish-cli.ts

# Forward test: the published Buy list is the frozen list less the names corrections.jsonl removes.
node --import tsx scripts/value/forward-test.ts verify --repo="$stage/publish-repo" \
  --snapshot=docs/value/forward-test/2026-10-12-buy-list.json --corrected

# Petrobras from its 20-F (USD sales, 12.9bn shares of both classes); JBS in US dollars; TGS measured in US dollars.
python3 - "$stage" <<'PY'
import json,os,sys
s=sys.argv[1];seen=set()
for f in os.listdir(f'{s}/publish-repo/dossiers'):
    d=json.load(open(f'{s}/publish-repo/dossiers/{f}'))
    for i,p in d.items():
        if i not in ('PETR3.SA','JBS.US','TGS.US'): continue
        line=next(l['answer'] for l in p['ownerMemo']['lines'] if l['question']==1);seen.add(i)
        if i=='PETR3.SA': assert p['reportingCurrency']=='USD' and 'USD 89.2 billion' in line and p['valuation']['shares']>1.2e10, line
        if i=='JBS.US': assert 'USD 86.2 billion' in line, line
        if i=='TGS.US': assert p.get('measure',{}).get('currency')=='USD', p.get('measure')
        print(i,':',line)
assert seen=={'PETR3.SA','JBS.US','TGS.US'}, seen
PY

# Install the published repository and the new verdict freeze into the live corpus.
check_disk
test ! -e "$backup"
mkdir -p "$backup"
cp -a "$live/publish-repo" "$backup/publish-repo"
cp -a "$live/verdict-freeze.json" "$backup/verdict-freeze.json"
rsync -a --delete "$stage/publish-repo/" "$live/publish-repo/"
cp "$stage/verdict-freeze.json" "$live/verdict-freeze.json"
test "$(git -C "$live/publish-repo" rev-parse HEAD)" = \
     "$(git -C "$stage/publish-repo" rev-parse HEAD)"
test ! -e "$live/publish-repo/.git/value-publish-pending.json"
cp "$stage/staging/verdict-changes.json" "$live/staging/verdict-changes-3.8.3-release.json"
cp "$stage/staging/value-outliers.json" "$live/staging/value-outliers-3.8.3-release.json"
cp "$stage/staging/retained-published-numbers.json" "$live/staging/retained-published-numbers-3.8.3-release.json"
# Score once now: the frozen basket and the corrected basket (appends to forward-test/scores.jsonl only).
VALUE_CORPUS_DIR="$live" node --import tsx scripts/value/forward-test.ts score || :

cd ~/data/value-data2
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"
python3 - "$stage" <<'PY'
import shutil,sys
from pathlib import Path
p=Path(sys.argv[1]);assert p==Path('/Users/miki/data/value-data2/controller-corpus-data-2')
shutil.rmtree(p)
PY
```

Notes:

- **Why analyses are re-run here.** The fixes live in the analyses, so publishing the current analyses with 3.8.3 code would leave TGS, Petrobras, PDD and the others unchanged. Nothing is fetched from EODHD (`VALUE_NO_EODHD=1`; cached filings, readings and FX observations).
- **Banks and Stantec.** Credicorp (BAP), Intercorp (IFS), Dingdong (DDL) and Stantec (STN) regain their full history in 3.8.3, which makes them analysable for the first time: that needs filing readings that are not cached. Offline (this release) they fail closed and keep their released record; the 03:00 nightly, which has the reading service, analyses them.
- **Price history (item 7)** changes only the nightly price-history stage; this release does not refresh price histories. The 03:00 nightly is the first run on the new guard.
- **If `verify --corrected` fails** because the controller ran on a later day (quotes moved), the publication is still valid. Do not edit `2026-10-12-buy-list.json` or existing lines of `corrections.jsonl`. Record the run's published list with `forward-test.ts freeze --repo="$stage/publish-repo" --out=docs/value/forward-test/$(date -u +%F)-buy-list.json` in a follow-up commit, and continue.
- **If the JBS check fails** (its analysis is not the 20-F record), stop before publishing: the old freeze stays in the staging copy, so JBS keeps its 2026-10-08 bytes; report the assertion.
- **Rollback:** pause the runner, `rsync -a --delete "$backup/publish-repo/" "$live/publish-repo/"`, `cp "$backup/verdict-freeze.json" "$live/verdict-freeze.json"`, then republish the previous archive with `scripts/value/cli.ts publish --existing-analysis` from a checkout of 065d957, and switch `value-daily` back to 065d957.
