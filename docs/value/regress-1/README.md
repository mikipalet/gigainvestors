# Nightly source-scale regression proof

The task runs only under `/Users/miki/data/regress`. Harness commands are issued
from its isolated `repo` worktree. The live corpus is mounted read-only in each
network namespace; only loopback is available. `TMPDIR` and the namespace's
`/tmp` point to task storage. No runner or runner-lock wrapper is invoked.

`analyze.ts` invokes the actual analysis stage and accepts Jev answers only when
the cached question version and exact section-text SHA-256 match. Final replay
runs every released and remaining universe ID through the final implementation;
unchanged fingerprints still undergo normalization and source correction before
being skipped. Failed readings are recorded, never replaced by fresh calls.

The source-scale correction distinguishes unit multipliers from XBRL decimal
precision. Thousand/million repairs require the existing same-period baseline
plus corroboration from another annual period or source observation. An
unreconciled share basis is rejected; known ADS/split conversions are applied
before comparison. Reviewed conversions of the same accession are retained.
Zero share observations and zero corrections never replace valid counts.

The balance fix excludes entirely empty vendor placeholders from the set of
statements. A partial actual statement remains partial: missing fields do not
inherit old annual values or become zero.

`publish-out.sh` is ordinary `publish --out`. `publish-real.sh` is ordinary
`publish`, using a local bare remote and the existing Blob/revalidation stub.
Only the copied hold is removed. Approval JSON remains the three owner-approved
transitions; the harness does not approve residual changes. The reviewed held
quotes are staged as a separate local prices commit, as the real price stage
would do, before the real publication test.

Failed attempts are retained in the evidence bundle and distinguished from final
receipts. The final report records the actual acceptance status, residual changes,
source evidence, controller steps, and cleanup results.
