#!/bin/sh
set -eu
cd /Users/miki/data/value-rules
export VALUE_NO_EODHD=1 NODE_OPTIONS=--max-old-space-size=192
for i in $(seq 1 50); do
 python3 -c 'import shutil,pathlib; assert all(shutil.disk_usage(p).free>=4*1024**3 for p in ["/",pathlib.Path.home()/"data"]), "DISK STOP"'
 node --conditions=react-server --import tsx research/rules/audit-replay.ts
 count=$(ls research/rules/outputs/audit | wc -l)
 echo "Audit identities: $count"
 [ "$count" -ge 2058 ] && break
done
for i in $(seq 1 50); do
 python3 -c 'import shutil,pathlib; assert all(shutil.disk_usage(p).free>=4*1024**3 for p in ["/",pathlib.Path.home()/"data"]), "DISK STOP"'
 node --conditions=react-server --import tsx research/rules/current-audit.ts
 count=$(ls research/rules/outputs/current | wc -l)
 echo "Current identities: $count"
 [ "$count" -ge 3899 ] && break
done
