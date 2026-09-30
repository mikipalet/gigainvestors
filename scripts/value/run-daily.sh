#!/usr/bin/env bash
# nohup bash scripts/value/run-daily.sh > ~/value-daily.log 2>&1 &
# First run is at the NEXT 03:00 UTC. --once runs one cycle immediately.
set -u
cd "$(dirname "$0")/../.." || exit 1
# Match the CLI's dotenv/default corpus resolution without sourcing secrets as shell.
VALUE_CORPUS_DIR=$(node -e 'require("dotenv").config({path:".env.local",quiet:true}); console.log(process.env.VALUE_CORPUS_DIR ?? require("path").join(require("os").homedir(),"value-corpus"))') || exit 1
export VALUE_CORPUS_DIR
mkdir -p "$VALUE_CORPUS_DIR/logs" || exit 1
lock="$VALUE_CORPUS_DIR/daily-runner.lock"
if ! mkdir "$lock" 2>/dev/null; then
  owner=$(cat "$lock/pid" 2>/dev/null || true)
  if [[ ! "$owner" =~ ^[1-9][0-9]*$ ]] || kill -0 "$owner" 2>/dev/null || ps -p "$owner" >/dev/null 2>&1; then
    echo "Daily runner lock exists: $lock (owner $owner is live or cannot be verified)" >&2
    exit 1
  fi
  # One reaper at a time; never recursively delete a lock another runner acquired.
  if ! mkdir "$lock/reaping" 2>/dev/null; then
    echo "Daily runner lock is being recovered: $lock" >&2
    exit 1
  fi
  if [[ "$(cat "$lock/pid" 2>/dev/null)" != "$owner" ]]; then
    rmdir "$lock/reaping"
    exit 1
  fi
  rm -f "$lock/pid"
  rmdir "$lock/reaping" && rmdir "$lock" && mkdir "$lock" || exit 1
  echo "Recovered daily runner lock from dead PID $owner"
fi
echo "$$" > "$lock/pid"
trap 'if [[ "$(cat "$lock/pid" 2>/dev/null)" == "$$" ]]; then rm -f "$lock/pid"; rmdir "$lock"; fi' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
run_stage() {
  local stage="$1" code
  shift
  echo "$(date -u +%FT%TZ) starting $stage $*"
  node --import tsx scripts/value/cli.ts "$stage" "$@" >> "$VALUE_CORPUS_DIR/logs/$cycle_date-$stage.log" 2>&1
  code=$?
  echo "$(date -u +%FT%TZ) $stage exit=$code" | tee -a "$VALUE_CORPUS_DIR/logs/$cycle_date-$stage.log"
  return "$code"
}
run_japan() {
  local from
  from=$(node --import tsx scripts/value/daily-japan.ts prepare "$cycle_date") || return 1
  run_stage japan "--from=$from" "--to=$cycle_date" || return $?
  node --import tsx scripts/value/daily-japan.ts complete "$cycle_date"
}
wait_until_next_run() {
  local delay
  delay=$(node -e 'const now=new Date(); const next=new Date(now); next.setUTCHours(3,0,0,0); if(next<=now) next.setUTCDate(next.getUTCDate()+1); console.log(Math.ceil((next-now)/1000));')
  echo "Waiting $delay seconds until next 03:00 UTC"
  sleep "$delay"
}
if [[ "${1:-}" != "--once" && -n "${1:-}" ]]; then echo 'Usage: run-daily.sh [--once]' >&2; exit 1; fi
if [[ "${1:-}" != "--once" ]]; then wait_until_next_run; fi
while true; do
  cycle_date=$(date -u +%F)
  # Import JP issuers before both unfiltered quote stages; paid budget order stays intact.
  run_japan 2>> "$VALUE_CORPUS_DIR/logs/$cycle_date-japan.log" || :
  if ! run_stage wait-eodhd-reset; then
    echo 'remaining cycle skipped: EODHD reset not confirmed' | tee -a "$VALUE_CORPUS_DIR/logs/$cycle_date-wait-eodhd-reset.log"
    run_stage status || :
    if [[ "${1:-}" == "--once" ]]; then exit 1; fi
    wait_until_next_run
    continue
  fi
  run_stage prices || :
  run_stage price-history || :
  run_stage fundamentals || :
  run_stage renormalize || :
  # EDINET reparsing needs the newly fetched Yahoo history for split checks.
  run_stage renormalize-edinet || :
  run_stage dedupe || :
  run_stage price-seed || :
  run_stage reports || :
  if run_stage yields && run_stage analyze; then
    run_stage publish || :
  else
    echo 'publish skipped: yields or analyze failed' | tee -a "$VALUE_CORPUS_DIR/logs/$cycle_date-publish.log"
  fi
  run_stage status || :
  if [[ "${1:-}" == "--once" ]]; then break; fi
  wait_until_next_run
done
