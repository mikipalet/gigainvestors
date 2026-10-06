#!/bin/sh
set -eu
cd /Users/miki/data/value-rules
export VALUE_NO_EODHD=1 NODE_OPTIONS=--max-old-space-size=192
for i in $(seq 1 40); do
 python3 -c 'import shutil,pathlib; assert all(shutil.disk_usage(p).free>=4*1024**3 for p in ["/",pathlib.Path.home()/"data"]), "DISK STOP"'
 node --conditions=react-server --import tsx research/rules/current-candidates.ts
 count=$(ls research/rules/outputs/current-candidates | wc -l)
 echo "Current candidates: $count"
 [ "$count" -ge 3899 ] && break
done
