# Consistency round 2 — 2026-10-01

Base: `b01220d`; worktree `/Users/miki/GitHub/superinvestors-wt/value-ze-consistency`. Local changes and local publication staging only. No push, deployment or remote publication. All generated builds are under `.next`; all audit staging is under `.audit/staging`. Disk stayed above the 5 GiB stop threshold.

## Result

Expected return now solves the same per-share cash-flow model used for value. Quality verdicts are unchanged. Published buys change from 20 to 22: **000568.SHE and 6690.HK added; none removed**. Both additions previously failed only because the cash-yield-plus-growth shortcut understated their return. Their value and buy price are unchanged.

## Valuation and return

Operating businesses share the ten-year owner-earnings path with the valuation: five years of starting growth followed by a five-year fade, or the compounder’s ten-year fade. Terminal cash, terminal growth and immediate excess cash are identical. All flows use the same share count and reporting-to-listing FX. The IRR solver inverts that valuation at the current quote.

Financial businesses use the same perpetual book/ROE distribution. The 4× book cap at the required rate is represented by a fixed payout haircut, so the midpoint and IRR share one stream of cash flows; low/high estimates discount that same stream. It does not alter financial midpoints or quality gates.

NAV businesses compound NAV and reinvested dividends to a year-ten realization, discounted at the required 10%. The buy ceiling remains 15% below both reported NAV and discounted value. This preserves the existing NAV safety constraint while making expected return and discounted value consistent. All five published NAV values rise 19.7439% at their capped 12% total-return assumption; their buy ceilings and buy membership are unchanged.

For a valid finite solution, return ≥ required return if and only if price ≤ value. Buy still requires the separate safety discount and all quality/data checks. Thirty-one published cash-rich models already repay the purchase from their time-zero excess-cash adjustment; no finite IRR can equate those flows to price. Their dossier and valuation drawer explicitly say cash covers price / no finite IRR, and their return gate is satisfied. No artificial percentage is shown. None changes buy membership. Other missing models remain unavailable.

## Requested before / after

Quotes are frozen at the supplied published-store snapshot. Values and buy prices below are in each listing’s currency.

| Company | Quote | Old expected | Same-model IRR | Value before → after | Buy below before → after | Buy before → after |
|---|---:|---:|---:|---:|---:|---|
| GOOGL.US (USD) | 344.08 | 13.44% | 5.28% | 114.77 → 114.77 | 97.56 → 97.56 | False → False |
| KO.US (USD) | 86.08 | 12.30% | 6.73% | 46.47 → 46.47 | 30.21 → 30.21 | False → False |
| AAPL.US (USD) | 333.02 | 12.97% | 5.68% | 125.34 → 125.34 | 106.54 → 106.54 | False → False |
| LULU.US (USD) | 96.87 | 23.32% | 21.37% | 246.40 → 246.40 | 209.44 → 209.44 | True → True |
| WKL.AS (EUR) | 67.72 | 19.13% | 13.88% | 105.86 → 105.86 | 68.81 → 68.81 | True → True |
| ACN.US (USD) | 183.37 | 17.24% | 11.44% | 219.85 → 219.85 | 186.87 → 186.87 | True → True |

GOOGL’s 5.3% and KO’s 6.7% now agree with their price failures against the 10% hurdle. AAPL likewise shows 5.7%. LULU, WKL and ACN remain buys at 21.4%, 13.9% and 11.4%.

## Tile sentences and business lines

Tile and drawer text now states the applied numeric rule and its pass/fail counts or allowance. The operating moat gate actually uses **ROIC excluding acquisitions: median ≥15%, second-lowest ≥10% (one bad year allowed), and gross-margin drop ≤4 percentage points**. Its chart continues to show ROIC including acquisitions, explicitly labelled. Thus KO’s Pass no longer appears to follow from six years above a different chart threshold. Judgement overrides and trusted filing contradictions name the applied reason.

The published-dossier test independently reconstructs each rule, then also parses the visible tile sentence’s applied-check counts, warning allowance, or explicit override to derive Pass/Fail. All 13,150 published Pass/Fail quality tests agree. Near-threshold formatting preserves enough precision to avoid displaying a rounded equality as a failure.

| Company / tile | Before | After |
|---|---|---|
| GOOGL.US / understandable | Margins vary by 16% of their average. | Loss years 0 ≤ 2; Margin variation 0.16 ≤ 0.35; 5/5 applied checks met. |
| GOOGL.US / moat | Earns 23% on capital including acquisitions; 9/10 years ≥ 15%. | ROIC ex acquisitions median 42.4% ≥ 15.0%; Second-lowest return (one bad year allowed) 33.4% ≥ 10.0%; 3/3 applied checks met. |
| GOOGL.US / economics | Each $1 of profit leaves $0.75 for owners. | Most spending builds new capacity (AI infrastructure); FY2025 upkeep ≈ depreciation USD 21.1bn. Cash conversion is close enough to the threshold; stock compensation remains a cost. Judgement override: pass. |
| GOOGL.US / management | $14.95 of market value per $1 kept. | Value per $1 kept 14.95 ≥ $1; 4/4 applied checks met. |
| GOOGL.US / accounting | Cash exceeds profit by 5% of assets. | Accruals / assets -5.5% ≤ 10.0%; 1 warnings (2 fail; cash backing required). |
| KO.US / understandable | Margins vary by 11% of their average. | Loss years 0 ≤ 2; Margin variation 0.11 ≤ 0.35; 5/5 applied checks met. |
| KO.US / moat | Earns 17% on capital including acquisitions; 6/10 years ≥ 15%. | ROIC ex acquisitions median 22.7% ≥ 15.0%; Second-lowest return (one bad year allowed) 19.4% ≥ 10.0%; 3/3 applied checks met. |
| KO.US / economics | Each $1 of profit leaves $0.95 for owners. | Cash per $1 profit 0.95 ≥ 0.80; 3/3 applied checks met. |
| KO.US / management | $8.16 of market value per $1 kept. | Value per $1 kept 8.16 ≥ $1; 4/4 applied checks met. |
| KO.US / accounting | Profit exceeds cash by 5% of assets; 10% is the limit. | Accruals / assets 5.4% ≤ 10.0%; 0 warnings (2 fail; cash backing required). |
| AAPL.US / understandable | Margins vary by 9% of their average. | Loss years 0 ≤ 2; Margin variation 0.09 ≤ 0.35; 5/5 applied checks met. |
| AAPL.US / moat | Earns 62% on capital including acquisitions; 10/10 years ≥ 15%. | ROIC ex acquisitions median 70.4% ≥ 15.0%; Second-lowest return (one bad year allowed) 31.3% ≥ 10.0%; 3/3 applied checks met. |
| AAPL.US / economics | Each $1 of profit leaves $0.90 for owners. | Cash per $1 profit 0.90 ≥ 0.80; 3/3 applied checks met. |
| AAPL.US / management | 3.03T of market value gained; net capital returned to owners. | Value gained 3025727963119.63 ≥ retained -112594000000.00; 4/4 applied checks met. |
| AAPL.US / accounting | Profit exceeds cash by 0% of assets; 10% is the limit. | Accruals / assets 0.1% ≤ 10.0%; 0 warnings (2 fail; cash backing required). |
| LULU.US / understandable | Margins vary by 12% of their average. | Loss years 0 ≤ 2; Margin variation 0.12 ≤ 0.35; 5/5 applied checks met. |
| LULU.US / moat | Earns 37% on capital including acquisitions; 3/3 years ≥ 15%. | ROIC ex acquisitions median 47.0% ≥ 15.0%; Second-lowest return (one bad year allowed) 32.4% ≥ 10.0%; 3/3 applied checks met. |
| LULU.US / economics | Each $1 of profit leaves $0.90 for owners. | Cash per $1 profit 0.90 ≥ 0.80; 3/3 applied checks met. |
| LULU.US / management | $3.96 of market value per $1 kept. | Value per $1 kept 3.96 ≥ $1; 4/4 applied checks met. |
| LULU.US / accounting | Cash exceeds profit by 0% of assets. | Accruals / assets -0.3% ≤ 10.0%; 1 warnings (2 fail; cash backing required). |
| WKL.AS / understandable | Margins vary by 12% of their average. | Loss years 0 ≤ 2; Margin variation 0.12 ≤ 0.35; 5/5 applied checks met. |
| WKL.AS / moat | Earns 19% on capital including acquisitions; 9/10 years ≥ 15%. | ROIC ex acquisitions median 140.2% ≥ 15.0%; Second-lowest return (one bad year allowed) 104.3% ≥ 10.0%; 3/3 applied checks met. |
| WKL.AS / economics | Each $1 of profit leaves $1.07 for owners. | Cash per $1 profit 1.07 ≥ 0.80; 3/3 applied checks met. |
| WKL.AS / management | 10.4B of market value gained; net capital returned to owners. | Value gained 10381825688.17 ≥ retained -1347000000.00; 4/4 applied checks met. |
| WKL.AS / accounting | Cash exceeds profit by 4% of assets. | Accruals / assets -3.8% ≤ 10.0%; 0 warnings (2 fail; cash backing required). |
| ACN.US / understandable | Margins vary by 3% of their average. | Loss years 0 ≤ 2; Margin variation 0.03 ≤ 0.35; 5/5 applied checks met. |
| ACN.US / moat | Earns 38% on capital including acquisitions; 10/10 years ≥ 15%. | ROIC ex acquisitions median 131.2% ≥ 15.0%; Second-lowest return (one bad year allowed) 45.6% ≥ 10.0%; 3/3 applied checks met. |
| ACN.US / economics | Each $1 of profit leaves $0.87 for owners. | Cash per $1 profit 0.87 ≥ 0.80; 3/3 applied checks met. |
| ACN.US / management | $5.64 of market value per $1 kept. | Value per $1 kept 5.64 ≥ $1; 4/4 applied checks met. |
| ACN.US / accounting | Cash exceeds profit by 6% of assets. | Accruals / assets -5.8% ≤ 10.0%; 1 warnings (2 fail; cash backing required). |

Business-line deduplication favors numeric facts and specific streaks over generic statements about the same dividend/buyback action, plus near-identical wording. Neutral capex context stays in the drawer. KO keeps “Dividend raised 64 consecutive years” and drops “Has paid dividends to shareholders.”

| Company | Business lines before | Business lines after |
|---|---|---|
| GOOGL.US | Provides advertising tools to advertisers, agencies and publishers.; Net cash USD 78.3bn; Credit backstops USD 22.6bn max; Capex 4.3× depreciation, rising; Its brand is widely recognised.; Competitors could innovate faster or deliver products more cheaply. | Provides advertising tools to advertisers, agencies and publishers.; Net cash USD 78.3bn; Credit backstops USD 22.6bn max; Capex 4.3× depreciation, rising over 3 years; Its brand is widely recognised.; Competitors could innovate faster or deliver products more cheaply. |
| KO.US | Sells drinks and beverage concentrates through bottlers and retailers.; Dividend raised 64 consecutive years; Customer concentration 10%; Capex 2.2× depreciation; Monster Beverage Corporation · investment; Has paid dividends to shareholders. | Sells drinks and beverage concentrates through bottlers and retailers.; Dividend raised 64 consecutive years; Customer concentration 10%; Monster Beverage Corporation · investment; It competes with other beverage brands.; Its brands have strong consumer recognition and loyalty. |
| AAPL.US | Sells phones, computers, tablets and related services to consumers and businesses.; Skyworks · supplier · 67% of Skyworks revenue; Capex 1.6× depreciation, rising; Receivables +19%; sales +6%; Regulatory changes could restrict its business.; Distributes third-party apps through the App Store. | Sells phones, computers, tablets and related services to consumers and businesses.; Skyworks · supplier · 67% of Skyworks revenue; Receivables +19%; sales +6%; Regulatory changes could restrict its business.; Distributes third-party apps through the App Store.; Sells through its own stores and third-party distributors. |
| LULU.US | Sells athletic clothing and accessories directly to customers.; Net cash USD 1.8bn; Inventory +18%; sales +5%; Its distinctive brand attracts customers.; Imitation products could compete with its own.; Offers footwear as well as clothing. | Sells athletic clothing and accessories directly to customers.; Net cash USD 1.8bn; Inventory +18%; sales +5%; Its distinctive brand attracts customers.; Imitation products could compete with its own.; Offers footwear as well as clothing. |
| WKL.AS | Provides software, information and services that help professionals do their work.; Goodwill 600% of equity; Invests in new products and selected acquisitions.; Some non-recurring revenues declined.; Serves legal, tax, accounting and healthcare professionals.; Supplies software for compliance and risk management. | Provides software, information and services that help professionals do their work.; Invests in new products and selected acquisitions.; Some non-recurring revenues declined.; Serves legal, tax, accounting and healthcare professionals.; Supplies software for compliance and risk management.; Provides expert information for professional decisions. |
| ACN.US | Goodwill 72% of equity | None |

## Complete buy-list diff

| Change | Company | Quote | Value | Buy below | Expected before → after | Required |
|---|---|---:|---:|---:|---:|---:|
| Added | 000568.SHE — Luzhou Lao Jiao Co Ltd (CNY) | 72.28 | 104.84 | 89.12 | 9.11% → 14.43% | 10.00% |
| Added | 6690.HK — Haier Smart Home Co Ltd (HKD) | 20.14 | 30.21 | 22.66 | 9.37% → 15.53% | 10.00% |

All 22 resulting buys: 000568.SHE, 000786.SHE, 600036.SHG, 600809.SHG, 601318.SHG, 6690.HK, ACN.US, CPRT.US, CTSH.US, DNLM.LSE, FDJU.PA, FFH.TO, GAMA.LSE, INFY.US, IPS.PA, JBH.AU, LULU.US, PZU.WAR, RA.MX, USB.US, WKL.AS, ZTS.US.

## Sharper flags — every change

Capex is red only when capex/depreciation is strictly above 2×, the ratio rises in three consecutive fiscal years, capex itself grew, and owner earnings grew more slowly over that same period and currency basis. Missing comparable history cannot make it red. Ratios above depreciation that do not satisfy all conditions appear as neutral drawer context. Goodwill uses total assets with a >50% threshold; equity is no longer the denominator. Legacy capex records are neutral until recomputed and legacy goodwill/equity flags are suppressed.

WKL’s source-backed 2025 total assets are EUR 9.584bn versus goodwill EUR 4.787bn: 49.95%, below the flag threshold. This replaces its misleading roughly 600%-of-equity warning. GOOGL retains its capex warning because all three conditions hold.

185 companies have changed capex/goodwill flag records. The following table lists every changed flag; unaffected flags are omitted.

| Company | Before | After |
|---|---|---|
| 001800.KO | red: Capex 2.8× D&A, rising | neutral: Capex 2.8× D&A, rising over 3 years |
| A.US | red: Capex 2.3× depreciation; red: Goodwill 66% of equity | neutral: Capex 2.3× depreciation |
| AAPL.US | red: Capex 1.6× depreciation, rising | neutral: Capex 1.6× depreciation |
| ABBV.US | red: Capex 1.6× depreciation, rising; red: Goodwill USD 35.6bn, equity ≤ 0 | neutral: Capex 1.6× depreciation, rising over 3 years |
| ABT.US | red: Capex 1.5× depreciation | neutral: Capex 1.5× depreciation |
| ACN.US | red: Goodwill 72% of equity | None |
| ADBE.US | red: Goodwill 111% of equity | None |
| ADI.US | red: Goodwill 80% of equity | neutral: Capex 1.3× depreciation; red: Goodwill 56% of total assets |
| ADP.US | red: Goodwill 54% of equity | None |
| AIZ.US | red: Capex 1.5× depreciation | neutral: Capex 1.5× depreciation |
| ALLE.US | red: Capex 1.7× depreciation | neutral: Capex 1.7× depreciation |
| AMAT.US | red: Capex 5.8× depreciation, rising | red: Capex 5.8× depreciation, rising over 3 years |
| AMCR.US | red: Goodwill 102% of equity | None |
| AME.US | red: Goodwill 67% of equity | None |
| AMT.US | red: Capex 1.5× depreciation; red: Goodwill 336% of equity | neutral: Capex 1.5× depreciation, rising over 3 years |
| ANET.US | red: Capex 3.9× depreciation, rising | neutral: Capex 3.9× depreciation |
| AON.US | red: Goodwill 169% of equity | neutral: Capex 1.4× depreciation |
| APH.US | red: Capex 1.6× depreciation; red: Goodwill 79% of equity | neutral: Capex 1.6× depreciation |
| AVY.US | red: Goodwill 101% of equity | None |
| AXP.US | None | neutral: Capex 1.4× D&A, rising over 3 years |
| AZO.US | red: Capex 2.2× D&A, rising; red: Goodwill USD 302.6m, equity ≤ 0 | red: Capex 2.2× D&A, rising over 3 years |
| BALL.US | red: Goodwill 81% of equity | None |
| BDX.US | red: Goodwill 105% of equity | neutral: Capex 1.0× depreciation |
| BKNG.US | red: Goodwill USD 2.7bn, equity ≤ 0 | None |
| BMY.US | red: Capex 2.1× depreciation, rising; red: Goodwill 118% of equity | neutral: Capex 2.1× depreciation |
| BR.US | red: Goodwill 133% of equity | None |
| BRK-B.US | red: Capex 1.6× D&A | neutral: Capex 1.6× D&A |
| C.US | None | neutral: Capex 1.5× D&A |
| CAT.US | None | neutral: Capex 1.3× depreciation, rising over 3 years |
| CBOE.US | red: Capex 1.7× depreciation; red: Goodwill 61% of equity | neutral: Capex 1.7× depreciation |
| CBRE.US | red: Goodwill 79% of equity | None |
| CDNS.US | red: Goodwill 50% of equity | neutral: Capex 1.3× depreciation |
| CDW.US | red: Capex 2.4× depreciation; red: Goodwill 179% of equity | neutral: Capex 2.4× depreciation |
| CHD.US | red: Goodwill 66% of equity | neutral: Capex 1.4× depreciation |
| CHRW.US | red: Goodwill 79% of equity | None |
| CL.US | red: Goodwill 5781% of equity | None |
| CMI.US | red: Capex 1.6× depreciation | neutral: Capex 1.6× depreciation |
| COR.US | red: Goodwill 907% of equity | neutral: Capex 1.3× depreciation |
| COST.US | red: Capex 2.3× D&A | neutral: Capex 2.3× D&A, rising over 3 years |
| CPRT.US | red: Capex 1.7× depreciation | neutral: Capex 1.7× depreciation |
| CRH.US | red: Goodwill 55% of equity | neutral: Capex 1.4× depreciation |
| CRL.US | red: Goodwill 87% of equity | neutral: Capex 1.2× depreciation |
| CSCO.US | red: Capex 2.0× D&A, rising; red: Goodwill 118% of equity | red: Capex 2.0× D&A, rising over 3 years |
| CTAS.US | red: Goodwill 69% of equity | neutral: Capex 1.2× depreciation |
| DAL.US | red: Capex 1.8× D&A | neutral: Capex 1.8× D&A |
| DECK.US | None | neutral: Capex 1.1× depreciation |
| DGX.US | red: Goodwill 125% of equity | neutral: Capex 1.3× depreciation; red: Goodwill 55% of total assets |
| DHR.US | red: Capex 1.5× depreciation; red: Goodwill 82% of equity | neutral: Capex 1.5× depreciation; red: Goodwill 52% of total assets |
| DOV.US | red: Goodwill 73% of equity | neutral: Capex 1.3× depreciation |
| DPZ.US | red: Goodwill USD 10.7m, equity ≤ 0 | None |
| DRI.US | red: Goodwill 75% of equity | neutral: Capex 1.3× D&A |
| DVA.US | red: Goodwill USD 7.5bn, equity ≤ 0 | None |
| ECL.US | red: Capex 1.6× depreciation; red: Goodwill 94% of equity | neutral: Capex 1.6× depreciation |
| EFX.US | red: Goodwill 147% of equity | red: Goodwill 57% of total assets |
| ELV.US | red: Capex 11.9× depreciation; red: Goodwill 65% of equity | neutral: Capex 11.9× depreciation |
| EME.US | red: Capex 1.7× depreciation, rising | neutral: Capex 1.7× depreciation |
| EMR.US | red: Goodwill 90% of equity | neutral: Capex 1.3× depreciation |
| ETN.US | red: Capex 1.9× depreciation; red: Goodwill 81% of equity | neutral: Capex 1.9× depreciation, rising over 3 years |
| EW.US | red: Capex 1.8× depreciation | neutral: Capex 1.8× depreciation |
| FAST.US | None | neutral: Capex 1.5× depreciation, rising over 3 years |
| FDS.US | red: Capex 4.5× depreciation; red: Goodwill 59% of equity | red: Capex 4.5× depreciation, rising over 3 years |
| FERG.US | red: Capex 3.0× depreciation, rising | red: Capex 3.0× depreciation, rising over 3 years |
| FITB.US | red: Capex 9.0× depreciation, rising | neutral: Capex 9.0× depreciation, rising over 3 years |
| FIX.US | red: Capex 2.5× depreciation | neutral: Capex 2.5× depreciation |
| GD.US | red: Capex 1.7× depreciation, rising; red: Goodwill 82% of equity | neutral: Capex 1.7× depreciation |
| GEHC.US | red: Capex 1.7× depreciation, rising; red: Goodwill 130% of equity | neutral: Capex 1.7× depreciation |
| GL.US | red: Capex 4.7× depreciation, rising | neutral: Capex 4.7× depreciation, rising over 3 years |
| GNRC.US | red: Capex 1.8× depreciation; red: Goodwill 56% of equity | neutral: Capex 1.8× depreciation |
| GOOGL.US | red: Capex 4.3× depreciation, rising | red: Capex 4.3× depreciation, rising over 3 years |
| GPC.US | red: Goodwill 72% of equity | None |
| GPN.US | red: Goodwill 75% of equity | neutral: Capex 1.5× depreciation |
| GRMN.US | red: Capex 1.8× depreciation, rising | neutral: Capex 1.8× depreciation |
| GWW.US | red: Capex 4.0× depreciation, rising | red: Capex 4.0× depreciation, rising over 3 years |
| HCA.US | None | neutral: Capex 1.4× depreciation |
| HD.US | red: Goodwill 174% of equity | neutral: Capex 1.0× D&A |
| HLT.US | red: Goodwill USD 5.1bn, equity ≤ 0 | None |
| HON.US | red: Capex 1.8× depreciation; red: Goodwill 152% of equity | neutral: Capex 1.8× depreciation, rising over 3 years |
| HPE.US | red: Goodwill 96% of equity | neutral: Capex 1.0× depreciation |
| HSIC.US | red: Goodwill 130% of equity | neutral: Capex 1.4× depreciation |
| HSY.US | red: Goodwill 65% of equity | neutral: Capex 1.4× depreciation |
| HUBB.US | red: Capex 1.7× depreciation; red: Goodwill 80% of equity | neutral: Capex 1.7× depreciation |
| HWM.US | red: Capex 1.8× depreciation, rising; red: Goodwill 75% of equity | neutral: Capex 1.8× depreciation, rising over 3 years |
| ICE.US | red: Capex 1.9× depreciation; red: Goodwill 106% of equity | neutral: Capex 1.9× depreciation |
| IEX.US | red: Goodwill 85% of equity | None |
| IQV.US | red: Capex 3.8× depreciation; red: Goodwill 256% of equity | neutral: Capex 3.8× depreciation; red: Goodwill 55% of total assets |
| IT.US | red: Goodwill 857% of equity | None |
| ITW.US | None | neutral: Capex 1.3× depreciation |
| J.US | red: Goodwill 131% of equity | None |
| JBHT.US | None | neutral: Capex 1.0× D&A |
| JBL.US | red: Goodwill 56% of equity | None |
| JCI.US | red: Goodwill 129% of equity | None |
| JKHY.US | red: Capex 1.6× depreciation, rising | neutral: Capex 1.6× depreciation |
| KHC.US | red: Goodwill 53% of equity | neutral: Capex 1.1× depreciation |
| KLAC.US | red: Capex 1.8× depreciation | neutral: Capex 1.8× depreciation, rising over 3 years |
| KMB.US | red: Capex 1.5× depreciation, rising; red: Goodwill 122% of equity | neutral: Capex 1.5× depreciation |
| KMI.US | red: Goodwill 64% of equity | neutral: Capex 1.2× D&A, rising over 3 years |
| KO.US | red: Capex 2.2× depreciation | neutral: Capex 2.2× depreciation, rising over 3 years |
| KR.US | None | neutral: Capex 1.2× D&A |
| KVUE.US | red: Capex 1.6× depreciation, rising; red: Goodwill 88% of equity | neutral: Capex 1.6× depreciation |
| LDOS.US | red: Goodwill 129% of equity | None |
| LEN-B.US | None | neutral: Capex 1.4× D&A |
| LHX.US | red: Goodwill 102% of equity | None |
| LIN.US | red: Capex 1.6× depreciation, rising; red: Goodwill 73% of equity | neutral: Capex 1.6× depreciation, rising over 3 years |
| LMT.US | red: Capex 1.6× depreciation; red: Goodwill 168% of equity | neutral: Capex 1.6× depreciation |
| LOW.US | red: Goodwill USD 3.9bn, equity ≤ 0 | neutral: Capex 1.0× D&A |
| LRCX.US | red: Capex 2.5× depreciation | red: Capex 2.5× depreciation, rising over 3 years |
| LULU.US | None | neutral: Capex 1.4× depreciation |
| MA.US | red: Goodwill 124% of equity | None |
| MAR.US | red: Capex 4.2× depreciation; red: Goodwill USD 8.9bn, equity ≤ 0 | neutral: Capex 4.2× depreciation |
| MAS.US | red: Goodwill USD 623m, equity ≤ 0 | neutral: Capex 1.2× depreciation |
| MCD.US | red: Capex 2.1× depreciation, rising; red: Goodwill USD 3.4bn, equity ≤ 0 | neutral: Capex 2.1× depreciation |
| MCK.US | red: Capex 1.7× depreciation; red: Goodwill USD 11.3bn, equity ≤ 0 | neutral: Capex 1.7× depreciation |
| MCO.US | red: Goodwill 157% of equity | None |
| MDT.US | red: Capex 1.6× depreciation; red: Goodwill 86% of equity | neutral: Capex 1.6× depreciation |
| META.US | red: Capex 3.9× depreciation, rising | neutral: Capex 3.9× depreciation |
| MKC-V.US | red: Goodwill 92% of equity | neutral: Capex 1.4× depreciation |
| MLM.US | None | neutral: Capex 1.3× D&A |
| MNST.US | None | neutral: Capex 1.2× D&A |
| MPWR.US | red: Capex 3.4× depreciation | neutral: Capex 3.4× depreciation |
| MRK.US | None | neutral: Capex 1.4× depreciation |
| MSCI.US | red: Capex 1.7× depreciation; red: Goodwill USD 2.9bn, equity ≤ 0 | neutral: Capex 1.7× depreciation; red: Goodwill 51% of total assets |
| MSFT.US | red: Capex 3.4× depreciation, rising | red: Capex 3.4× depreciation, rising over 3 years |
| MSI.US | red: Goodwill 282% of equity | neutral: Capex 1.4× depreciation |
| MTD.US | red: Capex 2.1× depreciation; red: Goodwill USD 739.2m, equity ≤ 0 | neutral: Capex 2.1× depreciation |
| NDAQ.US | red: Capex 1.8× D&A, rising; red: Goodwill 118% of equity | neutral: Capex 1.8× D&A, rising over 3 years |
| NDSN.US | red: Goodwill 109% of equity | red: Goodwill 56% of total assets |
| NFLX.US | red: Capex 2.1× D&A, rising | red: Capex 2.1× D&A, rising over 3 years |
| NOC.US | red: Goodwill 105% of equity | None |
| NTAP.US | red: Goodwill 205% of equity | neutral: Capex 1.1× D&A, rising over 3 years |
| NUE.US | red: Capex 2.8× depreciation | neutral: Capex 2.8× depreciation |
| NVDA.US | red: Capex 2.5× depreciation | red: Capex 2.5× depreciation, rising over 3 years |
| ODFL.US | None | neutral: Capex 1.1× depreciation |
| ORCL.US | red: Capex 7.3× depreciation, rising; red: Goodwill 146% of equity | red: Capex 7.3× depreciation, rising over 3 years |
| ORLY.US | red: Capex 2.3× D&A; red: Goodwill USD 948.2m, equity ≤ 0 | neutral: Capex 2.3× D&A |
| OTEX.TO | red: Goodwill 183% of equity | red: Goodwill 56% of total assets |
| OTIS.US | red: Goodwill USD 1.7bn, equity ≤ 0 | neutral: Capex 1.3× depreciation |
| PAYX.US | red: Capex 1.6× depreciation; red: Goodwill 121% of equity | neutral: Capex 1.6× depreciation, rising over 3 years |
| PEP.US | red: Goodwill 93% of equity | neutral: Capex 1.4× depreciation |
| PG.US | None | neutral: Capex 1.4× D&A, rising over 3 years |
| PH.US | red: Goodwill 72% of equity | neutral: Capex 1.3× depreciation, rising over 3 years |
| PKG.US | None | neutral: Capex 1.4× depreciation |
| PM.US | red: Capex 1.6× depreciation; red: Goodwill USD 17.3bn, equity ≤ 0 | neutral: Capex 1.6× depreciation, rising over 3 years |
| PNR.US | None | neutral: Capex 1.2× depreciation; red: Goodwill 52% of total assets |
| PWR.US | red: Goodwill 82% of equity | neutral: Capex 1.5× depreciation |
| PYPL.US | red: Goodwill 54% of equity | neutral: Capex 1.1× depreciation, rising over 3 years |
| QSR.TO | red: Goodwill 174% of equity | neutral: Capex 1.3× depreciation, rising over 3 years |
| REGN.US | red: Capex 1.7× D&A | neutral: Capex 1.7× D&A |
| RMD.US | red: Capex 1.5× depreciation, rising | neutral: Capex 1.5× depreciation |
| ROL.US | red: Goodwill 100% of equity | None |
| ROP.US | red: Goodwill 107% of equity | red: Goodwill 62% of total assets |
| ROST.US | red: Capex 1.6× D&A | neutral: Capex 1.6× D&A |
| RSG.US | red: Goodwill 140% of equity | neutral: Capex 1.0× D&A |
| SBUX.US | red: Goodwill USD 3.4bn, equity ≤ 0 | neutral: Capex 1.3× D&A |
| SHW.US | red: Capex 2.3× depreciation; red: Goodwill 175% of equity | neutral: Capex 2.3× depreciation |
| STE.US | red: Capex 1.7× depreciation; red: Goodwill 58% of equity | neutral: Capex 1.7× depreciation |
| SYK.US | red: Capex 1.7× depreciation | neutral: Capex 1.7× depreciation |
| SYY.US | red: Goodwill 196% of equity | None |
| TDG.US | red: Goodwill USD 10.6bn, equity ≤ 0 | neutral: Capex 1.4× depreciation, rising over 3 years |
| TDY.US | red: Goodwill 83% of equity | red: Goodwill 57% of total assets |
| TEL.US | None | neutral: Capex 1.4× depreciation |
| TJX.US | red: Capex 1.6× D&A | neutral: Capex 1.6× D&A |
| TMO.US | red: Goodwill 92% of equity | neutral: Capex 1.5× depreciation |
| TPR.US | red: Goodwill 138% of equity | neutral: Capex 1.0× D&A, rising over 3 years |
| TRMB.US | red: Goodwill 90% of equity | red: Goodwill 56% of total assets |
| TXN.US | red: Capex 2.4× depreciation | neutral: Capex 2.4× depreciation |
| TYL.US | red: Goodwill 70% of equity | None |
| UHS.US | red: Capex 1.7× depreciation; red: Goodwill 55% of equity | neutral: Capex 1.7× depreciation, rising over 3 years |
| ULTA.US | None | neutral: Capex 1.4× D&A |
| UNH.US | red: Capex 3.6× depreciation | red: Capex 3.6× depreciation, rising over 3 years |
| UNP.US | red: Capex 1.5× depreciation | neutral: Capex 1.5× depreciation |
| URI.US | red: Goodwill 79% of equity | None |
| VMC.US | None | neutral: Capex 1.2× depreciation |
| VRSK.US | red: Goodwill 608% of equity | None |
| VRSN.US | red: Goodwill USD 52.5m, equity ≤ 0 | None |
| WAB.US | red: Goodwill 92% of equity | neutral: Capex 1.3× depreciation, rising over 3 years |
| WAT.US | red: Goodwill 52% of equity | neutral: Capex 1.3× depreciation |
| WCN.TO | red: Goodwill 102% of equity | neutral: Capex 1.1× depreciation |
| WKL.AS | red: Goodwill 600% of equity | None |
| WM.US | red: Goodwill 139% of equity | neutral: Capex 1.1× D&A |
| WMT.US | red: Capex 1.9× D&A | neutral: Capex 1.9× D&A, rising over 3 years |
| WSM.US | None | neutral: Capex 1.1× D&A, rising over 3 years |
| WST.US | red: Capex 1.7× depreciation | neutral: Capex 1.7× depreciation |
| XYL.US | red: Goodwill 73% of equity | neutral: Capex 1.2× depreciation |
| YUM.US | red: Capex 1.8× D&A, rising | neutral: Capex 1.8× D&A |
| ZTS.US | red: Capex 1.9× depreciation; red: Goodwill 83% of equity | neutral: Capex 1.9× depreciation |

## Verification

- **Consistency:** 2,709 published dossiers; all 13,150 Pass/Fail quality verdicts derive from the displayed rule text and measurements. 1,522 finite IRRs reprice their cash flows to the quote; 31 cash-covered cases are explicit. The model discounted at the required return equals the published midpoint. The 60-company cohort expanded with all buys contains 64 entries: 63 published pages pass, and SIRI.US is correctly unpublished/404. All 22 buys are included.
- **Design and phrases:** `2,320` canonical page/drawer/chart/filter states plus `556` additional states for GOOGL, KO, LULU and APO; zero layout, clipping, overflow, console or gap-phrase issues. Viewports: 1728×970, 2056×1180 and 390×844. All desktop base pages are one screen. Fresh six-company screenshot check: 18/18 pass. Source phrase scan found no remaining cash-yield-plus-growth return definition in active method/application code.
- **Independent arithmetic:** Python independently reproduces value, buy price and IRR for 11 cases: the six requested companies, JPM, INVE-B, III, and both newly added buys.
- **Production build:** exit 0; 8,219 pages generated into `.next`.
- **TypeScript:** `npx tsc --noEmit`, exit 0.
- **Vitest:** 153 files, 1,687 tests pass.
- **Live Playwright:** all 64 tests pass, including shared tile/drawer numbers, exact cash-flow inputs, requested wording, cash-covered prices, list sorting, desktop fit, mobile fit and phrase scans.
- **Broader fixture Playwright:** 15 pass, **8 fail identically on both `b01220d` and this branch**; 257 opt-in tests are skipped in the default baseline run. These existing failures are listed below; this is not a claim that the entire legacy suite is green.
- **Knip:** exit 1 with the **same eight existing findings**, no additions: `candidates`, `relatedPages`, `discoverWikiIdentity`; types `ForwardObservation`, `ForwardPortfolio`, `ForwardPick`, `HumanTest`, `PublicJudgement`.
- **Calibrate:** exit 0; 10 true positives, 16 true negatives, zero false positives/negatives or unclear results; 2 missing cases and 8 labelled exceptions. No published quality verdict changes.
- **Buffett-check:** exit 0; all calibration and purchase-summary objects identical to the baseline. 195 purchase events, 125 with price, 60 with valuations, 69 complete quality cases, 18 quality passes; 2 purchases at buy price and 5 within 20%, unchanged. Holdout: 1 buy and 1 within 20%, unchanged. All seven regretted purchases remain outside the buy set. Financial-check buy decisions and filing-lag buy decisions are unchanged; corrected returns and capped financial ranges change as intended. The 38,153-company corpus comparison is an internal v1/v2 experiment, not the published buy-list diff.
- **Repository:** `git diff --check` passes. No push/deployment/remote publication. Disk remained above 5 GiB.

The eight unchanged legacy Playwright failures:

- `tests/e2e/search.spec.ts:3:5 › main search retains shortcuts, ranked results and keyboard navigation`
- `tests/e2e/value-round-seven.spec.ts:21:5 › time travel replaces quality and prices, restores URL state and never shows current rows on missing history`
- `tests/e2e/value-round-seven.spec.ts:40:5 › new identity fields render and a broken logo has a readable fallback`
- `tests/e2e/value-round-seven.spec.ts:48:5 › historical quality includes companies absent from today’s default index`
- `tests/e2e/value-round-seven.spec.ts:83:5 › phone Method panel exposes the five current method sections`
- `tests/e2e/value.spec.ts:13:5 › quality map, near misses, filters and current-price table`
- `tests/e2e/value.spec.ts:46:5 › paged table reaches every row and preserves sorting without page scroll`
- `tests/e2e/value.spec.ts:80:5 › panel chart keyboard controls and visible year-by-year data`

## Reproduction and artifacts

Run from the worktree. All paths below are local.

```sh
npx tsx scripts/value/consistency-refresh.ts
VALUE_SITE_HOST=localhost VALUE_STORE_DIR="$PWD/.audit/staging/store" npm run build
VALUE_SITE_HOST=localhost VALUE_STORE_DIR="$PWD/.audit/staging/store" npm run start -- --port 3017
npx tsx scripts/value/consistency-audit.ts http://localhost:3017 .audit/staging
QA_SCREENSHOTS=base QA_PAGE_SAMPLE=1 node scripts/value/design-qa.mjs http://localhost:3017 .audit/staging/design-qa
npx tsc --noEmit
npm test
VALUE_AUDIT=1 VALUE_DESIGN_16=1 BASE_URL=http://localhost:3017 npx playwright test value-consistency.spec.ts value-round-sixteen.spec.ts --workers=1 --output=.audit/staging/playwright-final
npx knip
npm run value -- calibrate --existing
VALUE_CHECK_INDEX="$PWD/.audit/staging/store/index" VALUE_BUFFETT_OUT="$PWD/.audit/staging/buffett-check" npm run value -- buffett-check
```

Frozen snapshots: `.audit/staging/before.json`, `after.json`, `buy-diff.json`; full per-company rendered evidence: `.audit/staging/consistency/`; design states and screenshots: `.audit/staging/design-qa/`; six-company screenshots: `.audit/staging/qa-base/`; calibration and test logs: `.audit/staging/*.log`. Staged data is not committed or remotely published. Historical forward observations are preserved; new observations use method 3.2.0.

Final desktop screenshots: [GOOGL.US](/Users/miki/GitHub/superinvestors-wt/value-ze-consistency/.audit/staging/qa-base/1728x970_googl_us-00-page.png), [KO.US](/Users/miki/GitHub/superinvestors-wt/value-ze-consistency/.audit/staging/qa-base/1728x970_ko_us-00-page.png), [AAPL.US](/Users/miki/GitHub/superinvestors-wt/value-ze-consistency/.audit/staging/qa-base/1728x970_aapl_us-00-page.png), [LULU.US](/Users/miki/GitHub/superinvestors-wt/value-ze-consistency/.audit/staging/qa-base/1728x970_lulu_us-00-page.png), [WKL.AS](/Users/miki/GitHub/superinvestors-wt/value-ze-consistency/.audit/staging/qa-base/1728x970_wkl_as-00-page.png), [ACN.US](/Users/miki/GitHub/superinvestors-wt/value-ze-consistency/.audit/staging/qa-base/1728x970_acn_us-00-page.png).
