# Fix 5: nightly preservation

Normal `publish --out` now reads the audited quarterly corpus history. Imported quarterly-1 into `~/value-corpus/history-v7/20261001T235959-import-b1f1f0f3bd29` (index written last), and publication prefers quarterly runs over newer annual-only runs. No staged-store postprocessing is required.

Imported live memos into a separate `published-memos` fallback. New research answers win; omitted answers retain the published answer and still pass public consistency validation. No backfill research files were modified.

Verification: `node --import tsx scripts/value/cli.ts publish --out=/Users/miki/value-corpus/staging/fix-5-nightly/store` (repeated with `--overwrite` after the memo fix). `audit-nightly.mjs` compared it with integrate-4/store: all 87 frames exactly equal; both global and western perQuarter summaries exactly equal; 87 quarterly browser view sets present; same 2,708 published dossiers. Memo answer text exactly equal for Toyota, Adobe, Alphabet, Coca-Cola, JPMorgan and Wolters Kluwer. Evidence: `~/value-corpus/staging/fix-5-nightly/comparison.json`. Other companies may have new research answers from the concurrent backfill; this is not a whole-store byte identity claim. Prices/dates and current research are allowed to advance.

62 publication/history unit tests passed. No remote publication, push or deployment was run.

The existing sleeping runner is in the isolated `value-daily` checkout at old ba62d31, which predates memo publication. After this commit it is advanced locally, detached, to this preservation commit so its next CLI invocations use the corrected publisher. The runner remains asleep until 03:00 UTC; no daily cycle is invoked here. The supplied current time was already after the stated 02:30 deadline; this secures the next scheduled cycle.

Confirmed preservation commit: `df131d7`. Runner checkout advancement completed successfully. Later work stopped under the owner’s disk guard; see fix-5-report.md.
