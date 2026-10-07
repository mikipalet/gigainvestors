#!/usr/bin/env bash
set -u
while test ! -f .audit/rules-5/evidence/build-baseline.exit; do sleep 5; done
bash docs/value/rules-5/harness/run-isolated.sh bash docs/value/rules-5/harness/browser-live.sh
