NOT

The required fresh baseline does not exist. At 2026-10-06 08:46:09 UTC the 03:00 nightly ended `stage=publish status=failed exit=1` with `Calibration failed; publish aborted`. It reached `Waiting 65598 seconds until next 03:00 UTC` after status completed at 08:46:42. A Waiting line after a failed publish does not establish successful publication. Calibration rejected CB.US and DPZ.US for management; GT.US and LCID.US were missing/insufficient. The owner was asked whether to wait for controller recovery or use the unchanged live archive; no fallback authorization was received. Therefore no corpus copy was made and no fresh-publication comparison is claimed.

Branch `value-int10` in `/Users/miki/GitHub/superinvestors-wt/value-pubfix` already contained master, understand `78141da`, and jev-2 `4a0135b`. The held-company branch `e533b14` is now semantically merged. Commit title: `value: release understand, balance sheets, held batch 3`. This is a local checkpoint, not a release-readiness or publication claim.

Implemented and verified in code:

- The four merge conflicts are resolved. Valuation selects an available reviewed current-common observation when it is at least as recent as the dated balance, or explicitly authoritative; otherwise it selects the latest available dated balance, then annual. Reviewed common equity and its effective-common denominator stay paired. Cutoff and optional filing-date checks prevent unavailable observations from winning.
- Both Fundamentals inputs, valuation balance metadata, effective-common/listing-ADS markers, corrected annual share bases, and cached trailing corrections survive the merge. The existing excess-cash policy is retained. Version 1 retains the held branch's common-book treatment; version 2 uses tangible common book.
- The balance refresher now uses a pure denominator rescaling operation when retaining a reviewed old denominator. It no longer supplies an empty synthetic verified check to the stricter holds share checker. A selected reviewed common observation is independently checked without inheriting unrelated old confidence.
- The production approval manifest contains exactly ALSN.US, FDJU.PA, FCN.US, each buy→wait, with the previously reviewed exact valuation/margin tuples and the 2026-10-06 08:40 approval. No other transition was added.
- Fairfax's freeze and the other live policies were not edited. The observed live freeze file has 151 IDs. The 27 underlying algorithm verdict changes remain unapproved; their inherited evidence is preserved in `docs/value/holds-2/`.
- Application TypeScript excludes `research/understandable`, whose replay-only scripts import deleted `.audit` checkouts. Production implementation and tests remain type-checked. Two unit fixtures now use fixed disk observations instead of failing on unrelated host free-space fluctuations; production disk guards were not weakened.

Verification:

| Gate | Result |
|---|---|
| Complete unit suite | 244 files passed; 2,381 tests passed, 1 skipped, 0 failed; final exit 0 |
| Focused merge regressions | 16 passed, 0 failed; reviewed-vs-dated priority, authority, filing cutoff, annual fallback, v1/v2, denominator and independent-confidence behavior |
| Production webpack build | Exit 0, including TypeScript and page generation; offline font fixture; build artifacts on the data volume |
| Additional standalone TypeScript | Interrupted with exit 143; no standalone success claimed. The complete production build’s TypeScript check passed. |
| Diff whitespace | Passed |
| Exact-value secret scan | 110 changed/evidence files checked at initial scan; no credential matches; values never printed |
| Ordinary full-corpus publish --out | BLOCKED: successful nightly baseline prerequisite unmet |
| Only ALSN/FDJU/FCN Buy-now changes | NOT PROVED on the required fresh baseline |
| Nine understandable fail→pass changes | NOT PROVED on the required fresh baseline |
| Sixteen additions with logos | NOT PROVED on the required fresh baseline |
| 151 frozen dossier records unchanged | NOT PROVED by candidate comparison; live freeze configuration untouched |
| All other changes attributed | BLOCKED; especially BELFB.US, CENTA.US, FWONK.US, GOOS.US, HEI-A.US, HVT.US, ITUB.US, TEO.US, TGS.US pending-share valuations |
| Real publish path, local bare remote/stub Blob, exact three approvals | BLOCKED; existing isolated harness was inspected, not represented as having passed |
| ALSN/FCN/NFLX/holds-addition browser gate | BLOCKED; no candidate output was generated |

The build read the unchanged live archive through a read-only mount; it was not a build/browser proof of newly published candidate data. Unit suites used a separate test home and network/mount namespaces, with the source corpus read-only and external networking unavailable. All financial-provider behavior in tests was mocked. No real EODHD request was made. No real runner was invoked and no live runner lock was acquired, modified, or recovered by this session. No push, external publication, revalidation, or subagent was used.

Earlier failed attempts are retained under `~/data/int10/evidence`: disk-dependent runner fixtures (10 failures), a disk-dependent source-cache fixture (one failure), and build diagnostics for missing research checkouts / data-volume module resolution. Those failures were corrected and followed by the complete green suite and build. A data-volume node_modules symlink fixed build module resolution without copying dependencies or changing application code. No failure was omitted from the final suite.

Evidence: `docs/value/int10/` contains the final unit/build logs, merge tests, baseline failure receipt, verification receipt, and controller handoff. Additional attempt logs and disk observations remain in `~/data/int10/evidence`. The minimum observed root free space was above 5.6 GiB; the data volume stayed above 139 GiB. The 4 GiB stop floor was not crossed. All task-owned test-corpus artifacts and build output are removed at handoff; there was no live-corpus copy to retain.

Controller commands, recorded but not executed, are in [controller-commands.md](/Users/miki/GitHub/superinvestors-wt/value-pubfix/docs/value/int10/controller-commands.md). They guard on READY and require a newly proved installation bundle, install accepted holds under the existing cover-6 lock wrapper, then run ordinary publish and post-publish. The bundle and baseline-input migration are explicitly not prepared or claimed ready while this report is NOT. Resolve the nightly baseline prerequisite first, then resume the pending full-corpus gates without expanding approvals or unfreezing Fairfax.
