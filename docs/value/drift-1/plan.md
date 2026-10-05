# Ordinary publication drift investigation

Goal: classify every changed field for the 97 additions, verify all reviewed corrections, and prove the full 3,957-dossier ordinary publish against the live archive.

Constraints: no subagents, publication, push or runner-lock access; live corpus read-only; artifacts under ~/data; commit and stop below 4 GiB free on either filesystem. Existing isolated branch value-drift starts at freshly fetched origin/master 198412b.

- [x] Read dedupe-2 report, upstream-control and canonical-differences; trace ordinary publication and nightly fallback.
- [x] Identify candidate causes: publication timestamp, new scheduled share checks, quotes and monthly histories.
- [x] Run a fresh ordinary publish on an independent corpus namespace, using private-copy hardlinks only for unchanged inputs and independent mutable outputs.
- [x] Compare every dossier and record every changed path and old/new value; verify attribution with controlled share-check removal and source recomposition.
- [x] Replay all cover-5 source corrections through the normal completion/correction functions and bind saved analysis inputs to reviewed source records.
- [x] If a reviewed input is lost, reproduce with a failing regression test and fix the responsible pipeline path; otherwise make no product change.
- [x] Commit reproducible harnesses, evidence, and report with the requested title; no publication.

Result: all annual corrections survive. A separate raw/split-adjusted history source-switch defect is fixed in the shared reader and fetch path, with seven regression cases. No product behavior outside history selection changed.
