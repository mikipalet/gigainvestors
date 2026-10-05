Fairfax: KEEP FROZEN

The 2026-10-05 scheduled share check does not justify the Buy-now flip. The
price is on the correct USD basis. The accepted share count is not supported
by the current primary reports, and the saved valuation mixes different share
definitions and financial amounts. No freeze file was changed.

Primary evidence

* [2025 annual report](https://www.fairfax.ca/wp-content/uploads/2026/03/FFH_Fairfax-Financial-2025-Annual-Report-144860.pdf),
  PDF pages 47–51, 95 and 99 (printed pages 45–49, 93 and 97).
* [2026 second-quarter interim report](https://www.fairfax.ca/wp-content/uploads/2026/07/FFH-2026-Q2-Interim-Report-Final-Bh5r66R43.pdf),
  Note 12, page 19, and common book-value disclosure.
* [2025 Form 40-F index](https://www.sec.gov/Archives/edgar/data/915191/000110465926024781/0001104659-26-024781-index.htm),
  CIK 915191, accession 0001104659-26-024781, filed March 6, 2026.
  Its single-class cover share count must not be treated as the entire issuer's
  effective common denominator. The issuer PDFs supply the complete reconciliation.

| Share definition | December 31, 2025 | June 30, 2026 |
|---|---:|---:|
| Subordinate shares, net of treasury | 20,107,316 | 19,221,125 |
| Multiple-voting shares | 1,548,000 | 1,548,000 |
| Less interest held through ownership in shareholder | 799,230 | 799,230 |
| Effective common shares outstanding | **20,856,086** | **19,969,895** |

Annual gross subordinate issuance was 21,880,169; treasury shares were
1,772,853. The annual EPS denominator is a different measure again: weighted
basic shares 21,449,822; weighted diluted shares **23,084,027**, including
1,634,205 share-based awards. Neither is a current common-book denominator.
The first-half decline in subordinate shares is explained by 1,055,190 shares
cancelled, 62,612 acquired for treasury, and 231,611 reissued. It is not evidence
of a stock split or bonus issue.

The cached check accepted Yahoo's 22,371,876 shares because it was within 0.2145%
of EODHD's December 2025 balance-sheet count of 22,324,000. It ignored that the
same provider supplied 15,602,606 for June 2026 and 19,221,125 as its current
count. The latter happens to match the interim *subordinate* count; that does
not make it the effective common denominator. Yahoo's 22,371,876 differs from
the interim effective common count by about 12%. Two brands agreeing on an old
number do not establish the required economic definition.

Other saved valuation inputs also require repair. Amounts below are USD million.

| FY2025 input | Saved input | Annual report |
|---|---:|---:|
| Equity used | 26,466.048 | Common 26,282.6; parent including preferred 26,514.3 |
| Total assets | 107,591.543 | 107,787.7 |
| Net income | 4,855.943408 | Parent 4,772.4; common after preferred adjustments 4,935.0 |
| Operating cash flow | 2,992.993 | 2,419.4 |
| Diluted shares | 21,509,000 | 23,084,027 |
| Outstanding shares | 22,324,000 | Effective common 20,856,086 |

Goodwill plus intangibles, 8,339.4 million, does reconcile. The saved revenue
30,405.4 million does not directly match reported insurance revenue 31,595.0,
non-insurance revenue 8,537.6, or the separate investment-income components;
the accounting concept must be reconciled before changing that field. Fairfax
reports common book per share of $1,260.19 at year-end and $1,304.39 at June 30.
This audit does not certify the ten-year sustainable-return series or a new
fair value.

The exact drift evidence shows `b: false → true`, newly exposed price-test
margin of safety 0.519122448, and fair value midpoint $3,240.970582887193.
`applyShareCheck` scaled the cached midpoint down from $3,772.23456 by
19,221,125 / 22,371,876. The flip came from removal of the confidence blocker
and addition of `shareSources: 2`, not improved economics. The surviving
assumption “share count adjusted for post-year split/bonus” is unsupported by
the cited share roll-forward. Whitelisting Fairfax in the Buy-now invariant
would hide the defect.

Price basis

[Fairfax's investor page](https://www.fairfax.ca/investors/) identifies FFH as
the CAD TSX line and FFH.U as the USD TSX line. FRFHF is the OTC USD subordinate
share line; it must not inherit the CAD price of FFH.TO. Independent daily
Yahoo chart responses retained under `~/data/value-holds/evidence/` reproduce
the October 2 FRFHF close of US$1,558.51 and FFH.TO close of C$2,219.23.
The [Bank of Canada daily rate](https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?start_date=2026-10-01&end_date=2026-10-05)
was C$1.4246 per USD. The converted TSX close is US$1,557.79166, just 0.0461%
below FRFHF. A daily FX observation is not a synchronized arbitrage quote, but
it rules out the large CAD/USD unit error. The saved trading/reporting FX of 1
is appropriate for this USD-to-USD comparison.

General fix and remaining work

`reconcileShares` now excludes a provider's older observations from voting when
its newer compatible-basis count differs by more than 2%. Corroboration-only
cap-implied counts cannot invalidate or cast a vote. All observations remain
in the audit trail. `applyShareCheck` also re-runs reconciliation on stored
observations so an old `verified` cache cannot bypass the fix. The regression
reproduces Fairfax's false match without a ticker-specific exception.

Keep the existing freeze until an evidence-backed correction distinguishes
effective current common, subordinate-class, and annual diluted counts;
reconciles common equity and annual financial concepts; re-runs analysis; and
supplies an invariant-accepted explanation of every verdict change. Do not
replace the current count with 19,969,895 while retaining December financials
without an explicit date/basis bridge. No primary observation was injected
into the live corpus in this task.

Exact cached inputs, source hashes, dates and calculations are retained in
`fairfax-evidence.json`; the complete primary files are on the data volume.
