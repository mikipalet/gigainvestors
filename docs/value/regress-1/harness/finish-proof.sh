#!/usr/bin/env bash
set -u
root=/Users/miki/data/regress
for name in unit-final-isolated; do
 mv "$root/evidence/$name.log" "$root/evidence/$name-before-capital-event.log"
 mv "$root/evidence/$name.exit" "$root/evidence/$name-before-capital-event.exit"
done
bash docs/value/regress-1/harness/run-isolated.sh bash docs/value/regress-1/harness/unit.sh || exit 1
replay() {
 local group=$1
 bash docs/value/regress-1/harness/run-isolated.sh env VALUE_ANALYZE_CONCURRENCY=2 REGRESS_RUN="complete-$group" REGRESS_IDS_FILE="$root/evidence/$group-ids.json" node --conditions=react-server --import tsx docs/value/regress-1/harness/analyze.ts > "$root/evidence/analyze-complete-$group.log" 2>&1
 local result=$?
 echo "$result" > "$root/evidence/analyze-complete-$group.exit"
}
replay released &
release_pid=$!
replay remaining &
universe_pid=$!
wait "$release_pid"
for name in publish-out-final publish-real; do
 mv "$root/evidence/$name.log" "$root/evidence/$name-before-final-replay.log"
 mv "$root/evidence/$name.exit" "$root/evidence/$name-before-final-replay.exit"
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
wait "$universe_pid"
echo done > "$root/evidence/proof-sequence.done"
