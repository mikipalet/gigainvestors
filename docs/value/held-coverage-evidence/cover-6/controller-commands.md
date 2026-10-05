# Controller handoff — commands recorded, not executed

Use only after the cover-6 report says READY. Integrate the reviewed `value-cover4` commit into the controller and 03:00 nightly checkout through the normal code handoff. Pause the controller-managed runner gracefully before the corpus handoff; do not delete or reap its lock. Keep the private coverage corpus and raw files on the data volume: integration retains source symlinks into it.

Run the integration and ordinary local nightly proof under the controller's lock:

```sh
cd /Users/miki/GitHub/superinvestors-wt/value-cover
VALUE_CORPUS_DIR="$HOME/value-corpus" \
  VALUE_COVER_BATCH=cover-6 \
  VALUE_COVER_SNAPSHOT="$HOME/data/value-cover/staging/cover-6-final" \
  bash scripts/value/with-daily-lock.sh bash scripts/value/prove-coverage-nightly.sh
```

Require zero failures in `docs/value/held-coverage-evidence/cover-6/nightly-proof.json`, 3,860 unchanged baseline dossiers, 97 bound additions, 42 holds and 147 unchanged freezes. Backups go to `~/data/value-cover/held-validation/cover-6-integration-backup`; proof output goes to `~/data/value-cover/staging/cover-6-nightly`. These paths are unused by this coverage session. Do not blindly repeat integration after a partial failure: inspect its backup journal first.

Only after the proof succeeds, execute the normal publication and post-publication verification:

```sh
VALUE_CORPUS_DIR="$HOME/value-corpus" VALUE_NO_EODHD=1 \
  NODE_OPTIONS=--max-old-space-size=1536 \
  bash scripts/value/with-daily-lock.sh \
  node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/cli.ts publish

VALUE_CORPUS_DIR="$HOME/value-corpus" \
  bash scripts/value/with-daily-lock.sh \
  node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/post-publish-cli.ts
```

Ordinary publication includes its normal archive/Blob publication and revalidation. Do not add a separate manual revalidation. Resume the controller-managed 03:00 UTC nightly on the reviewed integrated code. No command above was executed by the coverage session.
