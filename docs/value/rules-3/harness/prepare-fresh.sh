#!/usr/bin/env bash
set -euo pipefail
root=/Users/miki/data/value-rules/.audit/rules-3
export TMPDIR="$root/tmp"
marker=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/logofix-2.shipped
test -f "$marker"
test -f "$root/evidence/merged-master.json"
test ! -e "$root/corpus"
python3 - <<'PY'
import json, shutil
from pathlib import Path
assert min(shutil.disk_usage(p).free for p in ['/', '/Users/miki/data']) >= 4*1024**3
assert json.loads(Path('scripts/value/approved-verdict-changes.json').read_text()) == []
PY
mkdir -p "$root/corpus" "$root/storage" "$root/harness-bin" "$root/tmp"
cp "$root/tmp/inter.woff2" "$root/storage/inter.woff2"
rsync -aL --exclude='/daily-runner*' --exclude='/publish.hold*' \
  --exclude='/.env*' --exclude='/backups' --exclude='/logs' \
  /Users/miki/value-corpus/ "$root/corpus/"
cp docs/value/pubfix-2/harness/git "$root/harness-bin/git"
chmod +x "$root/harness-bin/git"
# Test-only values. The live env file is never copied or sourced by this task.
cat > "$root/harness.env" <<'ENV'
VALUE_DATA_READ_WRITE_TOKEN=vercel_blob_rw_regress_local
VALUE_REVALIDATE_URL=https://pubfix.invalid/revalidate
VALUE_REVALIDATE_SECRET=local-noop
VALUE_NO_EODHD=1
ENV
python3 docs/value/rules-3/harness/setup.py
