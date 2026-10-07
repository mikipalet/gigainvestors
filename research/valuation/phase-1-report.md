# Phase 1 — valuation and price audit, frozen before production changes

GOOGL's quality rejection is partly caused by a real accounting defect: the ordinary owner-earnings bridge charges stock compensation twice. NVDA's low value mainly reflects a stale dollar earnings base, and its steeply rising margins trigger the cyclical safety discount and exclude the compounder tier. Neither observation proves that either stock is a buy at today's price.

The .75 conversion in GOOGL's verdict is the ratio of five-year totals; .77 is the median annual ratio and .81 is the latest annual ratio. All three can be correct; the page fails to make the aggregate-versus-annual distinction clear. Presentation correction is justified without relaxing the .80 threshold.

No production code or thresholds have changed. Baseline commit800a816, method3.5.0; full inventory below covers operating, financial and NAV paths, bridges, growth, fade, required return, safety, buy/IRR, cash/debt and cash conversion. Current source reads are local/read-only; the web supplied principle/accounting references only.

## Evidence, not a claim of a tradable backtest

Baseline replay:2,058 identities,99,691 company-quarter rows;93,961 paired,5,572 reporting/trading currency mismatches,158 unavailable. These missing rows stay explicitly unmeasured. Train US2005–2015; international both periods; **all US2016–2026 results are CONTAMINATED**. Train signals end2015Q3 and returns end2015-12-31; later signals end2026Q2 and realized prices end2026-09-30. The limited universe has no US signal observations for the first three quarters of2005. Three/five-year cohorts must mature inside their period; no overlapping cross-split labels. Detailed denominator, quintile and pass/fail tables are in outputs/baseline-predictiveness.csv.

Current inventory:2,147 owner-earnings valuations,280 book valuations,7 NAV valuations. Of operating valuations,351 use less than half latest annual owner earnings;322 pass all quality tests and18 are buys. Financials have60 quality passes and8 buys. Median model growth is0% operating versus6% financial. The median operating terminal present-value share is49.86%. These quantify structural asymmetry, not its causal return contribution.

Price/value and expected-return rank associations with future returns are weak. US training: three-year mean within-quarter Spearman−.0077 for price/value and+.0079 for expected return; five-year signs reverse(+.0361/−.0263). International associations mostly favor cheaper/higher-return estimates but remain small. These do not validate precise point values or provide evidence for tuning caps. Dependent cohorts, survivorship and current/restated inputs preclude conventional independent-sample significance claims.

## Three/five-year rank predictiveness

| scope | period | horizon | metric | quarters | mean_spearman |
| --- | --- | --- | --- | --- | --- |
| US | train | 3 | price_value | 29 | -0.007716569673948736 |
| US | train | 3 | expected_return | 29 | 0.00794263547506638 |
| US | train | 5 | price_value | 21 | 0.03611656009971589 |
| US | train | 5 | expected_return | 21 | -0.02631140749453802 |
| US | later | 3 | price_value | 31 | 0.001112557927871751 |
| US | later | 3 | expected_return | 31 | -0.008856997799842392 |
| US | later | 5 | price_value | 23 | -0.016616128016354436 |
| US | later | 5 | expected_return | 23 | 0.004615909780990619 |
| Western_nonUS | train | 3 | price_value | 29 | -0.04526229325328151 |
| Western_nonUS | train | 3 | expected_return | 29 | 0.008315749423494957 |
| Western_nonUS | train | 5 | price_value | 21 | -0.0771878670721443 |
| Western_nonUS | train | 5 | expected_return | 21 | 0.03188150720030669 |
| Western_nonUS | later | 3 | price_value | 31 | -0.030027512163257046 |
| Western_nonUS | later | 3 | expected_return | 31 | 0.03897207685717635 |
| Western_nonUS | later | 5 | price_value | 23 | -0.03365299834949314 |
| Western_nonUS | later | 5 | expected_return | 23 | 0.039685643011295846 |
| all_nonUS | train | 3 | price_value | 29 | -0.0320388037027634 |
| all_nonUS | train | 3 | expected_return | 29 | -0.01340534808855128 |
| all_nonUS | train | 5 | price_value | 21 | -0.07084211135156229 |
| all_nonUS | train | 5 | expected_return | 21 | 0.02036814648270075 |
| all_nonUS | later | 3 | price_value | 31 | -0.05966530237850248 |
| all_nonUS | later | 3 | expected_return | 31 | 0.06948260742702161 |
| all_nonUS | later | 5 | price_value | 23 | -0.05218474661644041 |
| all_nonUS | later | 5 | expected_return | 23 | 0.06484851873345752 |

## Iconic buy frequency

Most named compounders were never buys in the available history; Apple had five later-US buys, a CONTAMINATED diagnostic. GOOGL/NVDA/COST/V/MA/MSFT/ASML/LVMH had zero. Some fail quality even when a price gate passes (MSFT training); others never pass price. Missing early histories, share bases and archival classification limit interpretation. GOOG and alternate ASML/LVMH identities are not separate independent observations.

| id | period | rows | quality_pass | valued | price_pass | buy | buy_quarters | median_price_value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AAPL.US | later | 42 | 42 | 42 | 5 | 5 | 2016Q1 2016Q2 2016Q3 2016Q4 2018Q4 | 1.7133850000000002 |
| AAPL.US | train | 40 | 4 | 40 | 0 | 0 |  | 3.2870429999999997 |
| ASML.AS | later | 42 | 28 | 42 | 0 | 0 |  | 3.0208209999999998 |
| ASML.AS | train | 38 | 0 | 26 | 0 | 0 |  | 1.2774459999999999 |
| BRK-B.US | later | 42 | 6 | 42 | 0 | 0 |  | 1.328871 |
| BRK-B.US | train | 39 | 0 | 39 | 0 | 0 |  | 1.385808 |
| COST.US | later | 42 | 21 | 42 | 0 | 0 |  | 3.8193159999999997 |
| COST.US | train | 36 | 4 | 36 | 0 | 0 |  | 2.919578 |
| GOOGL.US | later | 42 | 0 | 39 | 0 | 0 |  | 2.914943 |
| GOOGL.US | train | 18 | 0 | 18 | 0 | 0 |  | 2.272401 |
| KO.US | later | 42 | 14 | 42 | 0 | 0 |  | 2.3195675 |
| KO.US | train | 39 | 11 | 39 | 0 | 0 |  | 1.539099 |
| MA.US | later | 42 | 26 | 42 | 0 | 0 |  | 2.4529875 |
| MA.US | train | 23 | 0 | 23 | 0 | 0 |  | 2.042115 |
| MC.PA | later | 42 | 37 | 42 | 0 | 0 |  | 2.1993775 |
| MC.PA | train | 18 | 18 | 18 | 0 | 0 |  | 1.612627 |
| META.US | later | 38 | 0 | 31 | 0 | 0 |  | 3.420889 |
| MSFT.US | later | 42 | 28 | 42 | 0 | 0 |  | 2.724927 |
| MSFT.US | train | 37 | 0 | 37 | 10 | 0 |  | 0.832859 |
| NVDA.US | later | 42 | 4 | 42 | 0 | 0 |  | 7.4037625 |
| NVDA.US | train | 27 | 0 | 19 | 0 | 0 |  | 1.140492 |
| RMS.PA | later | 42 | 29 | 42 | 0 | 0 |  | 2.927153 |
| RMS.PA | train | 18 | 18 | 18 | 0 | 0 |  | 2.8986725 |
| V.US | later | 42 | 33 | 42 | 0 | 0 |  | 2.0802155 |
| V.US | train | 12 | 0 | 12 | 0 | 0 |  | 2.357154 |

## Losing buys and path differences

There are269 negative matured buy-outcome records across the two horizons; repeated dates/horizons are not269 independent companies. Examples: Jupiter Asset Management2019Q3−73.26% over3y, Morgan Stanley2007Q3−59.03%, Globe Life2006Q1−52.74%, Continental2019Q3−51.91%. These all passed numeric quality at the signal; a losing outcome is evidence against perfect protection, not proof that the business was known to be weak then. Every negative case, including financials, is in outputs/losing-buys.csv.

| scope | period | horizon | method | buy | n | median_return | negative |
| --- | --- | --- | --- | --- | --- | --- | --- |
| US | later | 3 | book_value | False | 882 | 0.4339532836552701 | 0.13151927437641722 |
| US | later | 3 | book_value | True | 63 | 0.3439908040107078 | 0.20634920634920634 |
| US | later | 3 | owner_earnings | False | 8894 | 0.42028584935838664 | 0.18877895210254103 |
| US | later | 3 | owner_earnings | True | 89 | 0.41589973215095455 | 0.11235955056179775 |
| US | later | 5 | book_value | False | 642 | 0.7623284922476554 | 0.0514018691588785 |
| US | later | 5 | book_value | True | 52 | 0.6514241640545236 | 0.1346153846153846 |
| US | later | 5 | owner_earnings | False | 6340 | 0.7999473931965733 | 0.12381703470031545 |
| US | later | 5 | owner_earnings | True | 72 | 0.8534573217117735 | 0.1111111111111111 |
| US | train | 3 | book_value | False | 679 | 0.27686456295461115 | 0.3490427098674521 |
| US | train | 3 | book_value | True | 50 | 0.610758300112367 | 0.18 |
| US | train | 3 | owner_earnings | False | 5842 | 0.43356444346811784 | 0.20181444710715507 |
| US | train | 3 | owner_earnings | True | 109 | 0.5347977485238433 | 0.09174311926605505 |
| US | train | 5 | book_value | False | 483 | 0.33409709183222547 | 0.2815734989648033 |
| US | train | 5 | book_value | True | 18 | 0.3061632662426843 | 0.16666666666666666 |
| US | train | 5 | owner_earnings | False | 3938 | 0.7600109807914849 | 0.12544438801422042 |
| US | train | 5 | owner_earnings | True | 66 | 1.0062883167030583 | 0.015151515151515152 |
| international | later | 3 | book_value | False | 2875 | 0.3863963747132697 | 0.21495652173913044 |
| international | later | 3 | book_value | True | 368 | 0.402915598328328 | 0.1875 |
| international | later | 3 | nav | False | 14 | 0.8520766902242565 | 0.0 |
| international | later | 3 | owner_earnings | False | 18981 | 0.2503228194232854 | 0.30620093777988516 |
| international | later | 3 | owner_earnings | True | 169 | 0.3060526763967526 | 0.2958579881656805 |
| international | later | 5 | book_value | False | 2036 | 0.6736595033086027 | 0.15225933202357564 |
| international | later | 5 | book_value | True | 247 | 0.6985262706980631 | 0.145748987854251 |
| international | later | 5 | owner_earnings | False | 13127 | 0.41697333187535235 | 0.26639750133313017 |
| international | later | 5 | owner_earnings | True | 104 | 0.3737011814848338 | 0.3076923076923077 |
| international | train | 3 | book_value | False | 757 | 0.3048484434732399 | 0.3130779392338177 |
| international | train | 3 | book_value | True | 60 | 0.34069332113164197 | 0.15 |
| international | train | 3 | owner_earnings | False | 6270 | 0.37692957548593764 | 0.26443381180223285 |
| international | train | 3 | owner_earnings | True | 42 | 0.914420736829909 | 0.09523809523809523 |
| international | train | 5 | book_value | False | 417 | 0.41744332054888855 | 0.2853717026378897 |
| international | train | 5 | book_value | True | 32 | 0.6084271906597108 | 0.25 |
| international | train | 5 | owner_earnings | False | 3492 | 0.5533029834151973 | 0.2488545246277205 |
| international | train | 5 | owner_earnings | True | 27 | 1.375163453567101 | 0.0 |

# Phase 1 source audit — baseline 800a816, method 3.5.0

These are operationalizations of Buffett/Munger ideas, not claims that either investor prescribed our numerical cutoffs. Source anchors: [1986 letter: owner earnings and maintenance investment](https://www.berkshirehathaway.com/letters/1986.html), [1992 letter: future cash flows, growth and margin of safety](https://www.berkshirehathaway.com/letters/1992.html), [2015 letter: stock compensation is an expense](https://www.berkshirehathaway.com/letters/2015ltr.pdf). The earnings-versus-cash-flow distinction is independently visible in [Alphabet's 2024 annual report](https://abc.xyz/assets/99/21/46cafdba41089a12a2d86ea47d44/goog026-annualreport2024-web.pdf). No issuer inputs are replaced from the web.

| Rule and source | What it measures and principle | Failure modes, evidence and disposition to test |
|---|---|---|
| NI + D&A − maintenance investment (`owner-earnings.ts`) | Estimate cash a proprietor can withdraw while keeping the business competitive. Principle: value distributable earning power after upkeep. | PPE/revenue average × incremental revenue estimates growth capex; upkeep=max(capex−growth estimate,min(capex,D&A)). Net PPE reflects asset age and inflation; AI capacity may precede revenue, acquisitions distort increments, and intangible reinvestment is expensed. Explicit filing judgements can override maintenance. NI basis omits incremental working capital from cash, while OCF fallback includes it. No universally evidenced new upkeep fraction. |
| Stock compensation (`owner-earnings.ts`, `normalize-eodhd.ts`) | Retain employee compensation as an economic cost. Principle: stock payment is a real expense, charged once. | NI already expenses SBC; subtracting it again from NI+D&A double charges. OCF adds SBC back and therefore must deduct it. Same economics can change solely because D&A/PPE data are missing and trigger OCF fallback. This is an accounting-identity error, not a case for ignoring dilution. Candidate: remove only duplicate NI-path charge, retain OCF charge and share-count/accounting checks. |
| Leases and parent ownership (`owner-earnings.ts`, `parent-share.ts`) | Cash upkeep belongs to common owners after unavoidable lease obligations. Principle: do not mistake borrowed/customer/minority funds for owner cash. | Reported lease repayments or 20% of lease liabilities proxy restore lease cash after D&A addback; incorrect lease classifications and operating-lease inclusion in OCF can double count. Debt lease treatment and parent NI allocation must match. Flat 20% implies roughly five-year life without issuer evidence; no outcome-tuned replacement. |
| Normalization=min(5y median,latest,complete newer TTM) (`valuation.ts`) | Reject peaks and current deterioration. Principle: value sustainable future earning power, not a lucky reported year. | Dollar median puts a growing firm's starting earnings roughly two years behind; no upside response to current scale, but one bad latest/TTM observation dominates. TTM uses full capex rather than annual estimated maintenance: asymmetric bases. NVDA median $26.65bn versus latest annual owner earnings $113.681bn; 351/2,147 current operating valuations use <half latest owner earnings. Candidate audit must distinguish a lagging scale from legitimate cycle smoothing; no latest-net-income shortcut. |
| Standard growth=min(10y OE/share CAGR,revenue/share CAGR,acquisition-adjusted revenue proxy,ROIIC×reinvestment), clamped 0–8% | Limit growth to reinvestment that earns worthwhile returns. Principle: growth is valuable only when incremental capital earns enough. | Lowest noisy proxy can force zero; positive acquisitions divided by positive asset additions is not organic revenue; missing estimates are omitted, creating inconsistent conservatism. Eleven observations required; endpoint loss destroys CAGR. No measured basis yet to raise 8% simply to reach a current price. |
| Compounder eligibility and 12% cap | Quality pass, nonvolatile margins, >=8 finite ROIC years with median >=20%; >=8 owner-return-on-total-capital years with median >=15%; eleven consecutive positive OE/share observations, winsorised annual log growth. Principle: durable high returns can justify longer reinvestment. | Hard quality/volatility gates produce abrupt value/MOS changes. SBC error feeds both economics and total-capital eligibility. NVDA ROIC strong and quality PPPPP, but raw margin CV .400> .35 makes it cyclical, excluding tier despite improving margins. GOOGL fails economics, also excludes tier. Do not relax eligibility from famous later-US winners. |
| Negative three-year revenue overrides growth to zero | Avoid projecting expansion through observed contraction. Principle: acknowledge deterioration. | Compares TTM or annual aggregate revenue to year−3, not per share or organic revenue; missing comparison prevents override. One cyclical trough changes entire forecast. Zero growth then fades upward to 3%, so model is not truly zero-growth perpetuity. |
| Ten-year forecast/fade and 3% terminal (`return-model.ts`) | Discount finite explicit growth and a long-run going concern. Principle: distant growth deserves less confidence. | Standard: five years constant then five-year fade. Compounder: immediate ten-year fade; a 12% compounder rate is not simply ten years at 12%. Terminal accounts for about half of present operating value on current median; 3% perpetuity can rescue a stagnant business, no explicit reinvestment charge for projected growth. Financial growth can remain 6% perpetually instead of 3%. No empirically clear global replacement. |
| Required return=max(10%,local bond+4pp) | Opportunity-cost hurdle shared with valuation discounting. Principle: compare business cash with an available safe alternative. | Country bond/currency/inflation and default risk differ; country need not equal revenue/reporting currency. Frozen historical data use present-day bonds (look-ahead). No new historical-rate acquisition allowed from EODHD. Explicit limitation, not clean prospective validation. NAV bypasses bond floor with fixed 10%. |
| Safety discount: stable25%,moderate35%,volatile50%; compounder15%; leverage floors | Buffer estimation uncertainty. Principle: leave room for error between price and value. | Raw margin CV, not predictability after trend, penalizes secular improvement (NVDA50%); discontinuities at .20/.35 CV and 3/5 debt years. Compounds conservative earnings+growth+discount assumptions. Must evaluate false negatives and newly admitted losers; no inference that all high-priced compounders deserve a buy. |
| Expected return IRR and buy gate (`buy-price.ts`, `owner-return.ts`) | Solve annual return from the same projected owner cash at current price. Principle: pay a price that offers the required return. | With nonnegative cash and identical value model, positive MOS already implies IRR >= required rate, so IRR hurdle is chiefly a consistency/missing-data gate, not independent alpha. Handles cash covering price separately (no finite IRR), FX/share corroboration and quality eligibility. Price/value and IRR predictive correlations are reported separately, not treated as causal evidence. |
| Excess cash=max(eligible cash−2% revenue,0) | Credit distributable cash outside operations. Principle: pay for owner assets once. | Interest income remains in NI, so cash can be counted both as a stock and via its earnings; nominal 2% reserve ignores issuer liquidity needs. Restricted/client/regulated/float cash filters help, but vendor aggregation can still mislead. GOOGL live credit $233.557bn merits a source audit; no manual correction without verified balance evidence. |
| Net debt/leverage | NI is after interest; v2 avoids subtracting all debt again, increases MOS above 3/5 normalized OE years. Principle: match equity cash flows to equity claims without a second charge. | Principal refinancing, maturity and cash-deduction assumptions are not modeled. Earnings-base suppression inflates debt years and MOS. Gross cash exclusions and minority scaling alter leverage. Debt is not literally free: changing principal amortization requires an explicit capital structure model. |
| Financial book-value path | Tangible common book × justified P/B using median finite ten-year ROE, min5 observations, cap25%; retained dividends support growth capped6%; distributable ROE−growth, fixed payout haircut at 4×book. Principle: value financial capital by sustainable distributions to common owners. | Starts from current book (versus old operating dollars); retention ignores buybacks; ROE uses end equity, ignores regulatory buffers, losses and restatements; negative tangible book unavailable. Permanent6% growth and current book may favor finance. IRR now uses same payout haircut; old operating/financial cash-flow inconsistency was corrected in3.2.0. Compare outcomes by path. |
| Investment NAV (`investment-nav.ts`) | Discount ten-year NAV+reinvested dividends at10%, growth capped12%, buy below85% of both NAV and discounted realization. Principle: evaluate the actual assets and common liabilities of a holding company. | Named classification exceptions, NAV lags/illiquidity and realization assumptions; permanent historical compounding, no range, negative growth allowed. No additional debt/cash since contained in NAV. Included in audit even though omitted from initial requested list. |
| Cyclicals (`history.ts`, `analyze-company.ts`) | Raw operating margin variation and filing commodity evidence deny compounder assumptions; high variability raises safety discount. Principle: use through-cycle profitability, not peak earnings. | High upward trend misclassified as cyclical; commodity filing evidence available in current analysis but historical snapshots use numeric variability only. Median five-year dollars mix scale/cycle. Current and historical source paths can differ; flag this instead of claiming clean equivalence. |
| Economics owner-cash conversion >=.80 | Sum five annual owner earnings divided by sum matching NI; optional ROIIC>=12% and NWC conditions also enter. Principle: accounting earnings should be backed by owner cash over time. | Not median annual ratios and not latest ratio. SBC double charge and capex estimate distort numerator; profit weighting lets a large year dominate, negative total NI uses positive-cash branch. Does not literally use OCF on ordinary NI bridge, so name can overstate realized cash. Threshold itself has no literal Buffett prescription. Do not lower it to admit GOOGL; test numerator first. |
| Cash-conversion presentation (`tile-metric.ts`, `EvidencePanel.tsx`) | Explain what decided the test and distinguish annual context. Principle: show comparable quantities with explicit periods and units. | GOOGL .748899 = $331.079bn/$442.088bn, annual median .77 and latest .81 can all be arithmetically correct. Drawer calls its first number 5y median while headline uses aggregate; chart's label 'Annual ... five years' repeats on each point and table assigns annual pass marks although the rule is a window aggregate. Correct presentation independently of thresholds. |

Validation limits: this is a surviving, restated corpus with incomplete failures/delisting returns, current bond yields/FX/classifications and retrospective filing judgement. Original quarterly snapshots use strict filed-before dates or90-day fallback, which does not undo restatement/look-ahead. Repeated company-quarter observations and overlapping horizons are dependent. International train is small with missing allocations; public price history/FX and shareholder returns have gaps. Negative realized outcomes identify losing buys, not proof the underlying businesses were intrinsically weak. No blanket claim that growth businesses can *never* qualify is mathematically valid: all positive valuations have a positive buy price. Empirical buy frequency and price/value ratios measure practical selectivity.


## Phase-2 scope proposed before candidate evaluation

Test an accounting-identity correction charging SBC exactly once, and a current-scale normalization correction using median owner margin at latest annual sales only for already quality-passing high-return firms. Keep all growth caps, discount floors, safety tiers, financial/NAV formulas and the economics threshold unchanged. Reject either correction for shipment if the fixed ship rule fails, even when its accounting rationale is clear. Do not tune candidate parameters on any later-US outcomes. Declare exact eligibility, caps, bridges and loser counting in protocol.json before implementing/evaluating candidates. Presentation correction needs no return fitting.
