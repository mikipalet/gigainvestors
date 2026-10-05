NOT — no coverage release or Fairfax unfreeze is approved by this audit.

The final `release.json` preserves the current 3,899-company baseline and holds
all 42 requested listings. `provisional-release.json` is rejected evidence,
not an integration manifest. Its 26 prospective additions fail the numeric
sample and the baseline/alias proof. Do not install either manifest into the
nightly corpus as a coverage expansion. Do not run `integrate-coverage.py`, a
daily-lock wrapper, ordinary remote publication, or unfreeze Fairfax for this
handoff.

The code changes are independently reviewable: stale share votes are rejected,
cached share checks are revalidated, and an all-held coverage manifest can
produce an ordinary local baseline proof. A controller can integrate the
reviewed commit through its normal isolated code workflow; no push or code
integration was executed here.

These commands reproduce the review using only the isolated corpus. Run from
the `value-holds` worktree on the reviewed commit. Keep the data volume files:
the complete PDFs, XHTML, quote payloads, extracted sections, and screenshots
are retained there rather than in git.

```sh
cd /Users/miki/GitHub/superinvestors-wt/value-holds
df -BG / "$HOME/data"

VALUE_CORPUS_DIR="$HOME/data/value-holds/test-corpus" \
  NODE_OPTIONS=--max-old-space-size=1536 \
  node_modules/.bin/vitest run

# Use a new, empty output path; this is the ordinary publisher, locally only.
VALUE_CORPUS_DIR="$HOME/data/value-holds/corpus" VALUE_NO_EODHD=1 \
  NODE_OPTIONS=--max-old-space-size=1536 \
  node --conditions=react-server --import tsx scripts/value/cli.ts publish \
  --out "$HOME/data/value-holds/staging/controller-proof"

VALUE_CORPUS_DIR="$HOME/data/value-holds/corpus" VALUE_NO_EODHD=1 \
  VALUE_BASELINE_REPO="$HOME/value-corpus/publish-repo" \
  node --conditions=react-server --import tsx scripts/value/prove-coverage-release.ts \
  "$HOME/data/value-holds/staging/controller-proof" \
  "$HOME/data/value-holds/evidence/controller-proof.json"

# Expected to fail on the retained five numeric discrepancies. Never redraw
# the sample merely to obtain passing companies.
VALUE_CORPUS_DIR="$HOME/data/value-holds/corpus" \
  VALUE_SOURCE_SAMPLE="$HOME/data/value-holds/evidence/source-sample.json" \
  VALUE_SOURCE_BASES="$HOME/data/value-holds/evidence/source-bases.json" \
  VALUE_SOURCE_EVIDENCE_DIR="$HOME/data/value-holds/evidence/second-source" \
  python3 scripts/value/check-held-sources-v2.py
```

The private provisional snapshot can reproduce the failed layout review:

```sh
VALUE_STORE_DIR="$HOME/data/value-holds/staging/provisional" \
  node_modules/.bin/next start --hostname 127.0.0.1 --port 3052

# In a second shell, with the same unmodified gate and viewport thresholds:
QA_VIEWPORTS=1728x970,390x844 VALUE_MIN_FREE_GB=4 \
  node scripts/value/release-gate.mjs http://127.0.0.1:3052 \
  "$HOME/data/value-holds/evidence/controller-layout" \
  '/s/AGO.US,/s/AMPY.US,/s/TOST.US'
```

Release prerequisites: reconcile the failed annual numbers and ADR/split
bases, replay analysis with source provenance, resolve existing-issuer aliases
without displacing baseline identities, recover and validate Lonza/Windrock
current annual inputs, and fix the three retained layout holds. Re-run the
unchanged source sample and browser gate, then an ordinary local publish
against a newly captured live baseline. Any live baseline changes since this
audit require a new manifest/hash capture; this report is not permission to
overwrite them. A subsequent READY review must provide the concrete accepted
IDs and a controller-owned integration/publication procedure.
