"""currency-1 sweep: does the currency label on each published company's figures
match the currency the amounts are actually in?  Read-only over ~/value-corpus.

Independent (non-EODHD) signals:
  SEC   filing facts (companyfacts / 20-F, 40-F inline facts) carry an ISO unit;
        vendor amount == filing amount in unit U  =>  amounts are in U.
  EDGAR / EDINET / ESEF report kind (EDINET is always JPY).
  TEXT  the annual report's own statement of presentation currency.
  MKT   price x shares (Yahoo price) against earnings, sales and book under the label.
Supporting (vendor-internal) signals: per-statement labels, cross-statement net income,
FX-sized jumps between consecutive years.
Usage: python3 -I sweep.py <corpus> <out.json>
"""
import json, math, os, re, sys, collections
corpus, out = sys.argv[1], sys.argv[2]
J = lambda p: json.load(open(os.path.join(corpus, p)))
def opt(p):
    try: return J(p)
    except Exception: return None

usd = {'USD': 1.0}
for f in os.listdir(f'{corpus}/raw/eodhd/universe'):
    m = re.match(r'fx-([A-Z]{3})\.json$', f)
    if m:
        d = J(f'raw/eodhd/universe/{f}')
        try: usd[m.group(1)] = float(d['data'][0]['close'])
        except Exception: pass
def major(c):
    c = (c or '').upper() if c != 'GBp' else 'GBX'
    return {'GBX': 'GBP', 'ZAC': 'ZAR', 'ILA': 'ILS'}.get(c, c)
def per_unit(c):  # USD per one unit of c (minor units divided)
    m = major(c); r = usd.get(m)
    if r is None: return None
    return r / (100 if (c or '').upper() in ('GBX', 'ZAC', 'ILA') or c == 'GBp' else 1)
def fx(a, b):  # multiply an amount in a to get b
    x, y = per_unit(a), per_unit(b)
    return x / y if x and y else None

published = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else None
prices = {}
for f in os.listdir(f'{corpus}/publish-repo/prices'):
    prices.update(J(f'publish-repo/prices/{f}'))

REV = ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet', 'Revenue',
       'RevenueFromContractsWithCustomers', 'RevenueFromSaleOfGoods']
NI = ['NetIncomeLoss', 'ProfitLossAttributableToOwnersOfParent', 'ProfitLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic']
TA = ['Assets']
EQ = ['StockholdersEquity', 'EquityAttributableToOwnersOfParent', 'Equity']
FIELDS = {'revenue': REV, 'netIncome': NI, 'totalAssets': TA, 'equity': EQ}

def sec_facts(i):
    out = []
    for p in (f'raw/sec-companyfacts/{i}.json', f'raw/sec-annual/{i}.json'):
        d = opt(p)
        if not d: continue
        facts = d.get('facts', {})
        if 'facts' in facts: facts = facts['facts']
        for ns, concepts in facts.items():
            if not isinstance(concepts, dict): continue
            for field, names in FIELDS.items():
                for name in names:
                    c = concepts.get(name)
                    if not c: continue
                    for unit, rows in c.get('units', {}).items():
                        if not re.fullmatch(r'[A-Z]{3}', unit): continue
                        for r in rows:
                            if r.get('form') not in ('10-K', '20-F', '40-F', '10-K/A', '20-F/A', '40-F/A'): continue
                            if field in ('revenue', 'netIncome'):
                                s, e = r.get('start'), r.get('end')
                                if not s or not e: continue
                                days = (int(e[:4]) - int(s[:4])) * 365 + (int(e[5:7]) - int(s[5:7])) * 30
                                if not 330 <= days <= 400: continue
                            out.append((field, r['end'], unit, r['val'], name, p.split('/')[1]))
    return out

def close(a, b, tol):
    return a and b and abs(a / b - 1) <= tol

CUR_WORDS = [
    ('USD', r'(?:u\.?s\.?\s?dollars?|us\s?\$|usd|united states dollars?)'),
    ('EUR', r'(?:euros?\b|eur\b|€)'), ('GBP', r'(?:pounds? sterling|gbp\b|£)'),
    ('BRL', r'(?:brazilian reais|reais|r\$|brl\b)'), ('CNY', r'(?:renminbi|rmb\b|cny\b)'),
    ('HKD', r'(?:hong kong dollars?|hk\$|hkd\b)'), ('CAD', r'(?:canadian dollars?|c\$|cad\b)'),
    ('AUD', r'(?:australian dollars?|a\$|aud\b)'), ('CHF', r'(?:swiss francs?|chf\b)'),
    ('SEK', r'(?:swedish kron|sek\b)'), ('NOK', r'(?:norwegian kron|nok\b)'), ('DKK', r'(?:danish kron|dkk\b)'),
    ('JPY', r'(?:japanese yen|jpy\b|¥)'), ('KRW', r'(?:korean won|krw\b|₩)'), ('INR', r'(?:indian rupees?|inr\b|₹)'),
    ('MXN', r'(?:mexican pesos?|mxn\b)'), ('SGD', r'(?:singapore dollars?|s\$|sgd\b)'), ('NZD', r'(?:new zealand dollars?|nz\$|nzd\b)'),
    ('ZAR', r'(?:south african rand|zar\b)'), ('TWD', r'(?:new taiwan dollars?|nt\$|twd\b)'),
    ('CLP', r'(?:chilean pesos?|clp\b)'), ('COP', r'(?:colombian pesos?|cop\b)'), ('ARS', r'(?:argentine pesos?|ars\b)'),
    ('PEN', r'(?:soles\b|pen\b)'), ('PLN', r'(?:zloty|pln\b)'), ('ILS', r'(?:shekels?|nis\b|ils\b)'),
]
SCALE = r'(?:millions?|thousands?|billions?|mn\b|m\b|bn\b|k\b|000s?)'
def text_currency(i):
    """Presentation currency stated by the report: 'expressed in millions of US dollars',
    'in thousands of euros', '(US$ million)', '€m'. Counts phrases tied to a scale word."""
    counts = collections.Counter()
    for name in ('notes.txt', 'mdna.txt', 'business.txt', 'auditor.txt'):
        p = f'{corpus}/reports/{i}/{name}'
        if not os.path.exists(p): continue
        t = open(p, errors='ignore').read()[:400000].lower()
        for code, w in CUR_WORDS:
            n = len(re.findall(rf'(?:in|of|expressed in|presented in|amounts in|figures in)\s+{SCALE}\s+(?:of\s+)?{w}', t))
            n += len(re.findall(rf'\(\s*{w}\s*{SCALE}', t)) + len(re.findall(rf'{w}\s?{SCALE}\b', t))
            n += 3 * len(re.findall(rf'(?:presentation|functional|reporting) currency (?:of the group |of the company )?is (?:the )?{w}', t))
            if n: counts[code] += n
    return counts

CANDIDATES = {'USD', 'EUR', 'GBP', 'BRL', 'CNY', 'HKD', 'JPY', 'KRW', 'INR', 'MXN', 'ARS', 'PEN', 'CLP', 'COP', 'ZAR', 'TWD', 'RUB', 'TRY', 'IDR', 'KZT', 'SEK', 'NOK', 'DKK', 'CHF', 'AUD', 'CAD', 'PLN'}
rows = []
for i in published:
    f = opt(f'fundamentals/{i}.json'); co = opt(f'companies/{i}.json') or {}
    a = opt(f'analysis/{i}.json') or {}
    meta = opt(f'reports/{i}/meta.json') or {}
    inp = opt(f'analysis/inputs/{i}.json') or {}
    ys = inp.get('memoYears') or (f or {}).get('years') or []
    if not ys: continue
    last = ys[-1]
    L = a.get('reportingCurrency') or inp.get('reportingCurrency') or (f or {}).get('currency') or ''
    C = co.get('currency') or ''
    r = {'id': i, 'name': co.get('name'), 'label': L, 'listing': C, 'kind': meta.get('kind'), 'source': co.get('source'),
         'fy': last.get('fy'), 'yearLabels': [y.get('currency') for y in ys[-6:]], 'signals': {}}
    # SEC facts: per year/field, which unit matches the vendor amount
    sec = sec_facts(i); matches = []
    byend = {y['end']: y for y in ys[-8:]}
    for field, end, unit, val, name, src in sec:
        for yend, y in byend.items():
            if abs((int(end[:4]) * 372 + int(end[5:7]) * 31 + int(end[8:10])) - (int(yend[:4]) * 372 + int(yend[5:7]) * 31 + int(yend[8:10]))) > 12: continue
            v = y.get(field)
            if not v or not val: continue
            ratio = v / val
            if close(v, val, .01): matches.append({'fy': y['fy'], 'field': field, 'unit': unit, 'label': y.get('currency'), 'kind': 'equal', 'src': src})
            else:
                for X in CANDIDATES | {y.get('currency') or L, C}:
                    k = fx(unit, X)
                    if k and major(X) != major(unit) and abs(math.log(k)) > math.log(1.6) and abs(ratio / k - 1) <= .15:
                        matches.append({'fy': y['fy'], 'field': field, 'unit': unit, 'label': y.get('currency'), 'kind': 'converted', 'to': X, 'ratio': round(ratio, 3), 'fx': round(k, 3), 'src': src})
    if matches:
        seen = {}
        for m in matches: seen[(m['fy'], m['field'], m['kind'], m['unit'])] = m
        r['signals']['sec'] = sorted(seen.values(), key=lambda m: (m['fy'], m['field']))
        bad = [m for m in seen.values() if m['kind'] == 'equal' and major(m['unit']) != major(m['label'] or L)]
        conv = [m for m in seen.values() if m['kind'] == 'converted' and major(m['to']) != major(m['label'] or L)
                and not any(e['fy'] == m['fy'] and e['field'] == m['field'] and e['kind'] == 'equal' and major(e['unit']) == major(m['label'] or L) for e in seen.values())]
        r['secConvertedMislabel'] = sorted({(m['fy'], m['field'], m['unit'], m['to'], m['label']) for m in conv})
        r['secMislabel'] = sorted({(m['fy'], m['unit'], m['label']) for m in bad})
        r['secUnits'] = sorted({m['unit'] for m in seen.values() if m['kind'] == 'equal'})
    if co.get('source') == 'edinet' or meta.get('kind') == 'EDINET': r['signals']['edinet'] = 'JPY'
    tc = text_currency(i)
    if tc:
        top = tc.most_common(3); r['signals']['text'] = top
        r['textCurrency'] = top[0][0] if top[0][1] >= 3 and (len(top) == 1 or top[0][1] >= 2 * top[1][1]) else None
    # market plausibility under the label
    p = prices.get(i); sh = (a.get('valuation') or {}).get('shares') or last.get('dilutedShares') or last.get('sharesOutstanding')
    k = fx(L, C)
    if p and sh and k:
        cap = p[0] * sh  # listing currency
        def yld(x): return None if x is None or not cap else x * k / cap
        r['mkt'] = {'cap': cap, 'E/P': yld(last.get('netIncome')), 'S/P': yld(last.get('revenue')), 'B/P': yld(last.get('equity'))}
        bad = []
        ep, sp, bp = r['mkt']['E/P'], r['mkt']['S/P'], r['mkt']['B/P']
        if ep is not None and ep > .6: bad.append('E/P>0.6')
        if bp is not None and bp > 8: bad.append('B/P>8')
        if sp is not None and sp > 30: bad.append('S/P>30')
        if sp is not None and bp is not None and sp < .02 and bp < .02: bad.append('S/P,B/P<0.02')
        r['mktFlags'] = bad
        if bad:
            alts = {}
            for X in sorted(CANDIDATES | {C}):
                kx = fx(X, C)
                if not kx: continue
                e = (last.get('netIncome') or 0) * kx / cap; s_ = (last.get('revenue') or 0) * kx / cap; b = (last.get('equity') or 0) * kx / cap
                score = int(-.6 <= e <= .6) + int(.02 <= s_ <= 30) + int(.02 <= b <= 8)
                alts[X] = score
            here = alts.get(L, 0); better = [X for X, sc in alts.items() if sc > here and sc == 3]
            r['mktBetter'] = better
    # vendor-internal: per-statement labels and cross-statement net income
    raw = opt(f'raw/eodhd/{i}.json')
    if raw and isinstance(raw.get('Financials'), dict):
        fin = raw['Financials']; inc = fin.get('Income_Statement', {}).get('yearly', {}) or {}
        bal = fin.get('Balance_Sheet', {}).get('yearly', {}) or {}; cf = fin.get('Cash_Flow', {}).get('yearly', {}) or {}
        cross = []; labels = []
        for y in ys[-6:]:
            e = y['end']; ri, rb, rc = inc.get(e) or {}, bal.get(e) or {}, cf.get(e) or {}
            labels.append((y['fy'], ri.get('currency_symbol'), rb.get('currency_symbol'), rc.get('currency_symbol')))
            try:
                a1, b1 = float(ri.get('netIncome')), float(rc.get('netIncome'))
                if a1 and b1 and abs(a1) > 0 and (abs(a1 / b1) > 1.6 or abs(b1 / a1) > 1.6): cross.append((y['fy'], round(b1 / a1, 2)))
            except Exception: pass
        r['statementLabels'] = labels; r['crossNetIncome'] = cross
    # FX-sized jumps between consecutive years (revenue and total assets move together)
    jumps = []
    for y0, y1 in zip(ys[-7:], ys[-6:]):
        for fld in ('revenue', 'totalAssets'):
            v0, v1 = y0.get(fld), y1.get(fld)
            if v0 and v1 and v0 > 0 and v1 > 0 and (v1 / v0 > 3 or v0 / v1 > 3): jumps.append((y1['fy'], fld, round(v1 / v0, 2)))
    r['jumps'] = jumps
    rows.append(r)
json.dump({'fxUsdPerUnit': usd, 'rows': rows}, open(out, 'w'), indent=0, default=str)
print(len(rows), 'companies')
