#!/usr/bin/env bash
# Reproduce the original-source arm, not the edited UI pointed at old data.
set -euo pipefail
repo="$PWD"
root="$repo/.audit/rules-5"
base="$root/baseline-code"
test ! -e "$base"
mkdir -p "$base"
git archive 800a816 app components config data emails lib public scripts tests \
 package.json package-lock.json tsconfig.json next-env.d.ts next.config.ts \
 postcss.config.mjs proxy.ts vercel.json vitest.config.ts \
 research/rules/baseline-understandable.ts research/understandable/baseline.ts | tar -xf - -C "$base"
ln -s "$repo/node_modules" "$base/node_modules"
mkdir -p "$base/docs/value/rules-5/harness"
cp docs/value/rules-5/harness/browser-semantics.ts "$base/docs/value/rules-5/harness/browser-semantics.ts"
# Invoke only inside run-isolated.sh; the fixed font file is prepared by setup.
set +e
bash docs/value/rules-5/harness/run-isolated.sh bash -c '
 cd "$1"
 export VALUE_STORE_DIR="$PUBFIX_ROOT/baseline"
 export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$2/docs/value/pubfix-2/harness/fonts.cjs"
 export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=3072"
 node node_modules/next/dist/bin/next build --webpack
' -- "$base" "$repo" > "$root/evidence/build-baseline-final.log" 2>&1
code=$?
echo "$code" > "$root/evidence/build-baseline.exit"
exit "$code"
