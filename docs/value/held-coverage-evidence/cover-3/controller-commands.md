# Controller publication commands (not executed by coverage)

Expected release: **3,860 dossiers = 2,708 unchanged baseline + 1,152 complete additions**. The staged index has **3,853 rows** (3,577 scored, 276 insufficient); dossier and index counts differ because of listing selection. There are **32 buys**. The 139 held IDs and reasons are in `release.json`. The `cover-3-report.md` is authoritative if later verification changes these counts.

The integration branch is `value-cover-nightly`, rooted at fetched `origin/master` (`2697dc5`) and merging `value-cover` (`8132dfb`). Promote the reviewed integration commit through the normal controller process before the next nightly run, and update the nightly checkout `/Users/miki/GitHub/superinvestors-wt/value-daily` to that master commit. Coverage does not push master or move the running runner's checkout.

The current runner holds `~/value-corpus/daily-runner.lock` even while sleeping; the controller must arrange a graceful handoff. Never delete a live owner's lock or launch another runner against the same corpus. `with-daily-lock.sh` waits and uses the runner's same `mkdir`/PID protocol, including verified dead-owner recovery.

Complete the main-corpus merge and full local proof first (the coverage run could not acquire the live runner's lock):

```sh
cd /Users/miki/GitHub/superinvestors-wt/value-cover
VALUE_CORPUS_DIR="$HOME/value-corpus" \
  bash scripts/value/with-daily-lock.sh bash scripts/value/prove-coverage-nightly.sh
```

This installs only accepted additions, preserves baseline inputs and the verdict-freeze file, and runs ordinary `publish --out` from `~/value-corpus`, with no network publication. Require `docs/value/held-coverage-evidence/cover-3/nightly-proof.json` to show 2,708 unchanged baseline dossiers, 1,152 bound additions, 139 held IDs, and zero missing/unexpected IDs or baseline/freeze changes.

After integration proof passes and the controller owns the handoff, the existing publish stage performs the archive commit/push, private Blob upload, and revalidation in that order. No separate manual upload or curl revalidate is needed:

```sh
cd /Users/miki/GitHub/superinvestors-wt/value-cover
VALUE_CORPUS_DIR="$HOME/value-corpus" VALUE_NO_EODHD=1 \
  NODE_OPTIONS=--max-old-space-size=1536 \
  bash scripts/value/with-daily-lock.sh \
  node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/cli.ts publish
```

The CLI reads the existing corpus `.env.local` for the private Blob token and revalidation configuration. The command reads credentials directly; do not echo or copy them into logs/artifacts. The publish stage runs calibration, acquires `publish.lock`, syncs the existing archive, checks completeness/bindings and invariants, creates its normal orphan archive commit, pushes the archive, uploads all snapshot files, switches the private Blob pointer, then revalidates. `VALUE_NO_EODHD=1` uses the already verified cached historical returns and prevents quota spending during this exact release.

Then perform the runner's ordinary post-publish verification under the same daily lock (it can restore the previous publication if verification fails):

```sh
VALUE_CORPUS_DIR="$HOME/value-corpus" \
  bash scripts/value/with-daily-lock.sh \
  node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/post-publish-cli.ts
```

Resume the controller-managed runner at 03:00 UTC on the merged code. Its ordinary `npm run value -- publish` reads `held-membership/latest.json` and `held-membership/release.json` from `~/value-corpus`, so it includes the accepted additions and excludes the held IDs. The release manifest retains the 2,708 baseline dossiers while their captured analysis-file hashes are unchanged. Integration captures those hashes from the main corpus under the nightly lock. A later nightly reanalysis changes the hash and resumes normal publication for that company, while the original 147 `verdict-freeze.json` entries remain independently frozen. Integration never edits that file. The manifest also pins the reviewed release scope (baseline plus accepted additions); supersede its selection during a later reviewed release before publishing further additions.

After a confirmed UTC provider reset and daily-lock handoff, the coverage runner may fetch pending inputs within its 60,000-call ceiling; do not zero the ledger. Re-run selection, binding, integration and browser verification before changing the accepted set. The earlier `--additions-only` command remains local-only and is not the real publication command.

The publication preflight now calibrates the frozen live records for `--existing`, excluding the separate price test from the five quality tests. This fixes the AXP case where a pending pipeline-26 moat failure otherwise blocked publication despite the live verdict freeze. A read-only calibration against the real nightly corpus passed with zero false positives/negatives after the fix; two reference companies remain missing/insufficient under the existing calibration rules.
