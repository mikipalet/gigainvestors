#!/bin/sh
set -eu
cd /Users/miki/data/value-rules
git archive 78141da scripts | tar -x -C .audit/rules/baseline
[ -e .audit/rules/baseline/data ] || ln -s "$PWD/data" .audit/rules/baseline/data
# Identical presentation prerequisite in both arms; numeric engines stay frozen.
cp scripts/value/retain-published-history.ts .audit/rules/baseline/scripts/value/retain-published-history.ts
