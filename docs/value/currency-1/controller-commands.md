# Controller only — do not execute unless currency-1 is READY

Future controller procedure only; none of these commands has been executed. The agent has not pushed code, published data or paused the runner, and no command opens or modifies the runner lock.

Method 3.8.2 changes code and therefore the analyses: vendor statement amounts are checked against the annual filing and against their own series, mislabelled years are relabelled or left out, off-scale newer balance sheets and trailing figures are not used, and the publisher no longer carries a valuation, price result or retained observation forward from mislabelled statements. There is no corpus overlay and no verdict-freeze change (JBS.US stays frozen; see the notes). Publisher and post-publisher read the publish token with `--env-file` and never print it. Any failure leaves the runner paused for inspection.

The live corpus still holds the 3.8.0 nightly analyses and EDINET normalizations (the 3.8.1 release installed only the published repository). The release therefore re-reads the cached EDINET filings for published Japanese companies and re-analyses every published company offline before publishing, exactly as the 3.8.1 steps did. The next 03:00 nightly re-analyses the whole universe with 3.8.2 anyway (the method version is part of every analysis fingerprint).

Run after a nightly has published and while the runner sleeps (between about 10:00 and 03:00 UTC); the steps take about 45 minutes. The agent's proof bound the live archive 63fad7cb (3.8.1, published 2026-10-12 14:37 UTC): 174 Buys become 173 (Western 139 -> 138); TGS.US is removed, nothing is added. `verify --corrected` checks that the published Buy list equals the frozen 2026-10-12 list less the names `corrections.jsonl` removes (NFLX.US, TGS.US); on a later day quotes move and the check can differ (see the note at the end).

```bash
set -euo pipefail
cd ~/data/value-currency
export TMPDIR="$PWD/tmp"
export npm_config_cache="$TMPDIR/npm-cache"
mkdir -p "$TMPDIR"
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/currency-1-report.md
bundle=/Users/miki/data/value-currency-work/release-bundle-currency-1
stage="$PWD/controller-corpus-currency-1"
backup="$PWD/controller-backup-currency-1"
paused="$PWD/controller-runner-paused-currency-1.json"
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
assert m['status']=='READY' and m['method']=='3.8.2'
assert m['corpusOverlay'] is None and m['approvalManifest'] is None
PY
release_commit=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["codeCommit"])' "$bundle/manifest.json")
git merge-base --is-ancestor 6f52793 "$release_commit"   # live code (method 3.8.1) is included
test "$(git rev-parse HEAD)" = "$release_commit"
git diff --exit-code
git diff --cached --exit-code

# Pause the idle scheduler (it must be sleeping between cycles), then push code without force.
python3 docs/value/regress-2/harness/controller-runner.py pause "$paused"
git push origin "$release_commit:refs/heads/master"

# Bind GitHub's Vercel status to this exact release SHA and require production Ready.
python3 docs/value/logofix-2/controller-wait-vercel.py "$release_commit"

# The next 03:00 nightly runs 3.8.2 from this checkout.
git -C "$daily" diff --exit-code
git -C "$daily" diff --cached --exit-code
git -C "$daily" switch --detach "$release_commit"
npm --prefix "$daily" ci --no-audit --no-fund

# Publish 3.8.2 now from an independent staging copy of the live corpus.
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
open(f'{s}/currency-1-published-ids.txt','w').write(','.join(sorted(ids)))
open(f'{s}/currency-1-edinet-ids.txt','w').write(','.join(sorted(ids&edinet)))
print(len(ids),'published',len(ids&edinet),'from EDINET')
PY
check_disk
node --env-file="$HOME/value-corpus/.env.local" --import tsx scripts/value/cli.ts renormalize-edinet \
  --only="$(cat "$stage/currency-1-edinet-ids.txt")"
check_disk
node --env-file="$HOME/value-corpus/.env.local" --import tsx scripts/value/cli.ts analyze \
  --only="$(cat "$stage/currency-1-published-ids.txt")"
check_disk
node --env-file="$HOME/value-corpus/.env.local" --conditions=react-server --import tsx \
  scripts/value/cli.ts publish
check_disk
node --env-file="$HOME/value-corpus/.env.local" --conditions=react-server --import tsx \
  scripts/value/post-publish-cli.ts

# Forward test: the published Buy list is the frozen list less the names corrections.jsonl removes.
node --import tsx scripts/value/forward-test.ts verify --repo="$stage/publish-repo" \
  --snapshot=docs/value/forward-test/2026-10-12-buy-list.json --corrected

# Petrobras now reads in reais, from FY2024 (a neutral dossier: two years in one currency).
python3 - "$stage" <<'PY'
import json,os,sys
s=sys.argv[1]
for f in os.listdir(f'{s}/publish-repo/dossiers'):
    d=json.load(open(f'{s}/publish-repo/dossiers/{f}'))
    if 'PETR3.SA' in d:
        p=d['PETR3.SA']; line=next(l['answer'] for l in p['ownerMemo']['lines'] if l['question']==1)
        assert p['reportingCurrency']=='BRL' and 'BRL 497.5 billion' in line and 'USD' not in line, line
        print('PETR3.SA:',line)
PY

# Install only the published repository into the live corpus (no other corpus file changed).
check_disk
test ! -e "$backup"
mkdir -p "$backup"
cp -a "$live/publish-repo" "$backup/publish-repo"
rsync -a --delete "$stage/publish-repo/" "$live/publish-repo/"
test "$(git -C "$live/publish-repo" rev-parse HEAD)" = \
     "$(git -C "$stage/publish-repo" rev-parse HEAD)"
test ! -e "$live/publish-repo/.git/value-publish-pending.json"
# Keep the publication's verdict-change attribution, outlier and retention logs with the live corpus.
cp "$stage/staging/verdict-changes.json" "$live/staging/verdict-changes-3.8.2-release.json"
cp "$stage/staging/value-outliers.json" "$live/staging/value-outliers-3.8.2-release.json"
cp "$stage/staging/retained-published-numbers.json" "$live/staging/retained-published-numbers-3.8.2-release.json"
# Score once now: the frozen basket and the corrected basket (appends to forward-test/scores.jsonl only).
VALUE_CORPUS_DIR="$live" node --import tsx scripts/value/forward-test.ts score || :

cd ~/data/value-currency
python3 docs/value/regress-2/harness/controller-runner.py resume "$paused"
python3 - "$stage" <<'PY'
import shutil,sys
from pathlib import Path
p=Path(sys.argv[1]);assert p==Path('/Users/miki/data/value-currency/controller-corpus-currency-1')
shutil.rmtree(p)
PY
```

Notes:

- **Why analyses are re-run here.** 3.8.2 decides which years and balance sheets an analysis may use. Those live in the analyses, so publishing the current analyses with 3.8.2 code would leave Petrobras, ZKH, TGS and the others unchanged. The release re-analyses every published company offline (`VALUE_NO_EODHD=1`; cached filings, readings and FX observations; about 20 minutes). Nothing is fetched from EODHD.
- **If `verify --corrected` fails** because the controller ran on a later day (quotes moved), the publication is still valid. Do not edit `2026-10-12-buy-list.json` or existing lines of `corrections.jsonl`. Record the run's published list with `forward-test.ts freeze --repo="$stage/publish-repo" --out=docs/value/forward-test/$(date -u +%F)-buy-list.json` in a follow-up commit, and continue.
- **JBS.US stays at its 2026-10-08 published bytes.** The corpus verdict freeze (`verdict-freeze.json`, reason: unresolved data discrepancy) keeps the page that reads "USD 471.1 billion"; 3.8.2 corrects the analysis (FY2025 reais dropped, FY2024 USD 77.2bn latest), but the corrected record is undecided (management unclear), and lifting the freeze removes JBS from the site (the publish guard "previously published members would disappear" stops the run). That is an owner decision; this release does not change the freeze.
- **Rollback:** pause the runner, `rsync -a --delete "$backup/publish-repo/" "$live/publish-repo/"`, then republish the previous archive with `scripts/value/cli.ts publish --existing-analysis` from a checkout of 6f52793, and switch `value-daily` back to 6f52793.
