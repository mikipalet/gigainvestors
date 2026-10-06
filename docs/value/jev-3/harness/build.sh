#!/usr/bin/env bash
set -euo pipefail
export PUBFIX_REAL_CLOCK=1
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=4096"
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/docs/value/pubfix-2/harness/fonts.cjs"
node node_modules/next/dist/bin/next build --webpack
