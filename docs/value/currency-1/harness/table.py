"""currency-1: one decision per company that any currency signal touched.
Inputs: the independent sweep (sweep.json: filing facts, report text, market plausibility),
the rule preview over current analysis years (preview.json), and the live-vs-candidate
publication diff (publication-diff.json). Usage: python3 -I table.py <sweep> <preview> <diff> <out.json>"""
import json, sys
sweep, preview, diff, out = sys.argv[1:5]
S = {r['id']: r for r in json.load(open(sweep))['rows']}
P = {r['id']: r for r in json.load(open(preview))}
D = {r['id']: r for r in json.load(open(diff))}
# Reviewed by hand against the filing or the price/share inputs (report section "Market screen").
REVIEWED = {
 'JBS.US': ('Data error, analysis fixed; page frozen', 'FY2025 vendor amounts are reais under a USD label (revenue 471.1bn vs US$86.2bn in the 2025 20-F, 5.47×; assets 5.5×). The rule drops FY2025 (reais are not JBS N.V.\'s home currency); the analysis now ends at FY2024 (USD 77.2bn). The published page is held at its 2026-10-08 bytes by the corpus verdict freeze (undecided record), so it still reads USD 471.1 billion until the owner lifts the freeze, which would remove JBS from the site.'),
 '0881.HK': ('Not a currency error', 'CNY statements match the CNY label; the extreme ratios come from the HK$2.47 price (vendor and Yahoo agree).'),
 'HAPV3.SA': ('Not a currency error', 'BRL statements and BRL listing; ratios reflect the depressed price and share basis.'),
 '1T5.MU': ('Not a currency error', 'PLN statements under a PLN label; the Munich share basis (482m of 1.75bn shares) inflates the yields.'),
 '0H2Z.LSE': ('Not a currency error', 'SEK statements and SEK quote; share basis (180m) differs from the issuer count (outlier-1 follow-up).'),
 'PAH3.XETRA': ('Not a currency error', 'EUR statements; share basis counts preference shares only.'),
 'PTEC.LSE': ('Not a currency error', 'EUR statements under a EUR label, GBX quote converted; FY2025 profit includes the Snaitech disposal gain.'),
 'TPRO.MI': ('Not a currency error', 'EUR statements; the screen used an unscaled share count.'),
 'WLN.PA': ('Not a currency error (share count follow-up)', 'EUR statements; valuation share count 7.0m against about 283m issued shares — a share-basis issue, not currency.'),
 'TMPV.NSE': ('Not a currency error', 'INR statements; demerger year profit.'),
 '5706.JP': ('Not a currency error', 'JPY statements; post-report split handled in 3.8.1.'),
 '543A.JP': ('Not a currency error', 'JPY statements; broken share count (0.999 shares), value already unavailable.'),
 '6919.TW': ('Vendor balance sheets in another currency; now rejected (no published figure used them)', '2026 quarterly balance sheets are 31× the FY2025 TWD statement (US-dollar amounts under a TWD label); not used. No value was published (pre-revenue).'),
 'QFIN.US': ('Not a currency error', 'CNY statements equal the 20-F; lender already flagged in 3.8.1.'),
 'BLSH.US': ('Not a currency error', 'USD statements equal the 20-F; revenue is gross digital-asset sales.'),
 'AERO.US': ('Not a currency error', 'USD statements equal the 20-F.'),
 'KZIA.US': ('Not a currency error', 'AUD statements of a pre-revenue biotech.'),
 'MEDCL.PA': ('Not a currency error', 'EUR statements of a pre-revenue biotech.'),
 'IVA.PA': ('Not a currency error', 'EUR statements equal the 20-F; pre-revenue biotech.'),
 'EOG.US': ('Not a currency error', 'Report text cites C$ amounts (Canadian operations); statements equal the USD 10-K.'),
 'ET.US': ('Not a currency error', 'Report text cites C$ amounts; statements equal the USD 10-K.'),
 'SUN.US': ('Not a currency error', 'Report text cites C$ amounts; statements equal the USD 10-K.'),
 'IFS.US': ('Not a currency error', 'Statements equal the PEN 20-F; the text cites dollar amounts.'),
 'MSB.AU': ('Not a currency error', 'Statements equal the USD 20-F; the text cites A$ amounts.'),
 'TBN.US': ('Not a currency error', 'Statements equal the USD 10-K; the text cites A$ amounts.'),
 'FMX.US': ('Data error, fixed', 'FY2024 mixes currencies (balance sheet = the MXN 20-F, income 0.05× it, i.e. dollars) and is left out; FY2025 amounts are the 20-F US-dollar convenience translation under a USD label. One-year record before and after.'),
 'EXO.AS': ('Not a currency error', 'EUR statements (ESEF); the report text cites dollar amounts of subsidiaries.'),
 'XNDU.US': ('Unclear (flagged)', 'CAD label (sales CAD 4.6m); the 20-F XBRL facts in the corpus (assets US$1.8m) belong to the pre-merger listing shell, so no filing can confirm the currency. Not valued (one year), not a Buy.'),
}
rows = []
for i in sorted(set(D) | set(P) | {k for k, r in S.items() if r.get('mktFlags')} | set(REVIEWED) & set(S)):
    s, p, d = S.get(i, {}), P.get(i, {}), D.get(i)
    sec = sorted({m['unit'] for m in (s.get('signals', {}).get('sec') or []) if m['kind'] == 'equal'})
    signals = []
    if sec: signals.append('filing facts in ' + '/'.join(sec))
    if s.get('textCurrency'): signals.append('report text ' + s['textCurrency'])
    if s.get('mktFlags'): signals.append('market ' + ','.join(s['mktFlags']))
    if p.get('relabelled'): signals.append('relabel ' + ', '.join(f"FY{x['fy']}→{x['currency']}" for x in p['relabelled']))
    if p.get('dropped'): signals.append('mixed/contradicted FY' + ','.join(str(x['fy']) for x in p['dropped']))
    if p.get('balanceRejected'): signals.append(f"{len(p['balanceRejected'])} balance sheets off-scale")
    if i in REVIEWED: decision, evidence = REVIEWED[i]
    elif d: decision, evidence = 'Data error, fixed', ' '.join(d['currencyNotes'])[:600] or f"Reporting currency {d['reportingCurrency'][0]} → {d['reportingCurrency'][1]}"
    elif p.get('dropped') or p.get('relabelled'): decision, evidence = 'Data error, fixed (history)', ' '.join(x['reason'] for x in p['dropped'])[:600]
    elif p.get('balanceRejected'): decision, evidence = 'Vendor balance sheets in another currency; now rejected (no published figure used them)', p['balanceRejected'][0][:300]
    else: decision, evidence = 'Not a currency error', 'Statements match their label; the market screen hit reflects price, share basis or losses.'
    rows.append({'id': i, 'name': s.get('name') or (d or {}).get('name'), 'label': s.get('label'), 'listing': s.get('listing'), 'filing': s.get('kind'),
                 'signals': signals, 'decision': decision, 'evidence': evidence,
                 'buy': (d or {}).get('buy'), 'value': (d or {}).get('v'), 'currencyShown': (d or {}).get('reportingCurrency'), 'memo1': (d or {}).get('memo1')})
json.dump(rows, open(out, 'w'), indent=1)
print(len(rows), 'rows')
