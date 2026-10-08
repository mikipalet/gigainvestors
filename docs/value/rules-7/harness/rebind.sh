#!/usr/bin/env bash
# Rebind the isolated corpus to the current live corpus after the nightly window.
set -euo pipefail
repo=/Users/miki/data/value-rules
root=$repo/.audit/rules-7
python3 - <<'PY'
import shutil
from pathlib import Path
r=Path('/Users/miki/data/value-rules/.audit/rules-7');s=r/'saved';s.mkdir(exist_ok=True)
# Keep the issuer-correct Orion reading produced from the Korean annual report.
for rel in ['jev/001800.KO.json']:
 shutil.copy2(r/'corpus'/rel,s/rel.replace('/','__'))
for name in ['baseline','candidate-final']:
 if (r/name).exists():shutil.rmtree(r/name)
if (r/'storage/remote.git').exists():shutil.rmtree(r/'storage/remote.git')
PY
set +e
rsync -aL --delete --exclude='/daily-runner*' --exclude='/publish.hold*' --exclude='/.env*' --exclude='/backups' --exclude='/logs' --exclude='*.lock' /Users/miki/value-corpus/ "$root/corpus/" > "$root/evidence/copy.log" 2>&1
code=$?
set -e
if [ "$code" -ne 0 ] && [ "$code" -ne 23 ]; then echo "rsync $code"; exit "$code"; fi
python3 "$repo/docs/value/rules-7/harness/setup.py" > "$root/evidence/setup.log" 2>&1
python3 "$repo/docs/value/rules-7/harness/deduplicate-copy.py" > "$root/evidence/deduplicate.log" 2>&1
(cd "$repo" && node --import tsx docs/value/rules-7/harness/orion-repair.ts)
cp "$root/saved/jev__001800.KO.json" "$root/corpus/jev/001800.KO.json"
echo rebind-ok
