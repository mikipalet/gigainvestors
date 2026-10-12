"""fairbuy-1: Buy list before (live 3.7.1 archive) and after (3.8.0 candidate) on the same corpus.
Usage: python3 compare-buys.py <baseline store> <candidate store> <out.json>"""
import json, sys
from pathlib import Path

def load(store):
    store = Path(store); rows = {}; prices = {}
    for f in sorted((store / 'index').glob('[A-Z][A-Z].json')):
        for r in json.loads(f.read_text()): rows[r['id']] = r
    for f in sorted((store / 'prices').glob('*.json')): prices.update(json.loads(f.read_text()))
    meta = json.loads((store / 'meta.json').read_text())
    return rows, prices, meta

base, bp, bm = load(sys.argv[1]); cand, cp, cm = load(sys.argv[2])
buys = lambda rows: {i for i, r in rows.items() if r.get('b') is True}
B, C = buys(base), buys(cand)
western = lambda rows, ids: {i for i in ids if rows[i].get('w') is not None}

def why_added(i):
    old, new, q = base.get(i), cand[i], cp.get(i)
    if old is None: return 'newly published company'
    reasons = []
    t = old.get('t', '')
    if t[:1] == 'F' and t[1:] == 'PPPP': reasons.append('earnings resilience failed (no longer a Buy gate)')
    elif t != 'PPPPP': reasons.append(f'quality code changed {t} -> {new.get("t")}')
    if old.get('v') and q:
        mid, m = old['v'][1], old.get('m') or 0
        ratio = q[0] / mid if mid else None
        if t == 'PPPPP' and ratio is not None and mid * (1 - m) < q[0] <= mid: reasons.append(f'price between the old buy price ({round(100*m)}% discount) and central value')
        elif t == 'PPPPP' and ratio is not None and q[0] <= mid * (1 - m): reasons.append('below the old buy price but failed the old return hurdle or a data check')
    if old.get('businessChanged') and not new.get('businessChanged'): reasons.append('thesis disclosure resolved')
    return '; '.join(reasons) or 'other (inputs or quote changed)'

def why_removed(i):
    old, new = base[i], cand.get(i)
    if new is None: return 'not published by the candidate'
    if new.get('pr') == 'F': return 'profit record fails (loss years, negative mean operating margin or non-positive owner earnings)'
    if new.get('pr') == 'U': return 'profit record unavailable (no bound statements)'
    if new.get('businessChanged'): return 'thesis disclosure'
    if new.get('t') != old.get('t'): return f'quality code changed {old.get("t")} -> {new.get("t")}'
    q = cp.get(i)
    if new.get('v') and q and q[0] > new['v'][1]: return 'price above central value'
    if not new.get('v'): return 'valuation unavailable or data check'
    return 'other'

added = sorted(C - B); removed = sorted(B - C)
by_reason = lambda f, ids: {r: sorted(i for i in ids if f(i) == r) for r in sorted({f(i) for i in ids})}
out = {
    'baseline': {'method': bm.get('methodVersion'), 'asOf': bm.get('asOf'), 'buys': len(B), 'westernBuys': len(western(base, B)), 'qualityPasses': bm.get('story', {}).get('qualityPasses')},
    'candidate': {'method': cm.get('methodVersion'), 'asOf': cm.get('asOf'), 'buys': len(C), 'westernBuys': len(western(cand, C)), 'qualityPasses': cm.get('story', {}).get('qualityPasses'), 'westernQualityPasses': cm.get('western', {}).get('story', {}).get('qualityPasses')},
    'added': len(added), 'removed': len(removed), 'kept': len(B & C),
    'addedByReason': by_reason(why_added, added), 'removedByReason': by_reason(why_removed, removed),
    'addedWestern': sorted(western(cand, set(added))), 'removedWestern': sorted(i for i in removed if base[i].get('w') is not None),
    'candidateBuys': sorted(C), 'candidateFunnel': [[g['key'], g['passing']] for g in cm['funnel']['gates']],
    'candidateWesternFunnel': [[g['key'], g['passing']] for g in cm['western']['funnel']['gates']],
}
Path(sys.argv[3]).write_text(json.dumps(out, indent=1) + '\n')
print(json.dumps({k: out[k] for k in ['baseline', 'candidate', 'added', 'removed', 'kept']}))
print('added by reason:', {r: len(v) for r, v in out['addedByReason'].items()})
print('removed by reason:', {r: v for r, v in out['removedByReason'].items()})
