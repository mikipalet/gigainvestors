# Understand-2 local verification

No production publication or push. The application build and full unit results,
plus five fresh Netflix browser contexts per source revision, are in
`../outputs/understand-2/`.

The source-selection timeout was synchronous `du` over the 22 GiB audit tree.
The test now scopes both its corpus and reported working directory to its temp
fixture. The real guard and original five-second test deadline remain intact.

The nightly comparison uses the ordinary `analyze` and `publish --out` CLI stages
at `ab804f2` and the candidate, with the same independent corpus and a fixed
2026-10-06 03:00 UTC clock. The network preload rejects external requests except an explicitly enabled Jev
filing-reading recovery against the single existing API endpoint.
`run-nightly.mjs` covers all 3,899 released IDs, not only the nine expected changes.
New private acquisition is outside this cached-input comparison. An initial
unfiltered attempt hit uncached private filing evidence and was stopped.

The understand-1 copy was sufficient for publishing persisted analyses, but lacked
several inputs consumed by ordinary analyze. Final preparation copies native
SEC companyfacts, SEC annual evidence, reviewed annual corrections, EDINET
issuer facts, ESEF shares, market-cap caches, filing sections and Jev caches from
the local source corpus. Hash manifests record these independent copies. No
answers are synthesized. Missing/stale native Jev caches are refreshed on the copy
using the existing nightly credential, read directly into the child process; its
value is never logged or copied into the scratch corpus. Network receipts and
aggregate input-token usage record these calls. Earlier incomplete-copy
attempts are retained as diagnostic logs and are not the final evidence.

Reproduction requires a fresh independent corpus at `.audit/understandable/corpus`,
a copy of its analysis directory at `.audit/understand-2/original-analysis`, a
master source archive at `.audit/understand-2/master`, and `published-ids.json`
containing every ID in the copied released dossiers. Both archives need the
installed node_modules. Do not reuse a partially mutated copy as an original.

1. Run `copy-nightly-inputs.py`, then `prepare-native-caches.py`.
2. Set `VALUE_CORPUS_DIR` to the copy, `VALUE_NO_EODHD=1`,
   `VALUE_ANALYZE_CONCURRENCY=4`, and
   `NODE_OPTIONS="--max-old-space-size=1024 --require=$PWD/research/understandable/understand-2/offline-clock.cjs"`.
3. Run `node research/understandable/understand-2/run-nightly.mjs master analyze`.
   For missing/stale filing readings, repeat only the recorded failed IDs with
   `UNDERSTAND_ONLY_FILE` pointing to their JSON array, `UNDERSTAND_ALLOW_JEV=1`,
   and `UNDERSTAND_JEV_ENV` pointing to the existing nightly env file. The
   launcher passes only JEV_API_KEY to its child without printing it.
   Record every exit status, then run the same command with `master publish`.
   A local diagnostic export after a failed analysis does not establish that
   the nightly runner can publish it; the failure must be reported.
4. Preserve the complete master analysis directory, then run `candidate analyze`
   and `candidate publish`. Keep every failure; no force or guard bypass is used.
5. Run `compare-analyses.py`. If both exports completed, also run
   `compare-nightly.py` and `check-invariants.mjs`. The latter creates only
   local disposable data repositories so the actual Buy-now invariant compares
   to committed data baselines, both master and released, rather than a code repo.

Check both `/` and `~/data` before each phase; stop and commit below 4 GiB.
Delete the scratch worktree after committing and copying the final report to the
controller's requested report path. The exact original worktree path is also
`~/data/value-understand`, because `~/data` is a symlink to the volume.

The persisted-input invariant recheck is explicitly separate from the nightly
proof: `check-invariants.mjs .audit/understandable/redesigned-store
.audit/understandable/baseline-store persisted-inputs`. It cannot establish a
successful nightly export when that export was rejected by a publisher guard.
