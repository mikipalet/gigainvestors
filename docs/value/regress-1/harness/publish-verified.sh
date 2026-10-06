#!/usr/bin/env bash
set -u
root=/Users/miki/data/regress
while test ! -f "$root/evidence/publish-real.exit" || test ! -f "$root/evidence/analyze-release-proof.exit"; do
 test ! -f "$root/evidence/DISK_STOP" || exit 74
 sleep 2
done
for name in publish-out-final publish-real; do
 mv "$root/evidence/$name.log" "$root/evidence/$name-before-continuity.log"
 mv "$root/evidence/$name.exit" "$root/evidence/$name-before-continuity.exit"
done
python3 - <<'PY'
import shutil
from pathlib import Path
p=Path('/Users/miki/data/regress/candidate-final');assert not(p/'.git').exists();shutil.rmtree(p)
PY
bash docs/value/regress-1/harness/run-isolated.sh bash docs/value/regress-1/harness/publish-out.sh
bash docs/value/regress-1/harness/run-isolated.sh bash docs/value/regress-1/harness/publish-real.sh
if test -f "$root/candidate-final/meta.json"; then
 REGRESS_CANDIDATE="$root/candidate-final" python3 docs/value/regress-1/harness/audit.py > "$root/evidence/candidate-audit.log"
 python3 docs/value/regress-1/harness/changed-input-evidence.py > "$root/evidence/changed-input-evidence.log"
 bash docs/value/regress-1/harness/run-isolated.sh bash docs/value/regress-1/harness/browser.sh
fi
