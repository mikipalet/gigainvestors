# Spin-off r1 — fresh verification after automatic resume

2026-10-03. Worktree `value-zq-spinoff`. Implementation commit **20cd15d** (`value: short histories findable; predecessor history for spin-offs`), preceded by findability commit `c4761ab`. This automatic resume arrived after the implementation and earlier validation were already committed; there was no unfinished predecessor code at HEAD. This pass changes documentation only and reruns local verification.

**77/77 short-history additions remain findable. Twenty predecessor years across ten companies remain integrated into the ordinary nightly path. Pluxee has seven years and a real verdict. All 428 spin-off viewport/path/state checks have zero cut, overlap, below-fold, scroll, wording or other non-whitespace failures. The broader release gate is NOT clean: an additional Lululemon control has reproducible clipping, and whitespace failures remain. Nothing was published.**

## Fresh validation

- Focused regression suite: **129 tests in 5 files passed**, including predecessor history/UI, normal publication, completeness and judgement. Command: `npx vitest run tests/unit/value/predecessor-history.test.ts tests/unit/value/predecessor-ui.test.ts tests/unit/value/publish.test.ts tests/unit/value/completeness.test.ts tests/unit/value/judgement.test.ts --maxWorkers=2 --testTimeout=20000`.
- Frozen original inventory: **77 dossiers, 77 search identities, 77 All companies inclusions; zero Buy now / Next closest inclusions**. This is the original 77-name cohort, even after some acquire seven periods.
- Full snapshot consistency: **2,708 dossiers, 13,177 quality rules, 1,873 IRR checks, 39 cash-covered cases**. Fresh rendered cross-surface checks: **10/10 companies passed**.
- Real browser flow: searching `Pluxee` returns `PLX.PA`; selecting the result opens `/plx.pa`; the page displays **7 years** and **Not a wonderful business**. The lasting-advantage drawer has both **FY2019–2020 · before the spin-off: Sodexo segment** and **FY2021–2023 · before the spin-off: Sodexo segment**, linked respectively to segment and combined accounts.
- Pluxee’s displayed ROIC excluding acquisitions: **11.3% five-year median**, below the unchanged **15%** bar. Predictable profits, cash for owners and honest profits pass; lasting advantage fails; management stays undecided/Wait. The annual/margin history spans FY2019–25. Missing segment-year ROIC and per-share fields stay null.
- Fresh gate: **829 states** across **1728×970, 2056×1180, 1440×800, 390×844**, covering home, time travel (including 2011), LULU and WKL controls, ADBE, GOOGL, KO, JPM and all ten predecessor dossiers, plus drawers/search/filter states. **283 failed states: 282 whitespace-only and one clipping state.**
- The ten predecessor dossiers account for **428 states; zero non-whitespace failures**. The fresh gate is one complete run and retains every failure.
- Whitespace: **129 states above 25% raster empty area**, maximum **48.68%**. These exceed the fixed-width allowance and are not waived. The raw gate exits **1**, not a release-ready pass.
- `git diff --check`: passed. Search, bottom bar, time slider, filters, `SidePanel.tsx`, business memo components and all `app/value` styles are unchanged from pre-task `2713930`.

The first ad-hoc browser search check timed out because it looked for an anchor; the shared search renders role=option rows. Correcting that test selector verified the real flow without changing the product.

## Additional control failure retained

**LULU.US, 1440×800, “The business, in depth”: Calculation / Source links extend below the viewport.** The prior 658-state combined audit did not include Lululemon. The fresh full gate and a separate minimal reproduction both fail in this state. Measurement: panel width 560 px, three columns, minimum 13 px memo font, 17 source-link groups; some links end at approximately y=812 and y=840 in an 800 px viewport.

`BusinessDepth.tsx`, `BusinessSection.tsx`, `SidePanel.tsx` and the styles are byte-identical to the pre-task baseline. This is outside the approved spin-off/findability scope; they were not changed to repair this extra control. The evidence is retained for a separately scoped memo/drawer fix. It would be incorrect to carry forward the previous broad “zero cuts” statement over this expanded cohort.

## Nightly path and implementation retained

`completeCachedYears` adds the reviewed predecessor records before integrity checks and analysis fingerprinting. `analyzeCompany` carries source/basis metadata into analysis. Normal `publishSnapshot` exposes short-history identities and preserves source-backed partial verdicts across search, indexes, All companies and dossiers. The publisher also completes history before refreshing capital-return series. No generated public JSON is postprocessed.

Existing standalone/restated fields win over historical segment observations. Missing segment fields remain null; no parent shares, cash flow, tax or debt are allocated. Sources and basis remain in the year-level data and in the existing filing section of evidence drawers. Shared chrome and widths remain unchanged.

The production compile, TypeScript check and full **1,822-pass / 1-skipped** suite are evidence from the preceding pass, recorded in `spinoff-1b-report.md`; they were not rerun or represented as fresh here because source code is unchanged. The existing production compile in `.next` served all fresh browser checks.

## Applied source inventory (retained from implementation)

| Company | Added years | Final consecutive span | Source and basis |
|---|---|---|---|
| PLX.PA | 2019, 2020 | 2019–2025 (7) | [Sodexo · Benefits & Rewards Services · segment](https://tracks.sodexonet.com/files/live/sites/com-global/files/02%20PDF/Finance/Sodexo-Universal-Registration-Document-FY2020.pdf#page=109)<br>[Sodexo · Benefits & Rewards Services · combined](https://www.pluxeegroup.com/sites/g/files/jclxxe221/files/2024-01/Pluxee%20-%20Prospectus_compressed.pdf#page=164) |
| VLTO.US | 2019 | 2019–2025 (7) | [Danaher · Environmental & Applied Solutions · segment](https://www.danaher.com/sites/default/files/2023-08/danaher-2021-annual-report_1.pdf#page=85) |
| SDZ.SW | 2019 | 2019–2025 (7) | [Novartis · Sandoz · segment](https://www.novartis.com/sites/novartiscom/files/novartis-annual-report-2020.pdf#page=218) |
| SOLV.US | 2019 | 2019–2025 (7) | [3M · Health Care · segment](https://www.sec.gov/Archives/edgar/data/66740/000155837021000737/R28.htm) |
| KALMAR.HE | 2019, 2020 | 2019–2025 (7) | [Cargotec · Kalmar · segment](https://www.kalmarglobal.com/49c38c/globalassets/ir/kalmar-corporation---demerger-and-listing-prospectus-22-may-2024.pdf#page=106) |
| TKMS.XETRA | 2019, 2020, 2021 | 2019–2025 (7) | [thyssenkrupp · Marine Systems · segment](https://ucpcdn.thyssenkrupp.com/_legacy/UCPthyssenkruppAG/assets.files/media/investoren/berichterstattung-publikationen/update-21.11.2019/en/thyssenkrupp-gb-2018-2019-en-web_neu.pdf#page=74)<br>[thyssenkrupp · Marine Systems · segment](https://ucpcdn.thyssenkrupp.com/_binary/UCPthyssenkruppAG/9fee6ee8-a921-445a-b5b7-6be9c29d8446/thyssenkrupp-GB-en-2020-2021-Web.pdf#page=71) |
| SNDK.US | 2020, 2021 | 2020–2026 (7) | [Western Digital · Flash-based products · segment](https://www.sec.gov/Archives/edgar/data/106040/000010604021000040/wdc-20210702.htm) |
| FDXF.US | 2020, 2021, 2022 | 2020–2026 (7) | [FedEx · FedEx Freight · segment](https://investors.fedex.com/files/doc_financials/2022/ar/Annual-Report.pdf#page=114) |
| SYENS.BR | 2020 | 2020–2026 (7) | [Solvay · SpecialtyCo · combined](https://www.syensqo.com/sites/g/files/alwlxe161/files/2023-11/_SpecialtyCo%20Registration%20Document.pdf#page=186) |
| HONA.US | 2019, 2020, 2021, 2022 | 2019–2025 (7) | [Honeywell · Aerospace · segment](https://www.honeywell.com/content/dam/honeywellbt/en/documents/downloads/press-releases/4Q20-Press-Release-Financials.pdf#page=2)<br>[Honeywell · Aerospace · segment](https://www.sec.gov/Archives/edgar/data/773840/000077384023000013/R30.htm) |

Basis details (also present in the source-controlled data):

- **PLX.PA**: FY2020 report, p.107: total segment revenue includes inter-segment sales; underlying operating profit includes equity-accounted business profit and excludes other operating income/expenses. Segment assets and liabilities are not disclosed. Capex is a rounded sales ratio only. Prospectus combined accounts F-1, F-66. Identifies the combined FY2021–23 periods. Matching revenue is corroborated; later restated revenue, earnings and other statement fields retain their own values and sources.
- **VLTO.US**: 2021 annual report, pp.82–83. Historical segment perimeter; unallocated corporate costs excluded. Identifiable assets are segment assets, not equity. Gross capital expenditures and D&A are disclosed separately.
- **SDZ.SW**: 2020 annual report F-20–22. Sales to third parties and IFRS segment operating income; corporate financing and tax are unallocated. Historical Sandoz perimeter. PP&E additions are not cash capital expenditure and are not substituted for it.
- **SOLV.US**: 2020 Form 10-K Note 19, FY2019 recast segment data. Historical Health Care includes subsequently divested food safety and drug delivery; not a restated Solventum carve-out perimeter. Sales and profit include dual credit; corporate costs and special items are unallocated. Assets and D&A use the recast allocation basis. No parent cash flow, tax or shares allocated.
- **KALMAR.HE**: 2024 listing prospectus p.103: audited historical segment total sales, including Navis and heavy cranes, consistent with the initial 2021 carve-out sales basis. Excluding those businesses is a separate unaudited series; no profit is inferred from sales.
- **TKMS.XETRA**: 2018/19 annual report p.74: Marine Systems net sales and EBIT, rather than adjusted EBIT. Historical parent segment perimeter. 2020/21 annual report p.71: Marine Systems net sales and EBIT. Investments is not substituted for cash capital expenditure.
- **SNDK.US**: FY2021 Form 10-K, revenue by product: flash-based sales only; HDD is excluded. Annual 52/53-week periods ending July 3, 2020 and July 2, 2021. No allocation of consolidated operating profit, cash flow, capex or shares.
- **FDXF.US**: FY2022 annual report pp.107–109: LTL Freight segment, not Express freight revenue. Operating income includes allocated FedEx Services costs; segment assets include intercompany receivables. Corporate costs remain unallocated.
- **SYENS.BR**: Registration document combined accounts F-3/F-5: total sales include EUR120m non-core revenue. Capex comprises EUR235m PP&E and EUR82m intangible purchases. D&A including impairment is not substituted for D&A. Parent shares are not carried over.
- **HONA.US**: FY2020 full-year results, unaudited segment data: Aerospace net sales and segment profit. Profit excludes corporate, financing, stock compensation, pension and repositioning; includes affiliate equity income. No consolidated cash flow or shares allocated. FY2022 Form 10-K segment financial data. Segment profit excludes corporate costs, financing, stock compensation, pension and repositioning charges; includes affiliate equity income. Segment assets are not standalone equity.


## Other spin-offs reviewed (research status retained)

- GE HealthCare: FY2019–25, already seven. Kenvue: FY2019–25, already seven. Haleon: FY2019–25, already seven (HLN.LSE / cached HLN.US analysis). Corebridge: FY2018–25, already eight; not in this selected index cohort. Daimler Truck: FY2018–25, already eight. Siemens Healthineers: FY2015–25, already eleven. No invented extension merely because the listing itself is newer.
- GE Vernova: five years, FY2021–25. GE Power plus Renewable Energy is not the complete historical Vernova business: Digital/Energy Financial Services and eliminations require reconciliation. The two segment totals were not silently labelled as consolidated Vernova revenue. Sources: [GE historical reporting](https://www.gevernova.com/sites/default/files/ge_webcast_revised_10k_04252023.pdf), [GE's announced business composition](https://www.gevernova.com/news/press-releases/ge-unveils-brand-names-for-three-planned-future-public-companies).
- LG Energy Solution: six annual labels, FY2020–25, but the first issuer row is a December stub. LG Chem's Energy Solutions disclosure has historical figures; adding FY2019 without reconciling that stub would falsely represent seven full annual periods. No addition. [LG Chem offering circular, segment accounts](https://links.sgx.com/FileOpen/(LG%20Chem%202022)%20Final%20Offering%20Circular%20(bannerless).ashx?App=Prospectus&FileID=56265).
- Kongsberg Maritime: four years, FY2022–25. Older Maritime reporting includes Sensors & Robotics subsequently reported with Discovery. The checked FY2021 segment table is not yet reconciled to the transferred business; no addition. [FY2021 report](https://www.kongsberg.com/globalassets/kongsberg-asa/5.-investor-relations/1.3.-reports-and-presentations/1.3.2.-quarterly-reports/2021/q4/2022-02-10_engelsk-q4-web3.pdf).
- Amrize: five years, FY2021–25. Older Holcim North America reporting uses CHF while the carve-out series uses USD and a changed acquisition perimeter. No unsourced conversion or allocation. [Holcim FY2019 report](https://www.holcim.com/sites/holcim/files/2022-04/02272020-finance-lafageholcim_fy_2019_report_backend-en_457273729.pdf), [Amrize Form 10](https://www.amrize.com/content/dam/newco/language-masters/en/Newsroom/amrize-to-deliver-next-phase/amrize_form10_registration_statement.pdf).
- Qnity: FY2022–25 (four); Magnum Ice Cream: FY2022–25 (four); Aumovio: FY2022–25 (four); Sunrise: FY2021–25 (five); Mandatum: FY2020–25 (six); Jio Financial: FY2023–26 (four). Candidate filings were sought, but a verified, compatible earlier annual mapping was not established in this pass. These remain findable neutral dossiers. Do not interpret this as proof that older source history does not exist. [Qnity separation filing](https://ir.qnityelectronics.com/sec-filings/all-sec-filings/content/0001193125-25-215621/d942851dex991.htm), [Mandatum FY2019](https://www.sampo.com/globalassets/year2019/mandatumlife/mandatum-life_annual-report_2019.pdf).
- Sony Financial: the completed cache includes older FY2014–20 observations, but lacks FY2021 between them and FY2022–26. The consecutive integrity window remains five years; no fabricated bridge or unreviewed accounting-basis merge.

This is a source-backed first set, not a claim to have reconstructed every historical carve-out in the universe. Remaining candidates stay searchable while their financial tests remain neutral.


## Remaining exclusions

The original eight non-history-only exclusions remain outside search and country/All companies indexes; none is withheld merely for having a recent listing. APR and Lottery Corporation retain their pre-existing direct-only neutral dossiers (seven/eight periods), which does not make them searchable. The final snapshot has 2,706 indexed/searchable identities and 2,708 dossiers. Two additional membership entries are outside the publisher’s selected analysis cohort: NWS.US has no current merged-universe record (an old analysis file alone does not admit a listing); SAIN.LSE is excluded by the provider description identifying a pooled investment vehicle. Those existing universe/fund filters are unchanged and are not short-history exclusions.

| Company | Why it remains excluded |
|---|---|
| 0016.HK — Sun Hung Kai Properties | Core cash-flow/accrual inputs do not establish the accounting test. |
| 006800.KO — Mirae Asset | Core owner-cash conversion and accrual inputs do not establish economics/accounting. |
| 278470.KO — APR | Retained-earnings/per-share value test lacks its core observations; the informational buyback comment is not the blocker. |
| KBCA.BR — KBC Ancora | Core cash conversion/accrual evidence remains unresolved. |
| TLC.AU — Lottery Corporation | Core retained-earnings/per-share value test remains unresolved; the buyback comment alone is not an exclusion. |
| RF.PA — Eurazeo | Investment-holding rule requires reported NAV per share and dividend history; ordinary book equity is not a substitute. |
| 088350.KO — Hanwha Life | Consecutive common-book/dividend, dilution and retained-earnings observations are required by the financial-business rules. |
| TDSA.LS — Teixeira Duarte | Core cash-flow/accrual evidence remains unresolved. |


## Disk and local-only execution

No build ran in this resume. The existing `.next` is about 215 MiB; the complete `.audit/spinoff` directory is about 631 MiB at the end of the gate (final measured bytes are in `.audit/spinoff/resources-r1.json`). Fresh screenshots/reports added about 160 MiB; total task artifacts remain below 1.5 GiB. Shared free disk remained around 12 GiB (latest measurement **11.57 GiB**), above the 4 GiB stop floor. The preceding pass’s transient ordinary-build budget overrun remains disclosed in `spinoff-1b-report.md`; this resume does not erase it.

No subagents, API key output, push, deployment, remote publication, or writes to `/Users/miki/value-corpus/publish-repo`. `publish.hold` remains present. The report is committed locally in this isolated worktree and copied to the requested report location.

## Fresh artifacts

- [Gate summary](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/gate-r1-summary.json)
- [Full gate, all failures retained](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/gate-r1/report.json)
- [Gate log](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/gate-r1.log)
- [Lululemon reproduction](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/gate-r1-lulu-repro/report.json)
- [Lululemon measured geometry](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/lulu-geometry-r1.json)
- [Findability/source inventory](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/inventory.json)
- [Browser search → dossier → source-note flow](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/browser-flow-r1.json)
- [Consistency results](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/consistency/report.json)
- [Fresh consistency log](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/consistency-r1.log)
- [Fresh 129-test log](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/tests-r1.log)

## Pluxee screenshots — captured and visually inspected in this resume

![Pluxee 1728×970](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/gate-r1/1728x970-_plx_pa-0-page.png)

![Pluxee 2056×1180](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/gate-r1/2056x1180-_plx_pa-0-page.png)

[Predecessor source note, 1728×970](/Users/miki/GitHub/superinvestors-wt/value-zq-spinoff/.audit/spinoff/gate-r1/1728x970-_plx_pa-3-Open_Lasting_advantage_evidence.png)
