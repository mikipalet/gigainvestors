READY

Ready for controller review of the scoped 16-company batch and the separately explained Fairfax unfreeze proposal. This is not approval to publish, lift the 26 remaining holds, or release the 27 listed underlying verdict changes.

The scoped batch contains 16 additions and 26 retained holds. No publication, push, LIVE corpus change, runner-lock operation, subagent or EODHD request was made during holds-2. The existing isolated `value-holds` worktree started at `3c762e6`.

General correction and independent sources

The production cache/analysis path now carries reviewed depositary ratios, explicit share-basis dates, bank revenue components and annual weighted diluted facts through normalization. Split conversion is applied once after the documented basis date. ADR-derived annual shares carry a listing-unit marker so an unlabelled provider count cannot overwrite them. These rules contain no company-ID exception.

| Original failure | Correct annual input | Basis |
|---|---:|---|
| BAYRY diluted shares | 3,929,680,000 ADRs | 982,420,000 ordinary shares × 4 ADRs |
| KNCRF diluted shares | 238,653,000 | 79,551,000 × March 2026 3-for-1 split |
| FBAK net revenue | USD 217,863,000 | Net interest before credit losses 188,791,000 + noninterest income 29,072,000 |
| PEYUF diluted shares | 203,130,517 | Annual weighted diluted; provider Q4 count is not the annual denominator |
| ZLDSF diluted shares | 263,200,000 | Annual weighted diluted basis |

The original six-company regression sample passes 18/18 comparisons. Hash-bound original annual tables, source URLs, conversion descriptions and comparative-year facts are in `annual-evidence.json`, `source-bases.json` and retained downloads. The independent checker still requires the original period, currency, hash and literal table anchors. It uses a valid reviewed original table directly instead of first performing an irrelevant optional SEC lookup; failed historical transport attempts remain retained. Financial tolerance stays 0.5%, price tolerance stays 0.1%.

The first new seed, 202610052, selected CFRUY, CNSWF, HEINY, HKHHF, HKHHY, OGC, PIFYF and ZLDSF from 18 candidates. It exposed additional instances of the same unit/annual-share errors; all were corrected through the general path. All 24 comparisons then passed. Monthly Yahoo history was initially unsuitable for an exact-day close comparison; the first failed attempt is retained, followed by properly dated independent daily responses.

The complete browser sweep then excluded CNSWF and FBAK for layout failures. Before checking the newly included names, the final seed **202610053** selected eight from the resulting 16 accepted IDs: **CFRUY, DVDCF, FLMNF, HKHHY, KNCRF, OGC, PUIGF, ZLDSF**. Campari's diluted annual count was 1,259,199,529 including share awards and convertible dilution, versus the provider's 1,198,785,300. That mismatch was corrected; the failed first result remains in `final-sample-initial.json`. Fielmann's exact revenue was corrected to EUR 2,435,336,000 and Puig's exact diluted count to 563,300,359 even though provider rounding passed tolerance. The final sample passes **8/8 companies, 24/24 comparisons, zero unexplained mismatches and zero source failures**. Its independent price comparisons use the retained **2026-10-02 closes**, with matching dates and currencies, within the existing release freshness gate; they are not represented as October 5 closes. No failed numeric observation was removed to produce a pass. `source-sample.json` records both the scope change and deterministic draw.

Richemont's [Citi depositary directory](https://depositaryreceipts.citi.com/adr/guides/pgm_dispaDivd.aspx?cusip=204319107&pageId=15&subpageID=113) independently confirms ORD:DR 1:10. Bayer's [issuer ADR page](https://www.bayer.com/en/investors/shareholder-information/adr-program) confirms four ADRs per ordinary share; [Konecranes](https://investors.konecranes.com/share-split) documents the split; [Heineken](https://www.heinekenholding.com/investors/share-information/american-depository-receipts) documents two ADRs per ordinary share for HEINY/HKHHY. Ratios are not inferred from the provider discrepancy.

Whole-corpus share-check impact

The general fix rejects superseded observations from the same provider family, chooses the newest observation of an exact source independently of input order, revalidates every cached check including empty evidence, and removes inherited verified confidence when reconciliation fails. Explicit ADS/effective-common bases require matching basis-labelled corroboration. Tests cover misleading stale votes, empty cached checks, order, unrelated provider agreement and basis separation.

The paired audit ran against a copy of **all 3,899 LIVE dossiers**, comparing the pre-holds-1 algorithm with the final algorithm on identical current cached inputs. It used production share application, capitalization, thesis, price-test freeze and public-output code. Capture time: 2026-10-05 23:35 UTC; assumed next nightly: 2026-10-06 05:00 UTC. None of the changed checks crosses the seven-day expiry boundary before that time. Future price, provider or analysis updates are not predicted.

**237 cached valuation calculations change**. Under the currently installed LIVE preservation policy, 15 are explicitly frozen and 213 have unchanged baseline research. The remaining **nine effective changes** are **BELFB.US, CENTA.US, FWONK.US, GOOS.US, HEI-A.US, HVT.US, ITUB.US, TEO.US and TGS.US**: their public valuation confidence becomes pending and displayed valuations disappear. There are **zero effective LIVE Buy/price verdict flips** with that policy. The proposed scoped coverage manifest separately preserves all 3,899 baseline dossiers; it does not silently apply these changes.

**All 27 underlying algorithm verdict changes require controller approval before preservation is lifted**:

7201.JP, ADT.US, ATAT.US, FCNCA.US, FRFHF.US, HBB.US, HLI.US, JEF.US, KALMAR.HE, LAMR.US, LEN-B.US, LEVI.US, MOMO.US, MSGE.US, PAHC.US, PAX.US, RENT3.SA, ROAD.US, SBGI.US, TME.US, UNF.US, VICR.US, VIPS.US, WLY.US, WMG.US, YMM.US, ZM.US.

`share-impact.md` gives each verdict and valuation delta. `share-impact.json` contains evidence for every one of the 237 changes: original observations, old/new reconciliation, original input hashes, model values, rendered outputs, capitalization evidence and preservation disposition. `share-impact-inventory.json` covers all 3,899 IDs; `impact-input-hashes.json` records 13,506 copied inputs. The comparison is a cached-input next-nightly scenario, not a claim that unknown future fetches have been simulated.

Fairfax repair and separate unfreeze proposal

The issuer's 2025 annual report and June 2026 interim report are retained with hashes. Effective common shares are **19,221,125 subordinate + 1,548,000 multiple voting − 799,230 treasury = 19,969,895**. June common equity is USD 26,048.5m and goodwill/intangibles USD 8,142.7m, giving tangible common book of **USD 896.639667 per effective share**. Current book and its denominator are a single dated observation; annual weighted diluted history is preserved.

2025 parent equity is USD 26,514.3m, with preferred equity USD 231.7m recorded separately so common equity is not deducted twice. Parent net income is USD 4,772.4m; separately stored common net income is USD 4,935.0m; OCF is USD 2,419.4m; annual diluted shares are 23,084,027. Corresponding 2024 equity/earnings/OCF/diluted inputs and 2016–2023 revenue are also source-corrected. Trailing FY2025 + H1 2026 − H1 2025 amounts use identical concepts: revenue USD 45,600.9m, parent income USD 4,478.4m and OCF **−USD 32.6m**. No interim period is manufactured as a new annual row.

The actual analysis replay passes all five quality tests. Its underlying fair-value range is **USD 2,869.25 / 3,586.56 / 4,782.08**, versus the previous uncorrected private midpoint 3,772.23. The changed amount follows the corrected common book, denominator, annual return history and TTM inputs; no inferred split or artificial independent confidence is added. The existing model still uses parent net income; pre-2024 goodwill/intangibles and diluted history retain provider limitations, explicitly recorded in `fairfax-inputs.json`.

The **actual LIVE Buy flag is already false** and its public valuation is absent. The separate ordinary local unfreeze proposal keeps both that way: legacy provider observations are not sufficient corroboration of the effective-common basis. The old algorithm's counterfactual Buy=true / midpoint 3,240.97 is not the current LIVE dossier. `fairfax-unfreeze-proof.json` shows **FRFHF.US is the only changed baseline dossier**, with the other 3,898 unchanged, and the private freeze restored afterward. LIVE Fairfax remains frozen. Controller approval can release the explained repaired/pending dossier; it must not treat this as approval of a displayed fair value or Buy call.

Release scope and current UI

Accepted: CFRUY.US, DVDCF.US, FLMNF.US, FLUIF.US, HEINY.US, HKHHF.US, HKHHY.US, KNCRF.US, MTRBF.US, OGC.US, PEYUF.US, PHJMF.US, PIFYF.US, PUIGF.US, RTLLF.US, ZLDSF.US.

The current production UI, with no TSX/CSS changes, was built and exercised at **1728×970 and 390×844** using unchanged cover-6 gate thresholds. The initial 18-candidate sweep covered 302 states. FBAK has two desktop Honest-profits column overlaps; CNSWF has one mobile valuation-range overlap. They remain held. AGO/AMPY/TOST were retested in 72 states and retain 22 blocking findings. The six baseline routes were retested in 154 states and retain eight known findings in AVBH, NTES and PEP. These failures were not reclassified or concealed. Prior controller dispositions apply only to whitespace and the exact owner-required compact controls.

All **16 accepted additions were retested against the final ordinary output: 252 states, zero blocking findings**. Fairfax’s separate repaired proposal passed 24 states, zero blocking findings. Twelve otherwise unchanged records had fresh price-story timestamps, so the final sweep covered every accepted route again. Raw gate findings and the exact existing dispositions remain visible in the browser summaries.

The remaining 26 holds are explicitly listed with reasons in `release.json`: the five layout holds; four aliases plus BAYRY, which would displace existing BAYN.XETRA; ATAI delisting and COCXF quote/history conflict; and fourteen source/fundamental/eligibility holds. Recovered original reports remain available for subsequent work.

Final release proof and handoff

The final ordinary `publish --out` proof passes with **3,899 baseline dossiers, 16 accepted additions and 26 holds**. All baseline dossier records are byte-identical under the unchanged cover-6 JSON-serialization comparison; baseline index arrays and quote tuples are identical. There are zero missing/unexpected IDs, zero analysis-to-publication binding failures, and all **148 frozen records** are unchanged. The publisher reports 3,908 indexed companies; all 3,915 expected dossier identities exist, including additions with insufficient scoring history. No force/existing-analysis/additions-only bypass was used. The separate Fairfax proposal is excluded from this accepted batch proof.

An intermediate local publish correctly rejected an analysis-to-publication binding change while the final source-provenance replay was still completing. Its log is retained. The final proof ran after inputs settled, against a new empty output directory, and passed. The LIVE published archive retains the exact bytes of all **6,249 files**, and its freeze file is unchanged.

The full isolated suite passes **238 test files, 2,326 tests, one skipped**. Type-check and the production webpack build pass. The default Turbopack build could not follow this worktree's external node_modules symlink; the supported webpack build succeeded. No UI files were modified. Relevant red/green regressions, all failed source/browser attempts and final command logs remain under `~/data/value-holds/logs/holds-2` and `evidence/holds-2`.

Scratch corpus, impact copy, test corpus, temporary UI build and rejected/intermediate staging copies were deleted. The **696-file scoped input handoff**, original reports, independent raw evidence, screenshots, logs, final accepted output and separate Fairfax output remain under `~/data/value-holds`. Final measured free space: **10.80 GiB on /** and **64.45 GiB on ~/data**, both above the 4 GiB stop floor. `cleanup.json` lists removed and retained paths. No EODHD access or usage-ledger mutation was needed; all pipeline commands disabled EODHD. The pre-existing holds-1 constraint incident remains recorded in that earlier report and was not repeated here.

[Controller commands](controller-commands.md) restore an isolated proof corpus from retained scoped inputs and a verified unchanged LIVE baseline. They contain no LIVE-write, push, publication or runner-lock command. The 27 verdict approvals and separate Fairfax proposal are concrete review items, not approvals already granted. This batch does not approve the 26 holds or fix the unrelated baseline UI findings.
