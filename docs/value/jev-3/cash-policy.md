# Cash credit policy and issuer review

This is a conservative **valuation credit**, not a declaration that all excluded
assets are restricted or worthless. No ticker, price, buy threshold, prior verdict
or approval manifest is an input. Existing quality judgements and the financial
company book-value method are retained.

For operating-company valuations:

- Healthcare plans/managed care, insurance, capital markets/investment banking/
  brokerage, education and companies reporting client assets receive no cash
  addition or cash offset against leverage until distributable surplus can be
  established. Consolidated cash minus 2% of sales cannot establish that surplus.
  This deliberately gives a lower-bound earnings valuation. In particular, the
  education rule does **not** assert that all tuition-company cash is student money.
- Logistics, distribution/distributors and tobacco reserve cash against current
  non-borrowing liabilities not covered by noncash current assets. Only reported
  current debt reduces those liabilities. Missing working-capital coverage gives
  no cash credit. This covers treasury-pool/excise float without trying to identify
  a company by its name or description.
- A vendor cash aggregate above the same statement's current assets (total assets
  only if current assets are missing), beyond 1% rounding tolerance, or below zero
  gives no cash credit. The reported figure remains visible; it is not repaired
  by guessing a subtotal or borrowing an old period's cash.
- Explicitly combined cash/restricted-cash fields exclude their restricted part.
  Separate restricted/segregated assets are never blindly subtracted from an
  unrestricted cash line. Unknown restrictions in the sensitive industries are
  covered by the industry rule. Restrictions and float can overlap, so the larger
  reserve applies rather than adding both. The usual revenue reserve then applies.

The same policy runs in analysis, annual/quarterly historical valuation and
publication, including preserved valuations with no newer interim. Current
liquidity/restriction fields never inherit a prior year's observations. Publication
continues to respect explicit freezes and existing immutable history caches.
That preservation is reported separately from application to eligible records.

## June 2026 issuer reconciliations

Amounts below are millions in reporting currency. `vendor-balances.json` contains
the exact cached vendor inputs. No vendor request was made.

### ELV.US — regulated insurer/managed-care assets

[June 10-Q, balance sheet, Note 9 and MD&A liquidity/capital](https://www.sec.gov/Archives/edgar/data/1156039/000115603926000060/elv-20260630.htm), filed July 15.

Vendor cash 10,232 matches cash/equivalents. Investments 27,282 = current fixed
maturities 25,719 + equities 1,563; aggregate 37,514 is consolidated insurance
liquidity. Debt 31,044 = 30,669 noncurrent + 375 current. The parent has only
2,062 cash/investments available for corporate use. Subsidiary distributions face
statutory dividend and risk-based-capital restrictions. Thus 37,514 is not excess
owner cash. The industry rule grants zero unverified surplus credit; it does not
substitute the parent number into consolidated accounts or assert that it is all
distributable after obligations. The wait-to-buy proposal is rejected.

### LOG.MC — treasury pooling and operating float

[June results, pp. 14–19](https://www.logista.com/content/dam/documents/logista-corporate/economic-financial-information/results-presentations/en/2026/Results%20Announcement%20Q3-2026%20VF.pdf), released July 24. June is fiscal Q3; its half-year ends March, so a June half-year report would be the wrong period.

Vendor 2,467 maps to cash/equivalents; 67 maps to short-term borrowings. Cash is
managed through daily reciprocal lending with Imperial, up to 3,000. This is not
evidence that the whole balance can be distributed. Trade/other payables are
7,307; inventory 1,985 and receivables/other 2,280 total 4,265. The statement
discusses excise duties and seasonal working capital, without separately
quantifying June excise float. The general reserve uses current liabilities
7,381 − current borrowing 67 − noncash current assets 4,265 = 3,049, exceeding
cash. Therefore none is credited as excess. No unsupported split of cash-pool
deposits or excise balances is invented. The wait-to-buy proposal is rejected.

### PRDO.US — invalid cash aggregate, small explicit restriction

[June 10-Q, p. 1 and liquidity discussion](https://www.sec.gov/Archives/edgar/data/1046568/000119312526337926/prdo-20260630.htm), filed August 6.

Unrestricted cash 162.889 + restricted 0.820 = 163.709; investments 571.115 give
734.824 total, of which 734.004 is unrestricted. Restricted cash mainly covers
Hippo escrow/USAHS letters of credit, not a demonstrated large student-money
balance. Vendor cash 897.713 equals 162.889 + the 734.824 subtotal; adding
investments again produces the erroneous 1,468.828, above total assets 1,334.491.
The general reconciliation rejects this cash credit. Vendor debt 56.595 equals
current operating/finance leases 14.225 + noncurrent leases 42.370; it omits
sale-leaseback financing 57.178, included in vendor lease obligations 113.773.
Neither the erroneous cash nor the debt mapping supports the buy upgrade. The
education policy also withholds unverified surplus credit consistently across
the industry; it does not reclassify the issuer's unrestricted balance as restricted.

### PLUS.LSE — client funds and unreconciled vendor figures

[H1 financial statements, balance sheet and Notes 12–14](https://cdn.plus500.com/Media/Investors/Reports/Plus500_Financial_Statements_1H2026.pdf), approved August 10.

Issuer cash is 861.3; vendor 865.771166 does not match. Lease debt is 19.8 + 3.3
= 23.1; vendor total 23.219914 also differs. Note 14 nets customer deposits 315.3
against segregated funds 241.2, leaving client payables 74.1. Note 12 separately
shows 783.6 in segregation against 770.7 required, leaving 12.9 in receivables.
These segregated amounts must not simply be subtracted again from cash. The
consolidated figures do not establish surplus distributable after client and
regulatory needs; the capital-markets rule grants no unverified cash credit.
The vendor current-liability figure 3.317129 also fails to represent the issuer's
407.8. No source-backed match exists for the small valuation uplift. The
wait-to-buy proposal is rejected, without calling all issuer cash client money.

### FCN.US — genuine borrowing increase (proposed approval)

[June 10-Q, balance sheet, Notes 8–9 and liquidity](https://www.sec.gov/Archives/edgar/data/887936/000088793626000088/fcn-20260630.htm), filed July 30.

Cash 163.747 matches the issuer. Revolver 720 + March term loan 300 = 1,020
principal; less 0.680 issuance costs gives 1,019.320. Current operating leases
39.535 + noncurrent leases 208.661 give 248.196. Vendor debt 1,267.516 is exactly
1,019.320 + 248.196. Annual comparable: 365 + 261.721 = 626.721. No convertible
or acquisition borrowing is inferred: financing funded general needs, while H1
operating outflow was 157.7 and repurchases consumed about 520. Cash is ordinary
corporate liquidity; the existing revenue reserve remains. The existing
lease-inclusive leverage measure, with unchanged earnings, supports buy → wait.
Debt affects risk/margin, not a second deduction from after-interest earnings.
Even excluding leases, borrowing less cash is about 3.49 years of normalized
owner earnings, above the existing three-year moderate-leverage boundary.
This exact transition is proposed for controller approval; it is not already approved.
