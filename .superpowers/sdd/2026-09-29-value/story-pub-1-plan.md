# Price story on live base

Goal: merge origin/master, prepare an isolated story-only data overlay, verify it locally, and commit without publishing.

Constraints: no subagents, push, deploy, or writes to publish-repo; retain publish.hold; never print keys; stop with a commit below 4 GiB free.

- [x] Fetch master and merge; retain master UI, verdicts, drawers, since and spin-off behavior.
- [x] Test targeted overlay: preserve all fields and memo metadata; only priceStory and accepted literal Q3/Q6 may change; retain live lines on abstention.
- [x] Copy publish-repo excluding .git to /tmp/value-story-store using independent files. Read existing selector outputs; recompute price story from live financial inputs and quotes.
- [x] Independently prove all files and dossier JSON paths against baseline hashes. Preserve all non-dossier files byte for byte. Record copy list and selection counts.
- [x] Full unit suite, typecheck, optimized local build; release gate at four viewports and six named companies' screenshots at two desktop sizes.
- [x] Inspect screenshots, recheck source hashes/hold and disk, write requested report and commit value: price story on live base.
