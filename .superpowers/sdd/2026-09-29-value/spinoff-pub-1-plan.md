# Targeted spin-off publication plan

Goal: prepare a local, auditable overlay on live data; commit merged code and evidence without publication.

Constraints: no subagents, push/deploy/publication, writes to live store, or key output. Stop and commit if free disk falls below 4 GiB. Work in this existing isolated worktree. The frozen 77 IDs already include the ten predecessor companies; never invent ten additional IDs.

- [x] Read prior reports; verify disk, worktree and exact master revision.
- [x] Merge origin/master 829adfa without committing, retaining its UI and this branch's predecessor rendering.
- [x] Freeze live bytes into a separate /tmp baseline and copy them into /tmp/value-spinoff-store (no shared writable inodes).
- [x] Add a fail-closed, local targeted-store builder and independent JSON-path/file hash proof. Merge dossier keys, append index/search rows without shifting existing offsets, add a deferred view containing only target IDs, update only aggregate metadata. Preserve history if the verified candidate has no target history. Test that unrelated data and search aliases survive and reject scope violations.
- [x] Run unit suite and production build against the targeted store. Run release gate on master controls and all ten spin-offs, retain failures honestly, resolve cuts/overlaps within scope.
- [x] Capture Pluxee page/drawer at both requested sizes, search, and All companies with a short-history row; inspect screenshots.
- [x] Verify live unchanged and all non-target paths unchanged; write report and exact copy manifest. Commit locally with requested title; copy report to requested shared report location.
