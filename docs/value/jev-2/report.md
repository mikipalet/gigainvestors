NOT

Branch `value-jev-2`, based on freshly fetched `origin/master` `ab804f26a4ef567e65803a4251c7031da009ef5b`. Commit title: `value: valuations use the latest filed balance sheet`. The original reader experiment remains on `value-jev` at `352c4a8`; none of its reader, judgement integration or owner-memo integration is included in this shipping branch. No additional Jev calls were made.

**Decision**

The publication guard rejects additional unapproved balance-driven verdict changes. Only ALSN and FDJU were controller-approved. The other transitions below are NOT treated as approved, and no freeze or threshold was added to conceal them. The requested successful real-path gate therefore remains unmet.

**Complete Buy-now verdict changes**

Values are per share in reporting currency; Plus500 is USD, not its GBX quote currency. Prices, FX, quality decisions and reviewed share denominators are unchanged.

| Dossier | Before → after | Value before → after | Required margin | Approval | Balance source |
|---|---|---:|---:|---|---|
| ALSN.US | buy → wait | USD 151.018257 → 137.579817 | 15% → 50% | Controller approved | [2026-06-30](https://eodhd.com/api/fundamentals/ALSN.US#Financials.Balance_Sheet.quarterly.2026-06-30) |
| ELV.US | wait → buy | USD 387.787885 → 516.820631 | 50% → 25% | NOT approved | [2026-06-30](https://eodhd.com/api/fundamentals/ELV.US#Financials.Balance_Sheet.quarterly.2026-06-30) |
| FCN.US | buy → wait | USD 179.430743 → 175.662711 | 25% → 35% | NOT approved | [2026-06-30](https://eodhd.com/api/fundamentals/FCN.US#Financials.Balance_Sheet.quarterly.2026-06-30) |
| FDJU.PA | buy → wait | EUR 32.009035 → 29.980346 | 35% → 35% | Controller approved | [2026-06-30](https://eodhd.com/api/fundamentals/FDJU.PA#Financials.Balance_Sheet.quarterly.2026-06-30) |
| LOG.MC | wait → buy | EUR 30.783021 → 47.366641 | 25% → 25% | NOT approved | [2026-06-30](https://eodhd.com/api/fundamentals/LOG.MC#Financials.Balance_Sheet.quarterly.2026-06-30) |
| PLUS.LSE | wait → buy | USD 56.319387 → 57.220474 | 25% → 25% | NOT approved | [2026-06-30](https://eodhd.com/api/fundamentals/PLUS.LSE#Financials.Balance_Sheet.quarterly.2026-06-30) |
| PRDO.US | wait → buy | USD 37.186337 → 49.658172 | 35% → 35% | NOT approved | [2026-06-30](https://eodhd.com/api/fundamentals/PRDO.US#Financials.Balance_Sheet.quarterly.2026-06-30) |

ALSN uses June cash USD 399m and debt USD 4,114m, versus annual USD 1,495m and USD 2,921m. Normalized owner earnings stay USD 521m; the existing high-leverage margin becomes 50%. [Reviewed June 10-Q](https://www.sec.gov/Archives/edgar/data/1411207/000119312526334039/alsn-20260630.htm).

FDJU uses June cash EUR 419.2m and debt EUR 2,211.7m, versus EUR 794.1m and EUR 2,261.7m. Its 35% requirement is unchanged. [Reviewed H1 results](https://www.fdjunited.com/wp-content/uploads/2026/07/20260729-FDJUNITEDpressrelease-H12026results.pdf). The vendor filing date is absent; the exported availability is explicitly the conservative 90-day fallback, not a claim about actual filing date.

The additional transitions are supported here by the cached dated vendor balances, not newly completed independent issuer reviews. In particular, the large cash changes at ELV, Logista and PRDO warrant controller source/classification review before approval. FCN’s debt moves from USD 626.721m to USD 1,267.516m and invokes the existing moderate-leverage margin. No outcome-specific parameters were changed.

**Full-corpus proof**

The full dereferenced copy contained 778,076 files / 54,730,820,086 bytes. The source head was `badfe5c93302353468695c5314380f100f5e66ad`. Copy audit: no missing files, size/mtime differences, shared live inodes or symlinks; the daily-runner lock was excluded. The unmodified ordinary publisher reproduces every one of the 3,899 released dossiers exactly, with 3,892 indexed records. All 2,079 historical-return caches are reused, with zero provider requests or cache failures.

The final ordinary `publish --out ... --overwrite` examines all 3,899 dossiers. 1,529 dossier valuation records change; 1,480 mid-value numbers change (including unavailable results); 99 price-test fields change; 7 Buy-now flags change. All 148 explicit freeze records remain identical. No unrelated dossier-field changes were found. All 1,529 eligible pre-change calculations reproduce their released baseline within numerical tolerance, with no changes to growth, discount rate, shares or tier in non-null corrected valuations.

Every affected dossier, including non-picks, has before/after values, verdict and price-test results, required margins, annual/current cash and debt, period, source link and availability assumption in [changed-valuations.csv](changed-valuations.csv). [changed-valuations.json](changed-valuations.json), [all-dossier-changes.json.gz](all-dossier-changes.json.gz) and [attribution.json](attribution.json) retain the full machine-readable evidence. Missing required current balance facts can leave a value unavailable; old cash/debt are not silently substituted.

**Implementation**

The analysis and historical-snapshot paths select the latest eligible dated balance independently of annual quality history and TTM flows. Publication also refreshes existing bound valuations so preserved coverage baselines do not retain annual cash indefinitely. Explicit verdict freezes remain binding. The source, period and actual/assumed availability travel with the valuation. TTM revenue supplies the operating cash reserve; current equity supplies tangible book; existing leverage thresholds remain unchanged.

The reviewed Gamma H1 balance is retained. The dated, reusable pro-forma mechanism retains the reviewed Yum China scenario: USD 1.2bn bridge funds the USD 1.2bn purchase, USD 24m annual pretax financing cost, no assumed tax shield, licence savings or synergies. Availability respects both the base balance and closing disclosure; a later filed balance supersedes the scenario. Gamma is GBP 15.382742/share and Yum China USD 49.228415/share. The financing scenario remains explicitly approximate.

Three defects found in the broader proof were corrected: interim debt now uses the existing same-statement component mapping; omitted quarterly lease obligations no longer erase an annual estimated TTM lease charge; refreshing a preserved valuation no longer repeats unrelated capitalization checks. Current lease observations replace the estimate when reported; otherwise the retained annual estimate is explicitly labelled. No Jev perimeter reader is imported or run. Historical caches and immutable forward records follow the ordinary publisher’s preservation rules.

**Verification**

- Final full unit suite: 240 files; 2,318 tests passed, one skipped. A 15-second per-test timeout accommodates host contention; no tests were excluded. Targeted red/green regressions cover dates, missing cash, component debt, tangible book, TTM leases/reserves, reviewed scenarios, preserved capitalization and exact approved transitions.
- All 3,899 candidate dossiers pass the consistency checks; the released baseline also has zero failures.
- TypeScript passed. The offline production build passed; the pages use the locally generated candidate through `VALUE_STORE_DIR`.
- ALSN and FDJU both render Wait, with buy-below prices USD 68.79 and EUR 19.49. API valuations match the candidate; valuation drawers open; zero page errors. Screenshots and browser receipt are retained.
- A direct invariant check against the completed output rejects `index/ES.json Buy-now changed 0 -> 1; prices and new dossiers explain at most +0/-0` (Logista).
- The REAL CLI path uses the pubfix-2 local bare-remote/stubbed-Blob harness, with only loopback networking and the source corpus mounted read-only. Environment loading is disabled. There is no `--force`, `--existing-analysis` or `--additions-only` bypass. SIGTERM interrupted earlier dry-run and real-path attempts; its cause was not established. The final ordinary output used a 1,536 MiB heap limit; a 1,024 MiB real-path attempt exhausted its V8 heap, so the final retry used 2,048 MiB.
- Real publish exit: **1**. See [real-publish.log](real-publish.log) and [final-audit.json](final-audit.json). The Buy-now invariant blocks before data commit, local push or Blob writes; successful real-path completion is NOT claimed.

The real working tree and dry-run share identical bytes for every emitted JSON file. The strict whole-tree byte check is not green: the aborted real tree retains 25 additional legacy logo JSON files, each proved byte-identical to the pre-run baseline. These are not valuation changes. See [real-byte-proof.json](real-byte-proof.json) and [retained-logo-audit.json](retained-logo-audit.json).

**Isolation and cleanup**

No code push, external publication, external EODHD/Jev request, subagent or live daily-runner lock operation occurred. Source data head and verdict-freeze hash stayed fixed. All task-owned corpus copies, local bare remote, Blob files, temporary snapshots, baseline code and test home were deleted. The original corpus is retained.

Procedural exception: the first unit run used existing tests that created and removed their own temporary directories under `homedir()/value-corpus`, before the test home was isolated. This violated the requested read-only boundary for those temporary directories. Subsequent suites used an isolated test home; no live research/publication-record change was observed. This is disclosed rather than claiming that no write of any kind occurred under the source path.

After cleanup: root 11.02 GiB; data 106.07 GiB. Disk monitoring stayed above the 4 GiB stop floor throughout.

**Controller commands**

```bash
cd ~/data/value-jev
git log -1 --oneline value-jev-2
git diff origin/master...value-jev-2 --stat
cat scripts/value/approved-verdict-changes.json
cat docs/value/jev-2/comparison.json
cat docs/value/jev-2/final-audit.json
```

Reproduction is documented in [harness/README.md](harness/README.md). Do not run the live publisher while the additional transitions remain unapproved. Review each additional balance source and record an explicit controller decision before expanding the exact transition manifest. Then repeat the ordinary full-corpus output, real local publish, byte comparison and browser gates.

**Complete price-test field changes**

These are separate from the seven Buy-now flag changes above; a removed price test is shown as unavailable.

| Dossier | Before | After |
|---|---|---|
| 000792.SHE | fail | unavailable |
| 000810.KO | fail | unavailable |
| 001450.KO | unavailable | pass |
| 005380.KO | fail | unavailable |
| 005940.KO | pass | unavailable |
| 012330.KO | unavailable | pass |
| 016360.KO | pass | unavailable |
| 017800.KO | pass | unavailable |
| 029780.KO | pass | unavailable |
| 035720.KO | fail | unavailable |
| 039490.KO | pass | unavailable |
| 071050.KO | pass | unavailable |
| 105560.KO | fail | unavailable |
| 139480.KO | unavailable | pass |
| 1876.HK | unavailable | pass |
| 300033.SHE | fail | unavailable |
| 377300.KO | fail | unavailable |
| 600030.SHG | pass | unavailable |
| 600362.SHG | fail | unavailable |
| 600999.SHG | pass | unavailable |
| 601211.SHG | fail | unavailable |
| 601236.SHG | fail | unavailable |
| 601377.SHG | fail | unavailable |
| 601398.SHG | pass | unavailable |
| 601600.SHG | fail | unavailable |
| 601688.SHG | pass | unavailable |
| 601881.SHG | pass | unavailable |
| 688303.SHG | fail | unavailable |
| ACS.MC | fail | unavailable |
| AKE.PA | unavailable | fail |
| AKZA.AS | fail | unavailable |
| ALSN.US | pass | unavailable |
| AMP.AU | unavailable | fail |
| AMP.US | pass | unavailable |
| AMXB.MX | fail | unavailable |
| ANET.US | fail | unavailable |
| APO.US | pass | fail |
| AR.US | fail | unavailable |
| AVBH.US | fail | unavailable |
| BAER.SW | pass | unavailable |
| BCO.US | unavailable | fail |
| BCVN.SW | fail | unavailable |
| BOL.PA | unavailable | fail |
| BUCN.SW | unavailable | fail |
| CFR.US | fail | unavailable |
| COR.LS | fail | unavailable |
| CPAY.US | unavailable | fail |
| CSG.AS | fail | unavailable |
| CXSE3.SA | fail | unavailable |
| DHI.US | unavailable | fail |
| DIRR3.SA | fail | unavailable |
| DNB.OL | fail | unavailable |
| DQ7A.IR | fail | unavailable |
| EBS.VI | fail | unavailable |
| ELV.US | unavailable | pass |
| FCN.US | pass | unavailable |
| FDJU.PA | pass | unavailable |
| FIS.US | pass | unavailable |
| FITB.US | fail | unavailable |
| FNV.TO | fail | unavailable |
| FULT.US | unavailable | fail |
| GENTERA.MX | fail | unavailable |
| HIAB.HE | fail | unavailable |
| HUBN.SW | fail | unavailable |
| ISRG.US | fail | unavailable |
| ITUB.US | unavailable | pass |
| KBC.BR | unavailable | fail |
| LABB.MX | pass | unavailable |
| LDOS.US | unavailable | fail |
| LOG.MC | fail | pass |
| LPP.WAR | fail | unavailable |
| LUND-B.ST | fail | unavailable |
| MIO.IR | fail | unavailable |
| MMT.PA | pass | unavailable |
| MNST.US | fail | unavailable |
| NEU.AU | fail | unavailable |
| NOC.US | unavailable | fail |
| NRG.US | unavailable | fail |
| NYT.US | fail | unavailable |
| OCBA.F | fail | unavailable |
| PFG.US | pass | fail |
| PFS.US | fail | unavailable |
| PGR.US | fail | unavailable |
| PLUS.LSE | unavailable | pass |
| PRDO.US | unavailable | pass |
| PRTH.US | fail | unavailable |
| RTO.LSE | unavailable | fail |
| SAP.XETRA | fail | unavailable |
| SAVE.ST | fail | unavailable |
| SB1NO.OL | fail | unavailable |
| SIA1.F | fail | unavailable |
| SJX.F | fail | unavailable |
| STT.US | pass | fail |
| TE.PA | unavailable | pass |
| TGS.OL | unavailable | fail |
| VATN.SW | fail | unavailable |
| VPK.AS | fail | unavailable |
| WN.TO | fail | unavailable |
| WPR.AU | fail | unavailable |
