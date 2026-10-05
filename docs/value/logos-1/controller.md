Commands for the controller only — recorded, not executed.

Integrate the reviewed `value-logos` commit into the controller and the 03:00 nightly checkout through the normal code handoff. Pause the controller-managed runner gracefully before installation; do not delete or reap its lock. Keep `~/data/value-logos/bundle` available. Do not install the copied publish snapshot wholesale: only install reviewed logo records/assets, then use ordinary publication so concurrent coverage changes survive.

Verify the committed manifest and perform a read-only preflight (already exercised by this session):

```sh
cd /Users/miki/GitHub/superinvestors-wt/value-logos
cmp docs/value/logos-1/bundle-manifest.json "$HOME/data/value-logos/bundle/manifest.json"
node --import tsx scripts/value/install-logos.ts \
  "$HOME/data/value-logos/bundle" "$HOME/value-corpus"
```

Install through the existing controller lock wrapper, following cover-6's handoff flow. No command here was run by the logo session:

```sh
VALUE_CORPUS_DIR="$HOME/value-corpus" \
  bash scripts/value/with-daily-lock.sh \
  node --import tsx scripts/value/install-logos.ts \
  "$HOME/data/value-logos/bundle" "$HOME/value-corpus" --apply
```

The installer preserves existing non-null live records, validates all asset hashes/decodes, backs up changed null records under `~/value-corpus/backups/logos-<timestamp>/`, and stops below 4 GiB. On a partial failure, inspect the backup directory and output before proceeding; a rerun skips byte-identical records/assets. Preflight counts can change if another job has already approved a logo or merged aliases.

Only after successful installation and code integration, use ordinary publication and post-publication verification, as in cover-6:

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

Ordinary publication includes its normal archive/Blob upload and tagged revalidation; do not add a separate manual revalidation. Check EWBC, the ten search examples and baseline logo hashes after publication. Against the unchanged 3,950-company baseline expect 3,922 logos and the 28 listed monograms. If the separate duplicate-merge job changed membership, reconcile counts by ID using the bundle manifest. Resume the controller-managed nightly on the reviewed integrated code. New unreviewed candidates intentionally remain monograms pending identity approval.
