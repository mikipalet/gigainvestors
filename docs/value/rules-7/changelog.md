3.7.1 — 8 October 2026

3.7.1 is method 3.7.0 (evolve-1: earnings-resilience rename, and capital allocation judged on per-share economic progress) plus the data fixes below. Those fixes were first reviewed as 3.6.1 on the 3.6.0 baseline. 3.6.1 never published: method 3.7.0 shipped first. The 3.7.0 rules are unchanged here; only inputs and publication behaviour change.

Owner, 2026-10-08 07:25: "dont' hold it, if the data changes, u change that too". Buy verdicts now follow the computed data in releases and in the nightly run. There is no approval manifest and no complete-record preservation for a Buy change. Data-correctness guards stay: calibration, coverage/logo, issuer aliases and distinct issuers, share checks, the pending-publication receipt, and verdict-change attribution logging (`staging/verdict-changes.json`).

Numbers change, so 3.7.0 moves to 3.7.1:

- Primary-filing statement corrections (`lib/value/completeness/rules-7-facts.json`): IPS.PA FY2025 gross profit EUR 1,710.992m (vendor reclassification gave 504.184m); 000786.SHE FY2025 revenue, gross profit, OCF and SBC, plus FY2024 SBC; SIQ.AU FY2024–25 OCF, SBC, capex and diluted shares; 300760.SHE FY2025 SBC and FY2024 gross profit; 600519.SHG FY2021–23 revenue/gross profit and FY2023 OCF; 0700.HK FY2021/2023/2024 SBC and FY2024 capex.
- Distinct issuers use SEC ticker-map CIKs (`secCik` in `issuer-registry.json`), not stale vendor CIKs. Vendor data gave RBC.US Regal Rexnord's CIK 82811, gave BATRA.US and LLYVA.US Liberty Media's 1560385, and gave APA.US Apache's 6769. Wrong-issuer SEC filings and XBRL facts are excluded and flagged in the record, never applied, and they no longer fail the company. BATRA.US, LLYVA.US and RBC.US now read their own 10-Ks. APA.AU, MRK.XETRA and ARG.PA are read from the issuer description. FWONA.US and RRX.US keep their own filings, which the 3.6.0 check had wrongly rejected. 001800.KO uses the Korean Orion Holdings annual report instead of the US Orion Group Holdings 10-K.
- When a fresh reading is needed, a company keeps its current-method prior analysis unless that analysis cites another issuer's filing.
- If a history-return price provider has a gap, the company's last cached split-adjusted closes are used and named in the log. A company with no cached closes at all still stops publication.

Freeze: 110 of 151 ids are unfrozen. 41 stay frozen, each for a specific unresolved data error (see `evidence/verdict-freeze.json` and `freeze-review.json`).
