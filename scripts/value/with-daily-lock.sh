#!/usr/bin/env bash
# Wait for the runner's mkdir/pid lock without interrupting a live owner.
set -eu
corpus=${VALUE_CORPUS_DIR:-"$HOME/value-corpus"}
lock="$corpus/daily-runner.lock"
while ! mkdir "$lock" 2>/dev/null; do
  df -Pk / | awk 'NR==2 {exit ($4 < 4*1024*1024)}' || { echo 'DISK STOP: commit and stop' >&2; exit 1; }
  owner=$(cat "$lock/pid" 2>/dev/null || true)
  if [[ "$owner" =~ ^[1-9][0-9]*$ ]] && ! kill -0 "$owner" 2>/dev/null && ! ps -p "$owner" >/dev/null 2>&1; then
    # Same dead-owner recovery protocol as run-daily.sh.
    if mkdir "$lock/reaping" 2>/dev/null; then
      if [[ "$(cat "$lock/pid" 2>/dev/null)" == "$owner" ]]; then
        rm -f "$lock/pid"
        rmdir "$lock/reaping" && rmdir "$lock" || exit 1
      else
        rmdir "$lock/reaping"
      fi
    fi
  fi
  sleep 5
done
echo "$$" > "$lock/pid"
export VALUE_DAILY_LOCK_PID=$$
trap 'if [[ "$(cat "$lock/pid" 2>/dev/null)" == "$$" ]]; then rm -f "$lock/pid"; rmdir "$lock"; fi' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
"$@"
