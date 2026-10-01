# Complete data implementation plan

Scope: owner instructions of 2026-09-30; work locally in the existing isolated worktree, no agents or remote writes. Build only in .next after df confirms >=5 GB. One new local publication directory; no corpus/store copies.

- [x] Record baseline results, near-quality population and buy-zone names; identify Adobe ROIC null serialization.
- [x] Test recorded EODHD/EDINET fixtures; derive missing statement inputs with per-value provenance and complete-statement zero rules.
- [x] Fill residual fields from SEC companyfacts, EDINET CSV XBRL, ESEF XBRL JSON and keyless Yahoo annual series; cache source attempts and provenance, never call EODHD.
- [x] Specify core metrics in numeric tests; retain available supporting failures, omit absent supporting metrics; fix finite return representation and seven-year history threshold.
- [x] Keep undecided companies private, short-history dossiers direct-only with neutral verdict. Remove gap surfaces from drawers and scan public dossiers and rendered pages.
- [x] Analyze in four partitioned processes, calibrate, publish with --out to ~/value-corpus/staging/complete-1, build .next, run flows/design QA and inspect ten former unclear dossiers.
- [x] Write complete-1-report.md with counts, near-quality changes, buy-zone audit, test evidence and limitations; commit the requested message.
