# Nightly 3 — corrections implemented; KEEP HOLD

**KEEP HOLD.** The final replay contains **139 quality flips across 107 companies: 5 filing-backed, 134 UNEXPLAINED**. Dossiers: **2708 → 2708**, removals **0**. The zero-UNEXPLAINED target is **not achieved**. This is a partial correctness repair with measured remaining blockers, not a claim that the nightly data is ready for release. The requested commit title is a task label.

Comparison baseline is the frozen live release `634f80f3` used by nightly 2. Live is not the truth oracle: the exact diff inventories changes; a nonzero diff alone does not reject an intended, filing-backed correction. Publication remains held because actual verdicts and source/basis losses remain unverified.

## Implemented corrections

1. **Lossy vendor refreshes retain prior annual facts.** The normal fundamentals stage merges missing/null values and inferred absence zeroes with the prior same-period, same-currency observation. Explicit newly reported values, including zero and restatements, win. Omitted years and known splits remain. Every retained fact keeps its original provenance and a pointer to an immutable, content-addressed pre-refresh snapshot. Related lease, compensation, debt, acquisition and share-basis metadata travel with the retained amounts. Validation uses a clone so an integrity suffix check cannot delete source history. Incompatible identity, currency or uncorroborated fiscal boundaries reject the refresh before replacing the prior vendor/fundamentals records.
2. **LULU:** cash-only issuer corrections at real week-based year ends had created sparse duplicate rows beside vendor month-end dates. Exact filed net income now corroborates a unique period join; the original cash flows and shares survive. Final quality results are all pass, matching live.
3. **BCP:** the 2023 annual cash-flow statement explicitly reports no common dividend in 2023 and EUR13.603m in 2022. Common dividends are kept distinct from AT1 coupons and minority dividends. Final quality results match live, and the company remains published in the local replay.
4. **LS Electric / Kawasaki:** split reconciliation now admits documented actions completed by the cache/filing observation date, including actions after the last fiscal year-end. Kawasaki's missing 5-for-1 April 2026 action is sourced explicitly. LS Electric's five quality results match live again. Kawasaki's FY2021 zero revenue/profit was wrong in both live and the initial replay: its filing reports JPY1,488,486m revenue, JPY5,305m operating loss and JPY19,332m parent loss. Those figures now replace the zeroes. Its remaining understandable failure is still listed for complete window review; restoring history does not mandate restoring a pass.
5. **Skellerup ADR:** the depositary states 20 ordinary shares per ADR. Explicitly identified SKL.NZ secondary-listing share/EPS facts are converted before joining SKLUY.US; total financial amounts stay on their original basis. Its five quality results match live again.
6. **Publication guard:** a previously published company that remains in the selected member universe cannot silently disappear. The publisher aborts before dossier replacement if an analysis loses its publishable verdict. This guard is independent of the count-drop override. Pipeline version is now **24**, invalidating older cached analyses.

The generic refresh safeguard is prospective. The earlier inventory retained hashes, not the complete pre-refresh normalized bodies for all 1,179 refreshed companies. Missing historical facts cannot be reconstructed from hashes or copied from live verdicts. The new snapshot archive prevents that evidence loss on subsequent refreshes. This replay used the existing refreshed corpus and reviewed corrections; it did not re-download the vendor universe.

## The original 105 unchanged-source flips

All 105 have a numeric-result change. Twenty also have different Jev answer objects, but none has a final-vs-numeric or adjusted-vs-raw result override explaining the flip. **No Jev/judgement-only causal group was found**, so there are no three members to spot-check in such a group. Source equality here means equality over the observed nightly-2 inventory interval, not proof that the released snapshot was generated from byte-identical historical source bodies.

| Candidate cause | Original flips | Primary-source spot checks / decision |
|---|---:|---|
| Rule/code and share/EPS/market-cap basis since the older live analysis versions | 22 | Meiji, Shionogi, Denso: official 2:1 / 3:1 / 4:1 actions corroborate removal of false dilution failures. Live was wrong in these three checked management verdicts. Other members remain individually UNEXPLAINED until their exact inputs are certified. |
| Completed-statement/data-path differences, including history truncation and lender classification | 83 | LS Electric, Kawasaki and Skellerup: documented share units/actions expose incorrect truncation/joining, now repaired. Additional checks: Credit Saison's lending business supports financial-sector classification, PDI's annual share counts expose mixed bases, SSP's statements expose material parent/minority and lease-cash distinctions, Close Brothers' 2026 release confirms a second consecutive loss. Exact unverified outcomes remain blockers. |
| Jev/judgement re-reading alone | 0 | Observed answer changes do not account for the numeric flips. No blanket approval based on prose or model reruns. |

These are **candidate cause groups**, not a completed causal proof for every row. Live pipeline versions in this cohort were 19, 20 and 22; the old release and current completion paths differ. Full old normalized bodies and an exact per-company historical-code counterfactual have not been recovered. The committed 105-row disposition table records every original flip and whether it remains, is filing-backed, or has disappeared after repair. Current disposition: `{"FILING-BACKED: live wrong or stale": 5, "NO REMAINING FLIP": 14, "UNEXPLAINED": 86}`.

## Full replay and verification

- First unfiltered pipeline-24 analysis: **38,055 written, 0 unchanged, 1 failed**; all 38,056 jobs attempted. `207760.KQ` timed out and then succeeded on its targeted retry.
- A second unfiltered cache-first pass completed with **1 written, 38,055 unchanged, 0 failed**, exit **0**. Its sole rewrite was the final Kawasaki correction. Its exact summary and exit are in `nightly-3-analyze.log` and `nightly-3-final-evidence.json`; no first-pass-zero-exit claim is made.
- Final coverage: `{"emptyMemberSnapshots": [{"id": "457190.KO", "status": "insufficient_data"}], "jobs": 38056, "missingAnalysis": [], "missingFingerprints": [], "missingOrStaleMemberSnapshots": [], "versions": {"24": 38056}}`. An empty memo snapshot for an insufficient-data company is recorded separately from a missing/stale snapshot.
- Normal business-backfill, normal 100-company limit, cached source text, Jev enabled: stage exit `0`. Queue/research completion is measured separately; this is not a claim that all narrative research is complete.
- Normal publisher with **local `--out` only**: exit `0`. The new removal guard remained active. No remote commit, push, revalidation, deployment or publication occurred.
- **10 targeted files / 228 tests passed**. Regressions cover absent/null/empty refreshes, omitted periods, reported zero/restatement precedence, provenance snapshots, incompatible currencies/dates, history preservation despite integrity truncation, sparse LULU rows, BCP dividends, Kawasaki filed losses, depositary-unit idempotence, post-year-end split cutoffs, and disappearing-company publication. The new regressions were observed failing before their fixes. Focused TypeScript check and `git diff --check` pass.
- Full repository suite is not claimed. A separate run of the existing `fix-five` SSR test hit `ReferenceError: innerWidth is not defined` in unchanged `BusinessDepth.tsx`; no UI code was changed to mask that failure.
- All **26,801 inventoried published-company source files** remain hash-identical to the frozen source set. Nonmember report links were restored from the source corpus for full-universe execution; those nonmember links were not independently frozen at task start. The published-company adjudication uses the frozen member sources.
- Replay network dispatches: `{"api.typesafe.ai": 291}`. **Zero EODHD calls**; the public issuer/depositary filing lookups used to adjudicate evidence are separate read-only research, outside these replay counters. No keys were printed.

## Exact change inventory

| Check | Final result |
|---|---:|
| Raw JSON leaf differences | 1,119,797 |
| Exactly proved quote/history-price exclusions | 108,029 |
| Remaining exact JSON differences | 1,011,768 |
| Protected non-share audit | 67,233 differences / 2,306 companies |
| Remaining quality flips | 139 |
| Filing-backed quality flips / UNEXPLAINED | 5 / 134 |
| Dossier removals | 0 |
| Same-FY public-series numeric → null observations | 103 across 36 companies |

The same-FY null ledger is an additional loss detector, not permission to restore live numbers. It excludes disappeared fiscal years and compares by year, not array position. Public derived-series gaps can also arise from intentionally stricter completeness or basis rules; each still needs source adjudication. Metadata and array shifts inflate the raw JSON count. No tolerance or blanket financial/memo exclusion is used.

## Remaining blockers

1. **134 exact quality verdict changes remain UNEXPLAINED.** Every one is listed below and carries old/new metrics and reasons in `nightly-3-quality-flips.json`. A candidate cause or a filing confirming only part of a mechanism is not a filing-backed verdict approval.
2. Remaining short/invalid share histories include `001440.KO`, `601618.SHG`, `EMEIS.PA`, `KMD.AU`, and `PDI.AU`. Examples: the Chinese company's completed share observation is about 660.884bn; PDI's FY2025 filing gives 2,450,879,959 weighted ordinary shares, while the pipeline mixes ordinary and split-adjusted bases. Capital issuance/recapitalisation must not be erased as though it were a split.
3. SSP requires a coherent parent/consolidated and lease-cash basis across its full scoring window. Its FY2025 parent loss is GBP74.4m versus consolidated loss GBP24.0m; OCF is GBP742.2m, capitalised lease principal GBP262.5m and lease interest GBP66.5m. Current legacy missing-total-income handling does not establish a valid 100% parent allocation. Credit Saison's classification is supported, but its exact common-book/dividend windows are not fully certified.
4. Other changed ROIIC, cash-backing, retained-earnings and margin windows still need primary-filing reconciliation. Pre-refresh missing facts without archived source bodies require source recovery, not restoration of old published conclusions.

**Recommendation: KEEP HOLD.** Retain the proven corrections and safeguards, then clear the per-flip and field-loss ledgers against filings. The hold must not be lifted on the strength of this commit, the successful process exits, or matching the named companies alone.

## Primary evidence reviewed

- **2269.JP** — Issuer securities report confirms 2-for-1 split on 2023-04-01. Five-year share CAGR falls from 13.311953730828208% to -1.3562148514431493%; the live dilution failure is a mixed-unit artifact. Decision: live wrong; intended management pass. [Primary source](https://www.meiji.com/global/investors/results-presentations/securities-report/pdf/2023/securities-report_2023_r01_en.pdf)
- **4507.JP** — Issuer confirms 3-for-1 split effective 2024-10-01. Five-year share CAGR falls from 22.661245951468434% to -1.5341803719342684%; live dilution failure is spurious. Decision: live wrong; intended management pass. [Primary source](https://www.shionogi.com/global/en/investors/shareholder-information/shareholder-return.html)
- **6902.JP** — Integrated report confirms 4-for-1 split of the 2023-09-30 record-date holdings. Five-year share CAGR falls from 28.578264909547646% to -2.5546893610398302%; split must not count as issuance. Decision: live wrong; intended management pass. [Primary source](https://www.denso.com/global/home/about-us/investors/annual-report/integrated-report-2023/cfo-message/)
- **010120.KO** — Issuer records 150,000,000 issued shares and 5-for-1 split on 2026-04-10 (vendor trading ex-date April 13). Completion has post-split 2022-2025 comparatives versus earlier pre-split shares. The old reconciliation cutoff at fiscal end ignored the already-completed action. Decision: nightly wrong; fixed post-year-end split cutoff. [Primary source](https://www.ls-electric.com/ko/company/invest/stock)
- **7012.JP** — Issuer declares 5-for-1 split effective 2026-04-01; restore its historical share basis. FY2021 statement page 1 reports revenue JPY1,488,486m, operating loss JPY5,305m and parent loss JPY19,332m. Both live and the initial replay had false zero revenue/profit. Add exact issuer correction. Other operating margins also differ, so the remaining understandable flip still needs a full-window basis review. Decision: nightly history truncation fixed; live and cached FY2021 zeros wrong; full-window understandable verdict not yet certified. [Primary source](https://global.kawasaki.com/news_260209-5e.pdf); [additional issuer statement](https://global.kawasaki.com/en/corp/ir/library/pdf/sta_210518-1e.pdf)
- **SKLUY.US** — Depositary listing states ORD:DR 20:1. Joining ordinary SKL.NZ shares directly to SKLUY ADR history created a false 20-fold jump. Convert only explicitly identified ordinary-listing share/EPS observations, leaving monetary totals unchanged. Decision: nightly wrong; fixed listing-unit join. [Primary source](https://depositaryreceipts.citi.com/adr/guides/pgm_dispabook.aspx?cusip=830573101&pageId=15&subpageID=111)
- **8253.JP** — Corrected issuer IFRS release reports parent profit JPY61,728m, operating cash flow -JPY135,671m and major lending/finance operations. Operating-company cash-backing rules are inappropriate to the lender; financial tests use book returns. Full historical common-equity/dividend inputs still require review. Decision: live classification wrong; exact three pass outcomes not yet certified. [Primary source](https://corporate.saisoncard.co.jp/wr_html/news_data_en/ob97ln0000000bzs-att/20260605_ReleaseE.pdf)
- **PDI.AU** — Annual report note 13, printed page 41 (PDF page 76), gives weighted ordinary shares 2,450,879,959 in 2025 and 2,112,032,411 in 2024. Replay mixes split-adjusted vendor history and unadjusted Yahoo weighted shares. Neither a raw jump nor live proxy is enough to certify a coherent historical basis. Decision: UNEXPLAINED verdict; mixed basis remains a blocker. [Primary source](https://wp-predictivediscovery-2024.s3.eu-west-2.amazonaws.com/media/2025/10/FY25-Annual-Report.pdf)
- **LULU.US** — FY ends 2024-01-28, 2025-02-02, 2026-02-01; net income USD1,550,190,000 / 1,814,616,000 / 1,579,183,000; diluted shares 127,060,000 / 123,935,000 / 119,068,000. Use matching profit to join rounded vendor periods and cash-only correction rows, retaining their cash flows and shares. Decision: nightly removal wrong; fixed; all five tests pass. [Primary source](https://www.sec.gov/Archives/edgar/data/1397187/000139718726000020/lulu-20260201.htm)
- **BCP.LS** — 2023 annual report consolidated cash-flow statement explicitly shows zero dividends to bank shareholders in 2023, EUR13,603,000 in 2022. These are distinct from AT1 coupons and non-controlling dividends; use common-dividend provenance. Decision: nightly removal wrong; fixed missing common dividend. [Primary source](https://ml-eu.globenewswire.com/Resource/Download/b36af017-44ce-432e-a9cb-b7c73ca63fd3)
- **CBG.LSE** — Issuer RNS dated 2026-09-29 reports parent/other-equity loss GBP63.4m for July 2026 and GBP77.9m for 2025; old published model ended July 2025. The two consecutive losses and negative return observations support the new understandable/moat failures. Use issuer release text, not the distributor AI summary. Decision: live stale; intended understandable and moat failures. [Primary source](https://www.investegate.co.uk/index.php/announcement/rns/close-brothers-group--cbg/preliminary-results/9795269)
- **SSPG.LSE** — Annual report printed pages 164 and 168: FY2025 parent loss GBP74.4m vs consolidated loss GBP24.0m; non-controlling profit GBP50.4m. Operating cash flow GBP742.2m, capitalised lease principal GBP262.5m, lease interest GBP66.5m. Missing totalNetIncome must not silently imply 100% parent allocation in mixed provider/filing histories. Neither the live cash-flow proxy nor the new owner-earnings verdict is certified by these figures alone. Decision: UNEXPLAINED verdict: reconcile parent/consolidated allocation and lease cash across the full scoring window. [Primary source](https://www.foodtravelexperts.com/media/q11pqu5h/ssp-group-plc_annual-report-and-accounts_2025.pdf)

## Every remaining quality flip

| Company | Test | Live → final | Decision |
|---|---|---|---|
| 001440.KO | moat | fail → na | UNEXPLAINED |
| 001440.KO | management | pass → na | UNEXPLAINED |
| 001440.KO | understandable | fail → na | UNEXPLAINED |
| 001440.KO | accounting | fail → na | UNEXPLAINED |
| 001440.KO | economics | fail → na | UNEXPLAINED |
| 002236.SHE | management | fail → pass | UNEXPLAINED |
| 051910.KO | management | fail → pass | UNEXPLAINED |
| 086280.KO | management | fail → pass | UNEXPLAINED |
| 1093.HK | management | fail → pass | UNEXPLAINED |
| 138040.KO | management | pass → fail | UNEXPLAINED |
| 139130.KO | management | pass → fail | UNEXPLAINED |
| 2269.HK | management | fail → pass | UNEXPLAINED |
| 2269.JP | management | fail → pass | FILING-BACKED: live wrong or stale |
| 2413.JP | management | pass → fail | UNEXPLAINED |
| 267270.KO | management | pass → fail | UNEXPLAINED |
| 300124.SHE | management | pass → fail | UNEXPLAINED |
| 3092.JP | management | fail → pass | UNEXPLAINED |
| 3457.JP | management | pass → fail | UNEXPLAINED |
| 3659.JP | management | fail → pass | UNEXPLAINED |
| 4208.JP | understandable | pass → fail | UNEXPLAINED |
| 4507.JP | management | fail → pass | FILING-BACKED: live wrong or stale |
| 4751.JP | management | fail → pass | UNEXPLAINED |
| 5019.JP | management | fail → pass | UNEXPLAINED |
| 5713.JP | management | fail → pass | UNEXPLAINED |
| 5714.JP | management | fail → pass | UNEXPLAINED |
| 600000.SHG | management | pass → fail | UNEXPLAINED |
| 600089.SHG | management | pass → fail | UNEXPLAINED |
| 600426.SHG | management | pass → fail | UNEXPLAINED |
| 600875.SHG | management | fail → pass | UNEXPLAINED |
| 601066.SHG | management | pass → fail | UNEXPLAINED |
| 601169.SHG | management | pass → fail | UNEXPLAINED |
| 601229.SHG | management | pass → fail | UNEXPLAINED |
| 601618.SHG | moat | fail → na | UNEXPLAINED |
| 601618.SHG | management | fail → na | UNEXPLAINED |
| 601618.SHG | understandable | pass → na | UNEXPLAINED |
| 601618.SHG | accounting | pass → na | UNEXPLAINED |
| 601618.SHG | economics | pass → na | UNEXPLAINED |
| 601788.SHG | management | pass → fail | UNEXPLAINED |
| 601988.SHG | management | pass → fail | UNEXPLAINED |
| 601998.SHG | management | pass → fail | UNEXPLAINED |
| 6902.JP | management | fail → pass | FILING-BACKED: live wrong or stale |
| 6963.JP | management | fail → pass | UNEXPLAINED |
| 6971.JP | management | fail → pass | UNEXPLAINED |
| 6988.JP | management | fail → pass | UNEXPLAINED |
| 7012.JP | understandable | pass → fail | UNEXPLAINED |
| 7267.JP | management | fail → pass | UNEXPLAINED |
| 7269.JP | management | fail → pass | UNEXPLAINED |
| 7936.JP | management | fail → pass | UNEXPLAINED |
| 7951.JP | management | fail → pass | UNEXPLAINED |
| 8015.JP | management | fail → pass | UNEXPLAINED |
| 8253.JP | management | fail → pass | UNEXPLAINED |
| 8253.JP | accounting | fail → pass | UNEXPLAINED |
| 8253.JP | economics | fail → pass | UNEXPLAINED |
| 8697.JP | management | fail → pass | UNEXPLAINED |
| 9009.JP | management | fail → pass | UNEXPLAINED |
| 9020.JP | management | fail → pass | UNEXPLAINED |
| 9101.JP | management | pass → fail | UNEXPLAINED |
| 9202.JP | economics | fail → pass | UNEXPLAINED |
| 9433.JP | management | fail → pass | UNEXPLAINED |
| 9532.JP | understandable | pass → fail | UNEXPLAINED |
| 9735.JP | management | fail → pass | UNEXPLAINED |
| AMCR.US | economics | pass → fail | UNEXPLAINED |
| AXP.US | moat | pass → fail | UNEXPLAINED |
| BX.US | management | fail → pass | UNEXPLAINED |
| CBG.LSE | moat | pass → fail | FILING-BACKED: live wrong or stale |
| CBG.LSE | understandable | pass → fail | FILING-BACKED: live wrong or stale |
| COALINDIA.NSE | management | pass → fail | UNEXPLAINED |
| DLTR.US | management | fail → pass | UNEXPLAINED |
| DVP.AU | accounting | fail → pass | UNEXPLAINED |
| EMEIS.PA | moat | fail → na | UNEXPLAINED |
| EMEIS.PA | management | fail → na | UNEXPLAINED |
| EMEIS.PA | understandable | fail → na | UNEXPLAINED |
| EMEIS.PA | accounting | pass → na | UNEXPLAINED |
| EMEIS.PA | economics | fail → na | UNEXPLAINED |
| GMD.AU | management | fail → pass | UNEXPLAINED |
| GMD.AU | economics | fail → pass | UNEXPLAINED |
| HBAN.US | accounting | pass → fail | UNEXPLAINED |
| HDB.US | accounting | pass → fail | UNEXPLAINED |
| IAG.AU | moat | pass → na | UNEXPLAINED |
| IAG.AU | management | pass → na | UNEXPLAINED |
| IAG.AU | understandable | pass → na | UNEXPLAINED |
| IAG.AU | accounting | pass → na | UNEXPLAINED |
| IAG.AU | economics | pass → na | UNEXPLAINED |
| IBKR.US | moat | fail → pass | UNEXPLAINED |
| INVP.LSE | understandable | fail → pass | UNEXPLAINED |
| IR5B.IR | economics | pass → fail | UNEXPLAINED |
| ITC.NSE | management | pass → fail | UNEXPLAINED |
| KIM.US | economics | fail → pass | UNEXPLAINED |
| KMD.AU | moat | fail → na | UNEXPLAINED |
| KMD.AU | management | fail → na | UNEXPLAINED |
| KMD.AU | understandable | fail → na | UNEXPLAINED |
| KMD.AU | accounting | pass → na | UNEXPLAINED |
| KMD.AU | economics | fail → na | UNEXPLAINED |
| LEN-B.US | moat | pass → fail | UNEXPLAINED |
| LEN-B.US | economics | fail → pass | UNEXPLAINED |
| LHX.US | moat | fail → pass | UNEXPLAINED |
| MEGACPO.MX | management | fail → pass | UNEXPLAINED |
| MGM.US | economics | fail → pass | UNEXPLAINED |
| MS.US | moat | pass → fail | UNEXPLAINED |
| MTB.US | accounting | pass → fail | UNEXPLAINED |
| MU.US | economics | fail → pass | UNEXPLAINED |
| NDSN.US | economics | fail → pass | UNEXPLAINED |
| OMC.US | economics | fail → pass | UNEXPLAINED |
| OMV.VI | economics | pass → fail | UNEXPLAINED |
| ONGC.NSE | management | pass → fail | UNEXPLAINED |
| PDI.AU | moat | fail → na | UNEXPLAINED |
| PDI.AU | management | fail → na | UNEXPLAINED |
| PDI.AU | understandable | fail → na | UNEXPLAINED |
| PDI.AU | accounting | pass → na | UNEXPLAINED |
| PDI.AU | economics | fail → na | UNEXPLAINED |
| PFD.LSE | management | fail → pass | UNEXPLAINED |
| PINFRA.MX | management | fail → pass | UNEXPLAINED |
| PPG.US | economics | fail → pass | UNEXPLAINED |
| PTC.US | moat | fail → pass | UNEXPLAINED |
| RA.MX | management | pass → fail | UNEXPLAINED |
| RF.US | accounting | pass → fail | UNEXPLAINED |
| SANB3.SA | management | fail → pass | UNEXPLAINED |
| SCHW.US | moat | fail → pass | UNEXPLAINED |
| SHC.LSE | economics | pass → fail | UNEXPLAINED |
| SSPG.LSE | economics | pass → fail | UNEXPLAINED |
| STE.US | moat | pass → fail | UNEXPLAINED |
| STE.US | management | pass → fail | UNEXPLAINED |
| TFC.US | accounting | pass → fail | UNEXPLAINED |
| TMPV.NSE | management | pass → fail | UNEXPLAINED |
| TPL.US | economics | fail → pass | UNEXPLAINED |
| TROW.US | moat | pass → fail | UNEXPLAINED |
| TSCO.US | management | fail → pass | UNEXPLAINED |
| TSCO.US | economics | fail → pass | UNEXPLAINED |
| TYL.US | moat | pass → fail | UNEXPLAINED |
| UHS.US | economics | fail → pass | UNEXPLAINED |
| UOB.F | understandable | fail → pass | UNEXPLAINED |
| USB.US | accounting | pass → fail | UNEXPLAINED |
| VTRS.US | management | pass → fail | UNEXPLAINED |
| VTRS.US | economics | pass → fail | UNEXPLAINED |
| WFC.US | moat | pass → fail | UNEXPLAINED |
| WSM.US | management | fail → pass | UNEXPLAINED |
| WTW.US | economics | fail → pass | UNEXPLAINED |
| WY.US | economics | pass → fail | UNEXPLAINED |
| WYNN.US | economics | fail → pass | UNEXPLAINED |

## Evidence and reproduction

Committed beside this report: `nightly-3-final-evidence.json`, `nightly-3-quality-flips.json`, `nightly-3-original-105.json`, `nightly-3-cause-groups.json.gz`, `nightly-3-filing-reviews.json`, `nightly-3-series-nulls.json.gz`, `nightly-3-exact-summary.json.gz`, `nightly-3-exact-diffs.jsonl.gz`, `nightly-3-price-diffs.jsonl.gz`, `nightly-3-scope.json.gz`, and stage/test logs. The guard, runner, coverage and adjudication scripts are included as `nightly-3-*.{py,cjs}`; copy them back into `.fix5c/nightly-3/` under their original basenames to reproduce against the preserved overlay. These scripts depend on the preserved nightly-2 source/baseline snapshots, not remote live state.

Use `python3 .fix5c/nightly-3/run.py analyze`, then `business-backfill`, then `publish --out=<new local directory>`. Never target `publish-repo`. Exact comparisons use `scripts/value/nightly-price-expectations.ts`, `nightly-price-history-expectations.py`, `nightly-exact-diff.py`, and `fix-5-scope-audit.ts`, with frozen `nightly-2/live-current` as baseline. The historical-price counterfactual uses the existing nightly-2 starting/current pair; only exact matching effects are excluded.

No subagents, pushes, deployments or publication. `publish-repo` was read-only under the replay guard. The 4 GiB disk floor was never crossed; stage resource records are in the evidence. `publish.hold` remains, SHA-256 `a5defda8067e82dee447d696da4a00975a7e05fe1b5a785a8f1059ccf7a6de0e`.
