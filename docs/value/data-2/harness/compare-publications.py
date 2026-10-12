"""data-2: the bound live publication (63fad7cb, method 3.8.1) against the 3.8.2 candidate,
company by company: Buy, value, tests, reporting currency, the business line and history.
Usage: python3 -I compare-publications.py <live store> <candidate store> <out.json>"""
import json, os, sys, collections
live, cand, out = sys.argv[1:4]
def rows(store):
    r = {}
    for f in os.listdir(f'{store}/index'):
        if f != 'default.json':
            for x in json.load(open(f'{store}/index/{f}')): r[x['id']] = x
    return r
def dossiers(store):
    d = {}
    for f in os.listdir(f'{store}/dossiers'): d.update(json.load(open(f'{store}/dossiers/{f}')))
    return d
def memo(d, q):
    return next((l.get('answer') for l in ((d.get('ownerMemo') or {}).get('lines') or []) if l.get('question') == q), None)
L, C, DL, DC = rows(live), rows(cand), dossiers(live), dossiers(cand)
changes = []
for i in sorted(set(L) | set(C)):
    a, b, da, db = L.get(i, {}), C.get(i, {}), DL.get(i, {}), DC.get(i, {})
    notes = [e['note'] for e in db.get('events') or [] if e.get('kind') == 'currency_change' and e['note'].startswith('Statement currency changed')]
    rec = {'id': i, 'name': b.get('n') or a.get('n'), 'western': b.get('w') is not None,
           'buy': [a.get('b'), b.get('b')], 'v': [a.get('v'), b.get('v')], 'cur': [a.get('cur'), b.get('cur')], 't': [a.get('t'), b.get('t')],
           'reportingCurrency': [da.get('reportingCurrency'), db.get('reportingCurrency')],
           'valuationCurrency': [(da.get('valuation') or {}).get('currency'), (db.get('valuation') or {}).get('currency')],
           'history': [(da.get('historyCoverage') or {}).get('years'), (db.get('historyCoverage') or {}).get('years')],
           'memo1': [memo(da, 1), memo(db, 1)], 'memo3': [memo(da, 3), memo(db, 3)], 'currencyNotes': notes,
           'flags': [a.get('dataQualityFlags'), b.get('dataQualityFlags')], 'retained': [(da.get('valuation') or {}).get('retainedPublishedAt'), (db.get('valuation') or {}).get('retainedPublishedAt')]}
    if (rec['buy'][0] != rec['buy'][1] or rec['v'][0] != rec['v'][1] or rec['t'][0] != rec['t'][1] or rec['reportingCurrency'][0] != rec['reportingCurrency'][1]
            or rec['memo1'][0] != rec['memo1'][1] or rec['memo3'][0] != rec['memo3'][1] or rec['history'][0] != rec['history'][1] or notes or i not in L or i not in C):
        changes.append(rec)
json.dump(changes, open(out, 'w'), indent=1)
buys = lambda R, w=False: sorted(i for i, x in R.items() if x.get('b') is True and (not w or x.get('w') is not None))
print(json.dumps({'live': len(L), 'candidate': len(C), 'changed': len(changes), 'currencyChanged': sum(1 for c in changes if c['currencyNotes'] or c['reportingCurrency'][0] != c['reportingCurrency'][1]),
                  'buysLive': len(buys(L)), 'buysCandidate': len(buys(C)), 'westernLive': len(buys(L, True)), 'westernCandidate': len(buys(C, True)),
                  'buyRemoved': sorted(set(buys(L)) - set(buys(C))), 'buyAdded': sorted(set(buys(C)) - set(buys(L)))}, indent=1))
