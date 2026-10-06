#!/usr/bin/env bash
set -euo pipefail
# Bind prerendered metadata to the same ordinary candidate used by the browser.
export VALUE_STORE_DIR=/Users/miki/data/regress/run2/candidate-final
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/docs/value/pubfix-2/harness/fonts.cjs"
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
node node_modules/next/dist/bin/next build --webpack
