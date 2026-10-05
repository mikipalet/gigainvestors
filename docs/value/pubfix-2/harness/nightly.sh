#!/usr/bin/env bash
# Extract only function definitions; never run the real runner's lock preamble.
set -uo pipefail
source <(sed -n '/^check_disk() {/,/^run_analysis() {/p' scripts/value/run-daily.sh | sed '$d')
cycle_date=2026-10-05
retain_analysis=0
# Network acquisition outcomes are controlled, publication remains the real CLI.
node() {
 if [[ "${3:-}" == scripts/value/cli.ts ]]; then
  case "${4:-}" in
   logos) echo 'sandbox: logo acquisition unavailable; cached approved logos retained'; return 1;;
   thesis) echo 'sandbox: thesis budget exhausted; cached thesis retained'; return 75;;
  esac
 elif [[ "${3:-}" == scripts/value/post-publish-cli.ts ]]; then
  PUBFIX_REAL_CLOCK=1 command node --conditions=react-server --import tsx docs/value/pubfix-2/harness/post-check.ts
  return $?
 fi
 command node --conditions=react-server "$@"
}
publish_available
