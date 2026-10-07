#!/usr/bin/env bash
set -euo pipefail
# Wait only for the two finite data-replay workers; their complete logs are required.
while ! tail -n 1 research/valuation/outputs/candidate-0.log | rg -q '^DONE ' || ! tail -n 1 research/valuation/outputs/candidate-1.log | rg -q '^DONE '; do
  test ! -e .audit/rules-5/evidence/DISK_STOP
  sleep 5
done
python3 - <<'PY'
from pathlib import Path
import json,hashlib
s=json.loads(Path('research/valuation/evaluation-code-freeze.json').read_text())
assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==h for p,h in s['sources'].items())
PY
python3 research/valuation/evaluate.py > research/valuation/outputs/evaluation.log 2>&1
