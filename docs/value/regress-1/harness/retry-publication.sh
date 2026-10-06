#!/usr/bin/env bash
set -u
root=/Users/miki/data/regress
while ! test -f "$root/evidence/browser.exit"; do sleep 2; done
for name in publish-out-final publish-real; do
 mv "$root/evidence/$name.log" "$root/evidence/$name-before-canonical-restore.log"
 mv "$root/evidence/$name.exit" "$root/evidence/$name-before-canonical-restore.exit"
done
python3 - <<'PY'
import shutil
from pathlib import Path
p=Path('/Users/miki/data/regress/candidate-final');assert not(p/'.git').exists();shutil.rmtree(p,ignore_errors=True)
PY
bash docs/value/regress-1/harness/run-isolated.sh bash docs/value/regress-1/harness/publish-out.sh
bash docs/value/regress-1/harness/run-isolated.sh bash docs/value/regress-1/harness/publish-real.sh
REGRESS_CANDIDATE="$root/candidate-final" python3 docs/value/regress-1/harness/audit.py > "$root/evidence/candidate-audit.log"
python3 docs/value/regress-1/harness/changed-input-evidence.py > "$root/evidence/changed-input-evidence.log"
python3 docs/value/regress-1/harness/classify-audit.py > "$root/evidence/classification.log"
echo done > "$root/evidence/publication-retry.done"
