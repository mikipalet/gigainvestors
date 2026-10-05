# Run from the isolated value-drift code checkout. No live publication command.
# The corpus was freshly rsynced from ~/value-corpus using --link-dest pointing
# only at dedupe-2's private, dereferenced copy. No inode is shared with live.
# staging, history-return-prices and usage files were detached from hardlinks.
# .env*, *.lock and transient analyze-test-* directories were excluded.
# Raw copy: 54,796,694,390 bytes, 7 transferred files (2,306,077 bytes).
# Inspect copy.log and archive-proof.json for isolation and preservation proof.
export VALUE_CORPUS_DIR="$HOME/data/value-drift-1/corpus"
export VALUE_NO_EODHD=1 VALUE_MIN_FREE_GB=4 NODE_OPTIONS=--max-old-space-size=1536
node --conditions=react-server --import tsx scripts/value/cli.ts publish --out "$HOME/data/value-drift-1/final"
node --conditions=react-server --import tsx docs/value/drift-1/harness/corrections.ts "$HOME/data/value-drift-1/corrections.json"
node --conditions=react-server --import tsx docs/value/drift-1/harness/source-proof.ts "$HOME/data/value-drift-1"
python3 docs/value/drift-1/harness/compare.py "$HOME/data/value-drift-1" docs/value/drift-1 final
python3 docs/value/drift-1/harness/archive-proof.py "$HOME/data/value-drift-1" docs/value/drift-1
# /tmp/value-drift-1-tests is a symlink into ~/data/value-drift-1/tmp, so a test
# that requires a literal /tmp prefix still stores its files on the data volume.
TMPDIR=/tmp/value-drift-1-tests node_modules/.bin/vitest run --maxWorkers=2
node_modules/.bin/tsc --noEmit --incremental false
git diff --check
