NOT

Fairfax remains frozen. The held-company batch is not ready for release: the
fixed second-source sample fails for five of six companies, all three layout
holds reproduce, and the provisional issuer selection changes the baseline.
The final manifest keeps all 42 held and preserves the current 3,899-company
baseline. Nothing was published or pushed, and no daily-runner lock was touched.

Fairfax

The primary-source audit and general fix are in [fairfax.md](fairfax.md) and
[fairfax-evidence.json](fairfax-evidence.json). The 2025 annual, 2026 interim,
and 2025 40-F distinguish subordinate, effective common, and weighted diluted
shares. At June 30, 2026, effective common shares were **19,969,895**, not the
22,371,876 accepted by the scheduled check. Its stale annual match was
contradicted by newer observations from the same provider. Annual equity,
earnings, operating cash flow and diluted-share inputs also require repair.

The October 2 FRFHF price was **US$1,558.51**. FFH.TO was C$2,219.23; the Bank
of Canada rate converts that to US$1,557.79. The 0.046% difference supports the
USD price basis. The Buy-now flip came from removal of the share-confidence
blocker, not a currency correction or improved valuation.

The code now prevents superseded provider counts from corroborating another
provider and revalidates cached checks. It has no Fairfax exception. The
freeze must remain until period/class/common-equity corrections and a complete
reanalysis explain any changed verdict under the normal invariant.

Held companies

Recovered and installed **24 current full annual reports for the 26
description-only listings**, representing 20 issuer documents/bundles. The
[annual recovery table](annual-recovery.md), [source bindings](recovered-report-bindings.json),
and [42-company inventory](held-inventory.json) identify each source, period,
PDF page range, content hash and remaining hold. All complete bodies and
extracted sections are retained under `~/data/value-holds/`.

Lonza's 2025 full annual was located on its website but returns HTTP 403 from
this machine, including the individual financial/business PDFs. Windrock's
issuer-distributed 2024 annual was located but its download also returns 403;
no 2025 annual was established. The complete 2020 annual still linked by the
issuer was downloaded but not substituted for current fundamentals. Windrock
also lacks annual fundamentals.

The 11 recent SEC registrants retain full-annual holds; their recent
registration/prospectus/interim filings are recorded in `sec-discovery.json`.
IDWM's earlier coverage cache has a 2022 10-K, whereas current cached inputs
are description-only. It remains held rather than pairing that old filing
with 2025 financials.

Price/history work

The isolated corpus now has the existing coverage closes for 41 holdings and
monthly history for all 42. Independent Yahoo identity/currency/time/history
responses are retained. ATAI's last trading date is September 10: its
[September 11 8-K](https://www.sec.gov/Archives/edgar/data/2081043/000114036126036283/ef20081247_8k.htm)
records a completed acquisition for $6.75 cash plus a contingent right of up
to $2.50, and requested suspension/delisting. A fresh stock price would be
misleading. Its falsely current October 5 seed was replaced in the private
corpus by the actual **$7.35 September 10 terminal quote**; it remains
ineligible under the unchanged freshness gate. See
`terminal-price-correction.json`. COCXF has a stale independent quote
and conflicting current-provider evidence, so its price basis remains held.
No synthetic quote, new date on an old trade, or alternate-share-class price
was installed to pass a gate.

An after-05:00 EODHD refresh attempt was blocked by the existing global budget
guard before HTTP. Requests sent and paid usage increment: **zero**. The
budget was not reset or bypassed.

Second-source check

Seed 202610051 selected six of the 26 provisional additions, before seeing
their results. The unchanged cover-6 checker used original SEC facts or
hash-bound independent PDF transcriptions, a 0.5% financial tolerance, and a
0.1% price tolerance. All six independent price comparisons passed. TOST
passed all three checks. The other five have these numerical discrepancies:

| Listing | Field | Saved input | Primary-source reference |
|---|---|---:|---:|
| BAYRY | Diluted shares in ADR units | 982,424,100 | 3,929,680,000 |
| FBAK | Annual net revenue, USD | 214,043,000 | 217,863,000 |
| KNCRF | Diluted shares after 3-for-1 split | 240,986,800 | 238,653,000 |
| PEYUF | Annual diluted shares | 205,511,800 | 203,130,517 |
| ZLDSF | Annual diluted shares | 258,154,635 | 263,200,000 |

Bayer's issuer confirms four ADRs per ordinary share. Konecranes' issuer
confirms the March 2026 three-for-one split. FBAK's reference adds net interest
before credit losses and noninterest income. Rounded source values are
identified in the proof; discrepancies exceed the existing tolerance.
Four optional SEC lookups also failed with HTTP errors; their independent PDF
proofs are valid and retained, and those transport errors have not been
silently removed. The sample was not redrawn and failed companies were not
quietly replaced. See [second-source-summary.json](second-source-summary.json).

Browser gate and AVBH

The existing production UI was built and tested at **1728×970 and 390×844**
with unchanged `release-gate.mjs` thresholds. Cover-6's previously documented
disposition of whitespace and the exact compact controls is retained; raw
failures remain in the reports. No UI code was changed.

* Ten provisional listing routes: **192 states**, zero blocking findings.
  Routes that redirect to a canonical issuer are identified in
  `issuer-alias-findings.json`; their browser success is not proof that the
  original listing was emitted or numerically bound.
* AGO, AMPY, TOST: **72 states**, **22 blocking findings**. AGO's 100% filing
  bar overlaps its label; AMPY's negative cash/profit change overlaps the
  adjacent delta; TOST's In-depth/More table runs off the phone's right edge.
* Six baseline routes including AVBH: **154 states**, eight blocking findings.
  AVBH retains zero dividends and a **10.24749%** ten-year book-return CAGR,
  but its desktop Honest-profits drawer overlaps $32.29 with the next column.
  NTES has clipped text; PEP holder pagination has 12px controls not covered by
  the exact earlier control exemption. Baseline findings were not reclassified
  to make the gate pass.

Screenshots and complete raw reports are in
`~/data/value-holds/evidence/browser-{baseline,layout,additions}/`. The four
AVBH/AGO/AMPY/TOST findings were also visually inspected.

Ordinary publication proof and release scope

The ordinary `publish --out` command was run on the isolated corpus, without
`--force`, `--existing-analysis`, `--additions-only`, publication, or revalidation.
The provisional 26-addition proof fails: **BAYN.XETRA disappears**, CA/DE
baseline index arrays change, and CFRHF, DVCMY, HINKF and TRMLF become aliases
of CFRUY, DVDCF, HEINY and TOU.TO. The 22 emitted requested additions have zero
R1 binding failures, and emitted baseline dossier/quote values remain equal,
but missing identities and changed index bytes block release.

The final [release.json](release.json) consequently accepts **zero additions**
and records reasons for all 42 holds. An all-held manifest exposed a publisher
guard that rejected the run because all baseline research was preserved and
no new company remained selected. A general regression-tested fix allows that
ordinary baseline-only proof. It does not relax source, freeze, binding,
publication or coverage invariants.

The final ordinary local proof **passes**: all **3,899 baseline dossier
records are byte-identical under the same cover-6 JSON serialization check**;
baseline index arrays and quote tuples are unchanged; there are no missing,
unexpected or unbound emitted IDs; all **148 frozen records** are unchanged.
This is a valid baseline-only proof, not evidence that the rejected additions
are ready. The live archive itself also retains the exact bytes of all
**6,249 files** and the freeze file. See `final-proof.json` and
`live-archive-proof.json`.

The explicitly isolated full suite passes **237 test files, 2,310 tests, one
skipped, zero failures**. Type-check passes. The production UI build passes;
the subsequent publisher-only guard change was covered by its red/green
regression, the full suite and the real ordinary publish proof. Validation
commands, logs and final disk measurements are in `verification.json`.

Constraint incident

The first full-suite invocation omitted `VALUE_CORPUS_DIR`. Existing test
helpers created and removed temporary fixture directories under the default
`~/value-corpus`; this violated the requested read-only rule. The archive
and freeze byte comparison showed no changes. All subsequent tests explicitly
use `~/data/value-holds/test-corpus`; the full suite passed there. This
incident is retained in `constraint-audit.json`, not represented as compliance.

The work uses the existing isolated `value-holds` worktree. No subagents,
remote push, publication or daily-runner lock operations were used. Large
artifacts remain on the data volume. An unrelated private EDINET raw copy was
removed to conserve disk; its live original was not modified.

[Controller commands](controller-commands.md) reproduce the local proof and
the intentionally failing evidence checks. Do not integrate the rejected
candidate manifest or unfreeze Fairfax. A later scoped release can retain
unresolved companies; it needs a fresh baseline, explicit accepted identities,
passing source/binding/browser checks, and a new controller review.
