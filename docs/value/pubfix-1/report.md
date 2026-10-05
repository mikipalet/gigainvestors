NOT

Stopped at the requested disk floor before the real-publication proof. The copy watchdog returned `DISK FLOOR: STOP AND COMMIT`; observed data-volume free space was 3,702,080 KiB (3.79 GB). The incomplete compressed corpus copy was unmounted and removed to recover its space. Work remains on branch `value-pubfix`, based on `origin/master` `937355ebcacd1e02775676fa3ff1186f61f2bd33`, under `/Users/miki/data/pubfix/repo`.

Implemented and regression-tested:

- Coverage selection resolves registry-retired listings to their canonical IDs. Binding now runs after issuer reconciliation and requires the retired dossier to be absent, the direct alias to match, and the canonical dossier to be present, complete, and bound to its analysis. It no longer skips binding merely because a prior aliases file exists.
- Retired-listing price moves cannot explain Buy-now flips in surviving dossiers. Existing count/removal guards already recognize direct aliases with present canonical dossiers; regression coverage verifies removal of retired Buy-now rows in both country and default indexes.
- Failed-publication rollback checks exact restoration of the prior git tree rather than rejecting the prior snapshot under newer duplicate-issuer rules. This allows recovery to a pre-dedupe snapshot without accepting a changed rollback tree.

Root cause: real publication resets/fetches the data checkout before rendering. Its committed pre-dedupe baseline lacks the locally installed aliases file used by the successful dry run. The old binding loop therefore required AKBLF.US even though issuer reconciliation retires it in favor of ALK-B.CO.

Verification completed:

- Baseline: 107 tests passed.
- Four original binding regressions failed first with `Coverage analysis-to-publication binding failed: AKBLF.US`, then passed.
- Canonical-only release-scope regression failed first, then passed.
- Buy-now explanation and pre-dedupe rollback regressions failed first, then passed.
- Final targeted suite: 116 tests passed across 3 files (publish, publish-invariants, post-publish).
- `npx tsc --noEmit --incremental false`: exit 0.

Unfinished due to disk stop:

- Full unit suite was started, then stopped at the disk floor; no final full-suite result is claimed. Partial log: `/Users/miki/data/pubfix/evidence/unit-full.log`.
- Full corpus copy was incomplete. No real sandbox publication, local bare-remote push, Blob upload proof, or post-publish proof was run.
- Equality to dry-run output, 3,899 dossiers, 58 aliases, logos, 23 documented drift changes, and FRFHF freeze preservation remain unverified in the full corpus.
- Test-only boundary harness drafts are retained in `docs/value/pubfix-1/harness`; they were not executed end-to-end and are not proof artifacts. A network-isolated namespace was verified available.

No subagents, code pushes, live publication, or live-corpus writes were performed. The daily-runner lock was excluded from copying; no lock operation was performed. Tests used private corpus/temp paths under `/Users/miki/data/pubfix`. The next attempt needs adequate space or an explicitly agreed copy strategy before resuming verification.
