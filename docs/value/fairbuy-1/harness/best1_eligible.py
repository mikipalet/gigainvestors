"""fairbuy-1: dump best-1's own eligible sets per quarter (the tested rule), straight from
best-1's frozen harness (docs/value/best-1/harness/best.py, imported unchanged).

Usage: VALUE_RESEARCH_ROOT=<root> python3 best1_eligible.py <best-1 harness dir> <out.json>
<root> is a research-1 root whose inputs/history holds bench-1's replayed 3.7.1 frames
(bench-1/evidence/frames-3.7.1.tar.gz), as best-1 ran.
"""
import json, sys
sys.path.insert(0, sys.argv[1])
import best as b
h, c = b.h, b.c

out = {'panels': {}, 'scopes': {}, 'rows': {}, 'counts_check': {}}
fund_ids = set()
for panel, (qs, scope, idx) in b.PANELS.items():
    P = {}
    for q in qs:
        F = c.frame(q, scope)
        P[q] = sorted(i for i, r in F.items() if b.eligible(i, r))
        out['scopes'].setdefault(panel, {})[q] = sorted(F)
        rows = out['rows'].setdefault(q, {})
        for i, r in F.items():
            rows[i] = {'t': r[1], 'fy': h.basis(r), 'financial': bool(c.a.financial(i))}
            fund_ids.add(i)
    out['panels'][panel] = P
# Reproduce best-1's published eligibility counts (best.json counts.eligible_mean).
counts = b.counts()
out['counts_check'] = {p: counts[p]['eligible_mean'] for p in counts}
out['fundamentals'] = {i: [h.years(i)[f] for f in sorted(h.years(i))] for i in sorted(fund_ids)}
json.dump(out, open(sys.argv[2], 'w'))
print(json.dumps({'panels': {p: sum(len(v) for v in P.values()) for p, P in out['panels'].items()}, 'counts': out['counts_check']}))
