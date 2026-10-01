# Major-index universe implementation plan

Goal: publish only current major-index members, retaining the full analysis corpus and existing home-listing identities.

The owner's brief supplies the design and authorizes inline implementation. No agents, builds, remote publication, or extra staging copies. Stop below 5 GB free.

- [x] Add a dated constituent registry and membership stage, using budget-reserved EODHD fundamentals when possible and parsed Wikipedia tables otherwise. Store source URLs, retrieval dates, matching evidence and all unmatched rows.
- [x] Test ticker/exchange matching, ISIN/ADR aliases, normalized names, ambiguity rejection and membership filtering. Resolve against existing corpus identities without inventing constituent matches.
- [x] Filter publication at its boundary, refresh dossier Company.indexes, and recompute historical aggregates from filtered rows. Preserve full upstream corpus and Western toggle behavior.
- [x] Add compact dossier index labels and Method-only explanation of current-membership survivorship.
- [x] Run focused tests and one local publication with --out; inspect all output surfaces and report regional coverage, quality and every buy-zone company with numbers.
- [x] Commit value: universe = major index members and write the requested report.

Coverage remains blocked: the current sources and corpus cannot meet <1% unmatched for every requested index. The report lists every remaining row and incomplete source; local diagnostic publication is explicitly marked incomplete.
