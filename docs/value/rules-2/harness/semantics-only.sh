#!/usr/bin/env bash
set -u
root=/Users/miki/data/value-rules/.audit/rules-2
arm="$1"
case "$arm" in
 candidate) export VALUE_STORE_DIR="$root/candidate-final"; port=3192 ;;
 live) export VALUE_STORE_DIR="$root/baseline"; port=3193 ;;
 *) exit 2 ;;
esac
test "$(cat "$root/evidence/build-candidate.exit")" = 0 || exit 1
python3 docs/value/rules-2/harness/clear-browser-pages.py || exit 1
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port "$port" > "$root/evidence/server-semantics-$arm.log" 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for ((i=0;i<60;i++)); do
 if curl --silent --fail "http://127.0.0.1:$port/value" -o /dev/null; then break; fi
 sleep 1
done
node --conditions=react-server --import tsx docs/value/rules-2/harness/browser-semantics.ts "$arm" > "$root/evidence/semantics-$arm.log" 2>&1
code=$?
echo "$code" > "$root/evidence/semantics-$arm.exit"
exit "$code"
