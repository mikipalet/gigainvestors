# Method 3.5.0 — rules judge the record, not one bad year

The proposed entries below were frozen before candidate-return evaluation on 2026-10-06; baseline is 3.4.0 at `78141da`.

- Understandable candidate: one positive operating-margin dip may pass the existing variability bar when it fully recovers the next year, stays recovered, and holding that year at its preceding margin brings CV≤0.35. Require the complete, consecutive, positive-margin, loss-free 7–10-year record. Preserve raw CV and all price conservatism.
- Moat candidate: replace permanently dated FY2023 stress with typical (7–10-year median) versus recent (lower of latest margin and last-three median) gross margin, retaining the 4pp limit and all capital-return bars.
- Each candidate and their combination must pass the owner's fixed non-inferiority and newly-passing loser gates in `research/rules/protocol.json`. This proposed changelog does not represent shipped acceptance. No other quality, financial or valuation threshold changes are proposed.

## Accepted after frozen evaluation

Both candidates and the combination pass every required portfolio and newly-passing loser-dominance gate. See `research/rules/outputs/decision-metrics.json`; US 2016–2026 is contaminated and excluded from acceptance. Production 3.5.0 implements the frozen candidates exactly. This is a retrospective principle correction with qualified measurement, not proof of future investment edge. The proposed pre-evaluation text is preserved in `research/rules/frozen-changelog.md`.

The analysis fingerprint now includes the method version, so unchanged source inputs are re-evaluated when a rule implementation changes. This does not change the pipeline data contract or the frozen numerical candidates. As with any threshold change, production publication requires a successful analysis run first; this task performs no live run or publication.

The ordinary export also exposed a historical-identity retention bug: a retired listing already present in a prediction frame could lose its label metadata. The publisher now restores existing published identities for every historical row, preserving every prediction and return. This prerequisite is applied identically to both local proof arms and has a failing-then-passing regression test; it is not a third investment-rule experiment.
