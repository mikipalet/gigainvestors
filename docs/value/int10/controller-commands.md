# Controller handoff — recorded only; do not execute while report is NOT

The 2026-10-06 nightly did not publish. Its failed calibration must be resolved
by the controller, or the owner must explicitly authorize an unchanged-archive
baseline. This session requested that decision and did not receive it before
handoff. Do not treat a `Waiting` line after `stage=publish status=failed` as a
successful publication. Do not delete, reap, or otherwise manipulate the runner
lock to recover it.

Resume the offline int10 proof after that prerequisite is satisfied. Copy into
`~/data/int10/corpus` using independent files, excluding both runner-lock names;
use the existing pubfix-2 network/mount-isolated harness. The retained scoped
held-company inputs are in `~/data/value-holds/handoff`; their checksummed
manifest is `input-manifest.json`. Do not invoke its old `restore-review.py`
against a changed live baseline: that script correctly rejects baseline drift.

The resumed proof must prepare and validate `~/data/int10/held-install` from
those retained inputs and the new baseline, with the approved 16 additions,
26 remaining holds, current preservation policy, and logos. It must also bind
the understandable refresh and frozen Fairfax repair to that same baseline.
This bundle and `~/data/int10/dry-run` have NOT been prepared in this session.
Reconstruct them during the resumed proof; they are not currently usable
installation inputs. Do not expand the verdict manifest beyond ALSN, FDJU, FCN.
The 27 underlying holds-algorithm changes remain unapproved.

Only after the resumed report is READY, integrate the release commit through
the controller's normal code handoff. Gracefully pause the managed runner using
the controller's existing process. The following concrete install/publication
commands deliberately refuse to run while the report or input bundle is absent:

```bash
set -euo pipefail
cd /Users/miki/GitHub/superinvestors-wt/value-pubfix
report=/Users/miki/GitHub/superinvestors-wt/value/.superpowers/sdd/2026-09-29-value/int10-report.md
test "$(head -n 1 "$report")" = READY
test -f "$HOME/data/int10/held-install/held-membership/release.json"
test -d "$HOME/data/int10/dry-run/prices"

# Install only accepted held additions through the existing cover-6 mechanism.
# Do not blindly repeat after a partial failure: inspect its backup journal.
VALUE_CORPUS_DIR="$HOME/value-corpus" \
VALUE_COVER_CORPUS="$HOME/data/int10/held-install" \
VALUE_COVER_BATCH=cover-10 \
VALUE_COVER_SNAPSHOT="$HOME/data/int10/dry-run" \
  bash scripts/value/with-daily-lock.sh \
  python3 scripts/value/integrate-coverage.py

# Ordinary publication, then its ordinary verification/rollback path.
VALUE_CORPUS_DIR="$HOME/value-corpus" VALUE_NO_EODHD=1 \
NODE_OPTIONS=--max-old-space-size=2048 \
  bash scripts/value/with-daily-lock.sh \
  node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/cli.ts publish

VALUE_CORPUS_DIR="$HOME/value-corpus" VALUE_NO_EODHD=1 \
NODE_OPTIONS=--max-old-space-size=2048 \
  bash scripts/value/with-daily-lock.sh \
  node --env-file=/Users/miki/GitHub/superinvestors-wt/value-daily/.env.local \
  --conditions=react-server --import tsx scripts/value/post-publish-cli.ts
```

The final resumed handoff must supply its proved understandable/Fairfax input
installation step before these publication commands; that step is not claimed
ready here. `integrate-coverage.py` only installs additions, so it cannot stand
in for the separate baseline-input migration. Keep the installed raw-source
bundle on the data volume for as long as the live corpus links into it. Delete
full scratch corpus copies after verification. Ordinary publish already handles
revalidation; do not add a second manual revalidation.

After successful post-publication verification, resume the controller-managed
03:00 nightly on the integrated code. No command above was executed by int10.
