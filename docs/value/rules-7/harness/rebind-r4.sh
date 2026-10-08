#!/usr/bin/env bash
# Bind a fresh isolated copy of the live corpus (3.7.0 archive) and carry the
# rules-7 source repairs forward. Each carried repair replaces a file whose live
# bytes still equal the bytes the repair was made from; anything else stops.
set -euo pipefail
repo=/Users/miki/data/value-rules
root=$repo/.audit/rules-7
rm -rf "$root/corpus" "$root/baseline" "$root/candidate-final" "$root/storage/remote.git"
mkdir -p "$root/corpus" "$root/storage"
git -C /Users/miki/value-corpus/publish-repo rev-parse HEAD > "$root/evidence/live-head-at-rebind.txt"
date -u +%FT%TZ >> "$root/evidence/live-head-at-rebind.txt"
set +e
rsync -aL --delete --exclude='/daily-runner*' --exclude='/publish.hold*' --exclude='/.env*' --exclude='/backups' --exclude='/logs' --exclude='*.lock' /Users/miki/value-corpus/ "$root/corpus/" > "$root/evidence/copy.log" 2>&1
code=$?
set -e
if [ "$code" -ne 0 ] && [ "$code" -ne 23 ]; then echo "rsync $code"; exit "$code"; fi
python3 "$repo/docs/value/rules-7/harness/setup.py" > "$root/evidence/setup.log" 2>&1
python3 "$repo/docs/value/rules-7/harness/deduplicate-copy.py" > "$root/evidence/deduplicate.log" 2>&1
python3 - <<'PY'
import json,hashlib,shutil
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-7');c=r/'corpus'
bound=json.loads((r/'evidence/source-baseline.json').read_text())
before=json.loads((r/'evidence-r3/source-baseline.json').read_text())
m=json.loads(Path('/Users/miki/data/value-rules/release-bundle-rules-7/manifest.json').read_text())
carried=(r/'carry/list.txt').read_text().split()
for rel in carried+m['removedFiles']:
 assert bound.get(rel)==before.get(rel),f'Live source changed since the repair was made: {rel}'
for rel in carried:
 dst=c/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(r/'carry'/rel,dst)
for rel in m['removedFiles']:
 (c/rel).unlink(missing_ok=True)
(r/'evidence/carry.json').write_text(json.dumps({'carried':carried,'removed':m['removedFiles'],'liveUnchangedSinceRepair':True},indent=1)+'\n')
print('carried',len(carried),'removed',len(m['removedFiles']))
PY
echo rebind-ok
