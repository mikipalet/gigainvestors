#!/usr/bin/env bash
set -euo pipefail
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/docs/value/pubfix-2/harness/fonts.cjs"
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
node node_modules/next/dist/bin/next build --webpack
