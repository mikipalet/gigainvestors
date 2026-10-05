# Cover-4 controller commands

Run only after `cover-4-report.md` says READY and the controller has integrated
its reviewed commit into the nightly checkout. Coverage preparation never runs
these commands and never acquires or changes the live runner lock.

The controller must arrange the normal graceful runner handoff. The runner owns
its lock while sleeping; do not delete the lock or start a competing publisher.

```sh
cd /Users/miki/GitHub/superinvestors-wt/value-cover
VALUE_CORPUS_DIR="$HOME/value-corpus" \
  VALUE_COVER_BATCH=cover-4 \
  VALUE_COVER_SNAPSHOT="$HOME/data/value-cover/staging/cover-4-final" \
  bash scripts/value/with-daily-lock.sh bash scripts/value/prove-coverage-nightly.sh
```

Require zero changes/failures in
`docs/value/held-coverage-evidence/cover-4/nightly-proof.json`. This command
installs only accepted inputs and quotes, preserves baseline inputs and verdict
freezes, and runs an ordinary cache-only local publish in the integrated corpus.
Its output is `~/data/value-cover/staging/cover-4-nightly`; its backups and journal
are in `~/data/value-cover/held-validation/cover-4-integration-backup`.

After that proof succeeds, run the normal publication and verification stages:

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

The first publication command performs the normal archive commit/push, Blob
publication and revalidation. Do not add a separate manual upload or revalidation.
Update the nightly checkout to the controller-integrated commit before resuming
its ordinary 03:00 UTC runner.
