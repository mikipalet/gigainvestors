#!/bin/sh
set -eu
cd /Users/miki/data/value-rules
export VALUE_CORPUS_DIR="$PWD/.audit/rules/corpus" VALUE_NO_EODHD=1 NODE_OPTIONS=--max-old-space-size=256
for i in $(seq 1 40); do
 output=$(node --conditions=react-server --import tsx research/rules/stage.ts "$1")
 echo "$output"
 [ "$output" = "$1 staged 0" ] && break
done
