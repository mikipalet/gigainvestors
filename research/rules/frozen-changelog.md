# Proposed method 3.5.0 — frozen experiments, not yet accepted

Frozen before candidate-return evaluation on 2026-10-06; baseline is 3.4.0 at `78141da`.

- Understandable candidate: one positive operating-margin dip may pass the existing variability bar when it fully recovers the next year, stays recovered, and holding that year at its preceding margin brings CV≤0.35. Require the complete, consecutive, positive-margin, loss-free 7–10-year record. Preserve raw CV and all price conservatism.
- Moat candidate: replace permanently dated FY2023 stress with typical (7–10-year median) versus recent (lower of latest margin and last-three median) gross margin, retaining the 4pp limit and all capital-return bars.
- Each candidate and their combination must pass the owner's fixed non-inferiority and newly-passing loser gates in `research/rules/protocol.json`. This proposed changelog does not represent shipped acceptance. No other quality, financial or valuation threshold changes are proposed.
