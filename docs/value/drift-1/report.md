READY

Fix ready on branch `value-drift`, based on freshly fetched `origin/master` `198412bd679dc9a298cbd1eb75e69ba8ad4b353a`. Commit title: `value: ordinary publish reproduces reviewed coverage`. No push or live publication was performed.

The annual-source correction hypothesis is disproved for today's corpus, but there is a separate reproducibility defect in price histories. The 03:08 UTC history refresh replaced the reviewed Yahoo split-adjusted series for ITUB.US and HEI-A.US with EODHD raw monthly closes. A successful ordinary publish would expose those incorrect historical bases. This fix protects the shared history reader (including analysis and publication) and the fetch path generally; it contains no ticker-specific values or exceptions.

The valuations, price tests, value histories and related owner-memo/price-story changes come from scheduled independent share checks saved at `2026-10-05T07:03:38.848Z`, not from reverting the reviewed annual statements. The 07:11 publication retained released analysis after analysis failed, so these new checks had not yet been applied to live. Twenty-five dossiers receive that update. FRFHF's false→true buy flag is one of those scheduled updates: its saved analysis uses 19,221,125 current shares; the independent check reconciles 22,371,876. Live hid the unverified valuation, while ordinary publication exposes the checked book-value valuation. The correction is not a fresh financial-statement calculation. `source-proof.json` replays all 25 independent reconciliations from their dated observations, excluding cap-implied corroboration-only observations as the existing algorithm requires. This proves the recorded pipeline attribution, not a new external audit of the providers.

AESI, NOG and AVBH also advance their memo/story quote date from 2026-09-29 to 2026-10-02: 11.65→12.04, 22.74→23.83 and 31.23→31.26 USD respectively. AVBH's Q7 evidence therefore has two causes: a newer close and a new share check. All 97 stories acquire a fresh publication `asOf`. The existing coverage manifest preserves the unchanged 3,860 baseline analyses; the 97 additions take the normal rendering path, which explains why this entire batch appears in the diff.

Full proof

An ordinary unmodified `198412b` publish and an ordinary fixed publish ran against a freshly copied `~/value-corpus`, with independent local output directories. Neither used `--force`, `--additions-only`, `--existing-analysis`, a replacement dossier, an added verdict freeze or a modified release manifest. Only `--out` was supplied to publication. Cache-only provider mode used the existing 2,079 historical-return caches, with zero failures and no paid request. The final output is `~/data/value-drift-1/final`.

All 3,957 dossiers are present, with zero missing or unexpected IDs. The 3,860 baseline dossiers remain exactly equal as parsed payloads. Both defective price histories now exactly match all 120 reviewed monthly observations, including the original precision. Their released values independently match the retained raw Yahoo responses from cover-4 (`source-proof.json`), so retention is source-backed rather than inferred from desired output. After the fix, the only differences across the full 3,957 are the 287 classified field changes attributable to publication time, current closes and scheduled independent share checks. There are zero unexplained field changes. Seventy of the 97 now differ only in `priceStory.asOf`; the other 27 have the documented scheduled share/quote effects. The report does not claim byte identity for these legitimate updates.

The diagnostic causal control removes only the 25 new share-check records in a separate private namespace. With the same history fix, every valuation, price test, buy flag and value-history change disappears. Its only residual differences are the 97 publication timestamps and current-close effects for AESI/NOG/AVBH. This control is evidence only: none of its output or input removals is part of the production fix. The final acceptance comparison uses the original current inputs and exact old/new field values; it does not broadly normalize valuations, memos, dates or arrays. `proof.json`, `fixed-differences.json`, `share-control-differences.json` and `field-attribution.json` record the assertions.

All 51 reviewed cover-5 period/field corrections match both the saved, timestamp-bound analysis memo inputs and a replay starting from raw vendor fundamentals through `completeCachedYears` and `correctCachedAnnualSources`. This includes revenue definitions, BMA/LOMA/GDS ADS denominators, FWONK's diluted weighted-average shares, and all ZH currency/statement repairs. There are zero saved-input or replay mismatches (`corrections.json`). Every one of the 97 saved analyses and `analysis/inputs` files also has exactly the same SHA-256 as the reviewed coverage corpus. The review corrections are not being lost by ordinary publication or these replay functions. Annual weighted-average diluted shares and current outstanding shares serve different purposes: the new publication share checks do not overwrite the saved annual series.

History defect and general fix

`fetchPriceHistory` previously parsed EODHD's raw `close` as though it were interchangeable with Yahoo's split-adjusted monthly close. The narrow existing split reconciler cannot reconstruct a complete split history from a vendor's last split alone. HEI-A's older incoming/reviewed ratios are 1.953125 and 1.5625 before returning to 1; ITUB reaches 2.06 and steps down through later corporate actions. Both providers' recent closes agree, with the reviewed Yahoo quote timestamp `2026-10-02T20:00:02Z`. The cache refresh metadata is `2026-10-05T03:08:37.960Z`. These changes are not legitimate historical price movements.

The new shared basis check requires three recent closed-month overlaps agreeing within 0.5%, and at least three older overlaps disagreeing by more than 2%. On that conflict, the reader retains released historical observations while allowing new months and meaningful changes to the latest month; it never derives an adjustment factor from the discrepancy or invents earlier adjusted prices. Float/decimal noise below one part per million does not rewrite retained values. A uniformly rebased history after a new split, an isolated correction, and a history without a released baseline remain accepted. During a refresh, conflicting raw EODHD history triggers a Yahoo request; a second conflicting source or a failed request is rejected before the cache is overwritten. Existing stage budgeting and failure handling remain in charge. This is a conservative safeguard for demonstrated basis conflicts with sufficient overlap, not a claim to solve every first-time historical-data error. It does not freeze a dossier, valuation or quote.

Verification and isolation

Seven regression cases cover the reader regression, compatible source recovery, second-source rejection, new month/current-month changes, rounding/older-month retention, uniform new split rebasing and isolated corrections/no baseline. Before the fix, four of the first six cases failed; after it all seven pass. Full unit suite: 228 files, 2,258 passed, one skipped, zero failures. Standalone TypeScript and `git diff --check` pass. An initial full-suite attempt used a data-volume TMPDIR and encountered the pre-existing design-snapshot test's literal `/tmp` requirement; the final full suite passes with a `/tmp` symlink into the data volume. No product code was changed for that environment issue. A local compile typo during implementation was corrected before all final checks.

The fresh copy dereferenced 54,796,694,390 bytes. To avoid consuming another 51 GiB, rsync reused matching inodes only from dedupe-2's pre-existing private copy; seven changed files (2,306,077 bytes) were transferred from current live. Mutable staging, historical-return cache and usage outputs received independent inodes. Environment files, lock directories and transient analyze-test directories were excluded. An exhaustive inode check found no copy inode shared with live and no symlinks in the fresh copy. The archive proof compares all 5,145 live archive files against the fresh baseline and confirms the verdict-freeze file is unchanged. No runner-lock operation, live-corpus write, live usage-ledger write, API acquisition, subagent, push, publication or revalidation occurred. Test HTTP is mocked. Root and data-volume free space stayed above 4 GiB. Large snapshots and logs remain under `~/data/value-drift-1`; all committed evidence is free of credentials.

Next 03:00 UTC nightly

The next scheduled cycle is 2026-10-06 at 03:00 UTC. Runner `198412b` takes ordinary publication when analysis succeeds. With today's inputs and without this fix, that branch publishes the two reverted raw price histories; the currently fresh bad history caches may be skipped by the seven-day refresh policy. The new verified valuations (including FRFHF's buy) would also appear, but those are scheduled share-check effects, not lost annual corrections. If analysis fails again, `--existing-analysis` retains the released analysis/history instead. Future provider responses and whether analysis succeeds cannot be guaranteed; the code-path risk and today's reproducible result are established. This commit is local and does not protect the actual next run until the controller integrates it. No controller or runner action was taken here.

Field-level inventory

`field-attribution.json` contains all 289 original changed paths with full before/after values, cause, code path, input-file SHA-256, saved analysis time, old/new price date, full share-check observations where relevant, and applicable correction records. Object/array additions are recorded atomically with their complete values, not elided. The counts are 97 publication-time paths, 181 share-check paths, eight close-update paths, one combined share/close path, and two defective history paths. Empty correction-record lists mean no row in the cover-5 correction ledger applies to that ID; the exact reviewed analysis/input hashes are still checked. Paths are not excluded merely because their top-level field is time-dependent.

| Dossier | Changed paths | Causes | Quote date in live story → ordinary story |
|---|---:|---|---|
| ABVX.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| AESI.US | 4 | close refresh, clock | 2026-09-29 → 2026-10-02 |
| AGI.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| AKBLF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| AQN.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| ASAIY.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| AVBH.US | 9 | close refresh, clock, share refresh, share + close refresh | 2026-09-29 → 2026-10-02 |
| BATRK.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| BB.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| BELFB.US | 8 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| BH.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| BHC.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| BIO.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| BLCO.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| BMA.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| BMM.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| BTAI.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| BTE.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| BTG.US | 9 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| BUDFF.US | 9 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| BZ.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| CABJF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| CCU.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| CENTA.US | 7 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| CGAU.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| CIGI.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| DCOM.US | 8 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| DGEAF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| DSGX.US | 8 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| ECTXF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| EFXT.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| EGO.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| EQX.US | 8 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| ERFSF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| ERO.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| EU.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| FRFHF.US | 9 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| FSM.US | 9 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| FWONK.US | 9 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| GDS.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| GFI.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| GFL.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| GHM.US | 8 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| GOOS.US | 5 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| GSK.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| GTN.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| HEI-A.US | 10 | history defect (fixed), clock, share refresh | 2026-10-02 → 2026-10-02 |
| HKHGF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| HVT.US | 8 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| IAG.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| ITUB.US | 2 | history defect (fixed), clock | 2026-10-02 → 2026-10-02 |
| KGEI.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| LBTYK.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| LILAK.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| LLYVK.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| LOMA.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| LRLCF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| MEOH.US | 8 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| MINE.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| NAK.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| NG.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| NICE.US | 8 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| NOG.US | 5 | close refresh, clock | 2026-09-29 → 2026-10-02 |
| NSRGF.US | 13 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| NSRGY.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| NTPIF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| NWSA.US | 9 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| NXE.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| PAAS.US | 8 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| PAM.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| PDRDF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| PDS.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| PRNDY.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| PROF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| QXO.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| RBA.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| RBGPF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| RDY.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| RUSHB.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| RYCEY.US | 7 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| SA.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| SSPPF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| STN.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| TAC.US | 6 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| TAP.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| TEO.US | 6 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| TFII.US | 15 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| TFIN.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| TGS.US | 5 | clock, share refresh | 2026-10-02 → 2026-10-02 |
| TPHS.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| TV.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| UAA.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| UHAL.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| WILLF.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| WSO.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| ZG.US | 1 | clock | 2026-10-02 → 2026-10-02 |
| ZH.US | 1 | clock | 2026-10-02 → 2026-10-02 |

Reproduction commands and reusable proof harnesses are in `docs/value/drift-1/harness/`. Machine-readable input/output hashes and command outcomes are in `verification.json` and `evidence-sha256.json`. Report written 2026-10-05T08:37:24.023047+00:00.
