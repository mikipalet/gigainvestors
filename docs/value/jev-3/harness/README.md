# Local controller reproduction

Run from `~/data/value-jev`. Never run the live daily runner or touch its lock.
The source corpus stays read-only; the real CLI talks only to a copied corpus,
a local bare remote and local Blob stubs. No EODHD requests or publication.
Stop and commit if either `/` or `~/data` falls below 4 GiB free.

Use a NEW task directory `/Users/miki/data/jev-3`. Copy all files with
`rsync -aL --exclude=daily-runner.lock --exclude=.daily-runner.lock
~/value-corpus/ ~/data/jev-3/corpus/`. Create `evidence`, `storage`, `tmp`,
`test-home`, `harness-bin`; copy `docs/value/pubfix-2/harness/git` into the latter.
Start `watch-disk.py`; preserve its PID and terminate it with `evidence/done`.
Archive baseline `ab804f26a4ef567e65803a4251c7031da009ef5b` (lib, scripts, data,
package.json, tsconfig.json) into `baseline-code`, with a node_modules symlink.

Set `PUBFIX_ROOT=/Users/miki/data/jev-3` for Python/Node commands below.

1. `bash docs/value/jev-3/harness/run-proofs.sh` audits the copy, prepares the
   local remote, and runs ordinary baseline/candidate `publish --out` paths.
   Seed the candidate output with `baseline` and use `--overwrite`, so it starts
   with the same retained assets as the real publisher.
   In this recorded session setup ran before the copy audit: the sole difference
   was `.git/config`. `verify-copy-config.py` proved the config equals the source
   plus exactly the local-origin/hooks/pack settings; no data mismatch was waived.
2. Run `attribution.ts` using `node --conditions=react-server --import tsx`, then
   `compare.py`. The proposal JSON records only reviewed exact transitions.
3. `bash docs/value/jev-3/harness/real.sh` exercises the REAL `publish` CLI.
   `proposed-approvals.cjs` supplies the existing approvals plus the reviewed
   proposals to the **unchanged invariant** for this local review scenario only.
   It logs that injection in `boundaries.jsonl`. The production approval manifest
   still contains only ALSN/FDJU. FCN requires controller approval before a real
   release; this harness cannot grant it. No force/additions/existing-analysis
   bypass is used.
4. Run `docs/value/jev-2/harness/consistency.ts` and `byte-proof.py` from pubfix-2. The
   complete JSON trees must match, including retained legacy logo assets. No
   valuation or logo artifact is excluded from this equality check.
5. `unit.sh` runs every unit test in a network namespace, with the source corpus
   read-only and an isolated test home. It uses `/tmp` because one existing test
   explicitly requires that prefix. Test quote dates are deterministic and optional
   SEC enrichment is mocked in the normalization test. Typecheck with
   `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
6. Place an existing local WOFF2 at `storage/inter.woff2` (this proof uses Next's
   bundled Geist Latin as a font-response stub, without changing production fonts).
   Run `build.sh` via pubfix-2 `run-isolated.sh`; then run this directory's
   `browser.sh` through the same isolation wrapper. It checks all seven reviewed
   pages against the real published candidate, calls the real `checkTimeTravel` for
   quarter-back and the 2018Q3 deep link, and completes the local receipt.
   `JEV_TIME_TRAVEL_ONLY=1` runs the history/invariant checks separately against
   an already verified local candidate and records `time-travel.json`.
7. `finish-audit.py` verifies the source head and equality of tested/source freeze
   hashes, matching local/bare heads, exit 0 and completed receipt. The controller
   added AERO/CEG/JBS during this session. `source-freeze-drift.json` records that
   change; the copy was updated to 151 freezes, both task-only repositories were
   restored to the initial head/baseline, and comparison, real publish, equality,
   build and browser checks were rerun. No live file was changed by this task.
   Preserve evidence,
   stop the disk watcher, and run `cleanup.py` to delete only this task's corpus,
   bare remote, snapshots, storage, test home and temporary baseline code. Remove
   this worktree's `.next`, never shared node_modules or the source corpus.

Committed text logs have trailing terminal whitespace removed; raw run logs remain
in the task evidence directory. No result content was changed.
