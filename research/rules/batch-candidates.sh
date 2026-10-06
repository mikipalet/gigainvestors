#!/bin/sh
set -eu
cd /Users/miki/data/value-rules
export VALUE_NO_EODHD=1 NODE_OPTIONS=--max-old-space-size=192
for i in $(seq 1 50); do
 python3 -c 'import shutil,pathlib; assert all(shutil.disk_usage(p).free>=4*1024**3 for p in ["/",pathlib.Path.home()/"data"]), "DISK STOP"'
 if node --conditions=react-server --import tsx research/rules/candidate-replay.ts; then :; else
  code=$?
  [ "$code" -eq 143 ] || exit "$code"
  echo 'Replay received SIGTERM; resuming completed company checkpoints'
 fi
 count=$(ls research/rules/outputs/candidate | wc -l)
 echo "Candidate identities: $count"
 [ "$count" -ge 2058 ] && break
done
