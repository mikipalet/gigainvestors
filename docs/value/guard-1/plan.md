# Publication coverage guard

Implement the owner's specified guard in the existing publication flow, inline without subagents.

- [x] Reproduce the 13 -> 148 missing-logo regression at the commit gate.
- [x] Add one archive reader/comparator for logos, public valuation, five evaluated quality tests, dossiers, country indexes, market buys, and price history. Default tolerance is max(5, 1%); logo loss is zero tolerance. Exceptions bind exact IDs/metrics to the previous commit with reason/evidence.
- [x] Enforce before commit, push, Blob pointer update, and in rollback-enabled verification. Missing required baseline/receipt is CRITICAL.
- [x] Render a deterministic, country-spread sample of 20 company pages before push; load the same sample in the live browser after publication, including expected loaded logo images.
- [x] Print coverage each nightly cycle, including skipped/failed publication.
- [x] Verify isolated tests and read-only real archive comparison; commit and write requested report. No publication, live lock access, or corpus writes.
