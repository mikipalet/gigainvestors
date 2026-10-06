# Holds-2 implementation plan

Goal: general annual-source repairs, isolated live share-check impact evidence, Fairfax repair, and controller-reviewable held-company release.

Scope: user's holds-2 request and docs/value/holds-1/report.md. Execute inline; no subagents. Stay on existing value-holds worktree. No publication, push, daily lock operations or live-corpus writes (usage ledger only through existing code). Reuse ~/data/value-holds. Stop and commit below 4 GiB on either volume. Delete scratch copies after evidence capture.

- [x] Trace/reproduce all five numeric failures. Add cache-level regressions in tests/unit/value/annual-source-corrections.test.ts. Fix lib/value/annual-source-corrections.ts so reviewed evidence carries ADR, split and financial-concept metadata and preserves annual weighted diluted basis. Bind imports to retained original report hashes.
- [x] Capture current live archive/freeze/input hashes into evidence. On the existing corpus copy, compare prior and current share reconciliation with identical live inputs, quotes, capitalization and publication logic. Record every changed live valuation/verdict plus effective freezes and controller approval list.
- [x] Complete Fairfax primary financial and effective-common-share reconciliation in private evidence; replay normal analysis and explain valuation and confidence changes. Keep live freeze untouched.
- [x] Reanalyze corrected held inputs. Resolve only provable issuer scope; retain aliases/layout/source/price holds. Draw new Python Random(202610052) sample of eight from candidates before inspecting results; after browser holds shrink scope, final predeclared seed 202610053 from the 16 browser-qualified IDs; retain failures without replacement.
- [x] Run unchanged second-source and cover-6 binding/browser gates on current UI at both viewports, including AGO/AMPY/TOST. Run ordinary publish --out with baseline record/index/quote equality. No bypass flags.
- [x] Full isolated tests/typecheck, report exact limitations and controller commands, verify live archive unchanged, remove scratch copies, commit with requested message and write requested holds-2-report.md (READY only if all release conditions are evidenced).
