#!/usr/bin/env bash
set -euo pipefail
# Bind prerendered metadata to the same ordinary candidate used by the browser.
export VALUE_STORE_DIR="${VALUE_BUILD_STORE:-/Users/miki/data/value-outlier-work/audit/candidate-final}"
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/docs/value/pubfix-2/harness/fonts.cjs"
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
rm -rf .next  # an incremental webpack cache fails hashing here; always build clean
node node_modules/next/dist/bin/next build --webpack
