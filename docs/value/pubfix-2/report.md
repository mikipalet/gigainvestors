READY

Branch `value-pubfix` merges `origin/master` `d0bf093529872f1cde23dcd46c1d7d21e51c9bea` (plural fix and `docs/` exclusion). Commit title: `value: publication binding understands retired listings`. No code push or live publication occurred.

The full-corpus proof exposed a remaining issue in pubfix-1: a retired addition may resolve to an intentionally preserved baseline canonical. Fourteen canonical targets have different private/released binding metadata, and six lack the private filing cache required for a new addition. Treating those preserved records as fresh additions incorrectly failed ALK-B.CO and ASAI3.SA. Publication now validates the preserved dossier's analysis shape and compares it exactly with a fresh read of the reviewed source record. Newly rendered canonicals still require all current input/completeness and analysis-binding checks. Alias absence, direct routing, canonical presence, and the Buy-now guards remain enforced.

Four new regressions cover unchanged baseline research, explicit freezes, missing private filing inputs for a preserved canonical, and rejection of an invalid preserved dossier. Both rounds were observed failing before correction. Final full unit suite: **236 files passed; 2,303 tests passed, one skipped, zero failures**. The production webpack build, including TypeScript, passed. Evidence stays under `docs/value/pubfix-2`; TypeScript harness imports are relative and `docs/` remains excluded.

The successful standalone invocation ran the REAL `scripts/value/cli.ts publish` path, without `--out`, `--force`, `--existing-analysis`, or `--additions-only`. It performed calibration, reset/fetch, rendering, binding, Buy-now invariants, orphan commit, local git push, Blob upload logic, revalidation, and receipt handling. The existing cache-only mode reused all 2,079 historical-return caches with zero failures. A fixed common publication clock made the independent dry run and real run exactly comparable.

**All 6,249 emitted JSON files (207,282,732 bytes) are byte-identical to the regenerated dry run**, with no missing, extra, or changed files. Snapshot/Blob version: `05febde8674a0aeae568c7f64891044c17f3c01214ae4a2fdf20d738dd4d536d`.

| Acceptance measure | Verified result |
|---|---|
| Dossiers | 3,899; 3,892 indexed, with the seven existing short-history dossiers retained |
| Retirements | 58 removed IDs, each with a direct alias to a present canonical |
| Logo additions | 1,137 approved before retirement: 1,108 surviving dossier additions plus 29 retired listings |
| Documented canonical drift cases | 23: 22 applied, with FRFHF.US suppressed by its explicit freeze |
| Unexplained financial/story changes | Zero; all applied before/after values match the checked-in drift evidence |
| Verdict freezes | All 148 financial records unchanged; freeze file SHA-256 unchanged |
| FRFHF.US | Financial record, verdict and timestamps unchanged; only its previously missing logo was added |
| Binding and Buy-now invariants | Passed against the pre-dedupe committed baseline |

The distinction in the two requested totals is intentional and evidenced: there are not 1,137 surviving logo additions after retiring 29 of those listings, nor 23 applied substantive changes while also freezing FRFHF. `comparison.json`, `dossier-changes.json`, and the existing drift evidence reconcile every case; no data was changed to force a headline count.

The local production build served the candidate through the existing `VALUE_STORE_DIR` seam. The real `verifyPublication` receipt logic called `live-check.ts`'s `checkTimeTravel` against localhost. Both standalone and nightly verification passed Today → 2026 Q3 and the 2018 Q3 deep link, with zero page errors. Both receipts cleared, both local remote heads matched, and the Blob pointer matched the exact snapshot hash.

For the **03:00 publication path**, the copied git checkout and local bare remote were reset to the original pre-dedupe commit before executing the actual `check_disk`, `run_stage`, `check_publication`, and `publish_available` function definitions extracted from `run-daily.sh`. The lock preamble was never executed. Logo acquisition was controlled to exit 1 and thesis acquisition to exit 75, exercising the supported optional-logo and exhausted-budget branches; the actual CLI publish and actual post-publish verification ran and returned success. Nightly output is again byte-identical to the dry run. The full suite also covers successful thesis routing and the intentional refusal on non-budget thesis failure. This proves publication of the current cached corpus, not future provider acquisition results or an entire research cycle.

Isolation used a full dereferenced copy: **779,480 files, 54,803,491,894 bytes**, with no missing files, size/mtime differences, shared live inodes, or symlinks. `publish-repo` included its git history. Its actual origin was a local bare clone; the git wrapper adapted only the hard-coded production-origin identity read and permitted file transport only. Blob SDK operations wrote local files; revalidation was a local no-op. Publication/build/browser runs had only loopback networking, no external routes, and a read-only mount of the live corpus. Environment loading was disabled in the harness. Cached Inter fonts kept the production build offline.

The first real attempt was interrupted by the host's earlyoom service after its local push. During recovery, an overstrict test Blob path guard rejected a valid search filename containing two dots; the real rollback code restored the exact pre-dedupe tree. The harness guard was corrected to reject parent-directory path segments, local git packing memory was bounded, and complete standalone/nightly reruns then passed. `rollback-proof.json` records exact tree restoration and receipt cleanup. An initial build-path dependency-resolution issue was confined to the sandbox and corrected before the successful build.

No subagents, live publication, live-corpus writes, live usage-ledger writes, or daily-runner-lock operations occurred. The lock directory was excluded from copying. The live data head remains `489655590f2848f06f99e562cb0f33613fd7c3c1`; the freeze file remains `ff2e1900b9b4bdb812f7bf6e2659ef94567988cc3f65a632d464f3228baf2f49`. Five-second disk observations stayed above the 4 GiB floor: minimum root 8.50 GiB, data 33.90 GiB.

**Cleanup completed:** the corpus copy, baseline and dry-run snapshots, partial outputs, local bare repository, local Blob files, test temporaries and build were deleted. Only evidence remains. After cleanup: root 8.52 GiB free; data 89.08 GiB free. The live head and freeze hash were checked again after deletion.
