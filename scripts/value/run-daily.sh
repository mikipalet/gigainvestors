#!/usr/bin/env bash
# nohup bash scripts/value/run-daily.sh > ~/value-daily.log 2>&1 &
# First run is at the NEXT 00:05 UTC. --once runs one cycle immediately.
set -u
cd "$(dirname "$0")/../.." || exit 1
# Match the CLI's dotenv/default corpus resolution without sourcing secrets as shell.
VALUE_CORPUS_DIR=$(node -e 'require("dotenv").config({path:".env.local",quiet:true}); console.log(process.env.VALUE_CORPUS_DIR ?? require("path").join(require("os").homedir(),"value-corpus"))') || exit 1
export VALUE_CORPUS_DIR
mkdir -p "$VALUE_CORPUS_DIR/logs" || exit 1
lock="$VALUE_CORPUS_DIR/daily-runner.lock"
if ! mkdir "$lock" 2>/dev/null; then
  echo "Daily runner lock exists: $lock (check its pid before removing a stale lock)" >&2
  exit 1
fi
echo "$$" > "$lock/pid"
trap 'rm -f "$lock/pid"; rmdir "$lock"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
run_stage() {
  local stage="$1" code
  echo "$(date -u +%FT%TZ) starting $stage"
  node --import tsx scripts/value/cli.ts "$stage" >> "$VALUE_CORPUS_DIR/logs/$cycle_date-$stage.log" 2>&1
  code=$?
  echo "$(date -u +%FT%TZ) $stage exit=$code" | tee -a "$VALUE_CORPUS_DIR/logs/$cycle_date-$stage.log"
  return "$code"
}
wait_until_next_run() {
  local delay
  delay=$(node -e 'const now=new Date(); const next=new Date(now); next.setUTCHours(0,5,0,0); if(next<=now) next.setUTCDate(next.getUTCDate()+1); console.log(Math.ceil((next-now)/1000));')
  echo "Waiting $delay seconds until next 00:05 UTC"
  sleep "$delay"
}
if [[ "${1:-}" != "--once" && -n "${1:-}" ]]; then echo 'Usage: run-daily.sh [--once]' >&2; exit 1; fi
if [[ "${1:-}" != "--once" ]]; then wait_until_next_run; fi
while true; do
  cycle_date=$(date -u +%F)
  run_stage prices || :
  run_stage price-history || :
  run_stage fundamentals || :
  run_stage renormalize || :
  run_stage dedupe || :
  run_stage price-seed || :
  run_stage reports || :
  if run_stage analyze; then
    run_stage publish || :
  else
    echo 'publish skipped: analyze failed' | tee -a "$VALUE_CORPUS_DIR/logs/$cycle_date-publish.log"
  fi
  run_stage status || :
  if [[ "${1:-}" == "--once" ]]; then break; fi
  wait_until_next_run
done
