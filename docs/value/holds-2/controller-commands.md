Controller review only. No publication or LIVE integration is authorized by these commands.

Review `release.json` (16 additions, 26 holds), `share-impact.md` (27 required verdict approvals), `share-impact.json` (all 237 changed calculations), and `fairfax-reanalysis.json`. The nine effective LIVE valuation-confidence changes also need an explicit disposition. Fairfax remains frozen in the accepted batch; its separate proposal changes only its baseline dossier and preserves its current false Buy flag.

The scratch corpus is removed at handoff. The original reports, raw price/source proofs, screenshots, scoped input patch and local output are retained in `~/data/value-holds`. Restore and replay only in this isolated worktree. The restore script checks the captured LIVE archive/freeze and stops on drift; it never reads or writes the runner lock. Budget at least 55 GB of free data space for a copy, and retain the 4 GB floor throughout.

```sh
cd /Users/miki/GitHub/superinvestors-wt/value-holds
df -h / "$HOME/data"
python3 docs/value/holds-2/restore-review.py

VALUE_CORPUS_DIR="$HOME/data/value-holds/corpus" VALUE_NO_EODHD=1 \
  VALUE_SOURCE_SAMPLE=docs/value/holds-2/source-sample.json \
  VALUE_SOURCE_BASES=docs/value/holds-2/source-bases.json \
  VALUE_SOURCE_EVIDENCE_DIR="$HOME/data/value-holds/evidence/holds-2/second-source" \
  python3 scripts/value/check-held-sources-v2.py

VALUE_CORPUS_DIR="$HOME/data/value-holds/corpus" VALUE_NO_EODHD=1 \
  NODE_OPTIONS=--max-old-space-size=1536 \
  node --conditions=react-server --import tsx scripts/value/cli.ts publish \
  --out "$HOME/data/value-holds/staging/controller-holds-2"

VALUE_CORPUS_DIR="$HOME/data/value-holds/corpus" VALUE_NO_EODHD=1 \
  VALUE_BASELINE_REPO="$HOME/value-corpus/publish-repo" \
  node --conditions=react-server --import tsx scripts/value/prove-coverage-release.ts \
  "$HOME/data/value-holds/staging/controller-holds-2" \
  "$HOME/data/value-holds/evidence/holds-2/controller-proof.json"

# Rebuild after cleanup removed the temporary UI build.
node_modules/.bin/next build --webpack

VALUE_STORE_DIR="$HOME/data/value-holds/staging/controller-holds-2" \
  node_modules/.bin/next start --hostname 127.0.0.1 --port 3055
```

In another terminal, rerun the unchanged browser gate (raw whitespace and exact owner-required compact controls retain the documented cover-6 dispositions):

```sh
QA_VIEWPORTS=1728x970,390x844 VALUE_MIN_FREE_GB=4 \
  node scripts/value/release-gate.mjs http://127.0.0.1:3055 \
  "$HOME/data/value-holds/evidence/holds-2/controller-browser" \
  '/s/CFRUY.US,/s/DVDCF.US,/s/FLMNF.US,/s/FLUIF.US,/s/HEINY.US,/s/HKHHF.US,/s/HKHHY.US,/s/KNCRF.US,/s/MTRBF.US,/s/OGC.US,/s/PEYUF.US,/s/PHJMF.US,/s/PIFYF.US,/s/PUIGF.US,/s/RTLLF.US,/s/ZLDSF.US'
```

The separate Fairfax proposal can be replayed with `python3 docs/value/holds-2/prove-fairfax-unfreeze.py` after changing its output to a new empty local directory. It restores both private policy files in `finally`; it does not unfreeze LIVE. Verify the only baseline dossier change is FRFHF.US. Controller approval must name the repaired inputs, the pending share confidence, and the unchanged actual LIVE Buy flag. Do not approve the old counterfactual Buy as though it were a live recommendation.

Do not apply a bulk unfreeze or override the 26 holds. Subsequent authorized integration belongs to the controller's existing process after a fresh baseline check and explicit disposition of the listed verdict changes. This handoff supplies no push, remote publication, runner-lock or LIVE-write command.
