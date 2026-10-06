# Fairfax and held coverage execution plan

Scope: user holds-1 request, 2026-10-05. Execute inline; no subagents.

- [x] Audit Fairfax's dated primary annual/interim shares, equity, earnings and price currency; reproduce the scheduled check and buy flip; retain freeze unless every input and explanation is supported.
- [x] Snapshot live corpus without credentials, locks or live-linked mutable files into ~/data/value-holds/corpus. Preserve hashes of the live archive and freeze.
- [x] Account for every one of the 42 manifest holds, resolve annual reports with explicit issuer/period provenance, acquire missing prices/history, and reanalyse changed inputs in the private corpus.
- [x] Recheck AVBH, AGO, AMPY and TOST in current UI; run unchanged cover-6 browser and R1 binding checks and a seeded independent second-source sample for accepted additions.
- [x] Generate release selection, execute ordinary publish --out, compare all baseline dossiers/index/quotes and freeze bytes with live, and retain exact evidence.
- [x] Run targeted regression tests and project checks for code changes. Write controller-only commands, report READY/NOT at requested path, and commit on value-holds with the requested title.

Constraints: disk checks on / and ~/data; stop and commit below 4 GiB. No publication, push, runner-lock operation, or live corpus changes except existing usage-ledger code. No EODHD before 05:00 UTC; at most 3,000 after. Never print secrets. Large files and all build outputs on data volume.

Outcome: NOT for coverage release. Fairfax stays frozen; 24 current annual reports recovered; 42 holds retained after source, alias and UI failures. See report.md for completed checks and the disclosed initial test-fixture isolation violation.
