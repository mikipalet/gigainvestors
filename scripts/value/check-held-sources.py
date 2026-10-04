"""Reproducible second-source sample; missing evidence is never a passing check."""
import concurrent.futures
import datetime as dt
import json
import os
from pathlib import Path
import random
import urllib.request

root = Path(os.environ.get('VALUE_CORPUS_DIR', str(Path.home() / 'data/value-cover')))
out = root / 'held-validation'
(out / 'raw').mkdir(parents=True, exist_ok=True)
manifest = out / 'sample.json'
if manifest.exists():
    sample = json.loads(manifest.read_text())
else:
    candidates = [id for id in json.loads((root / 'held-membership/additions.json').read_text())
                  if (root / f'fundamentals/{id}.json').exists()]
    sample = random.Random(20261004).sample(sorted(candidates), 20)
    manifest.write_text(json.dumps(sample) + '\n')

def get(url, file):
    if file.exists():
        return json.loads(file.read_text())
    req = urllib.request.Request(url, headers={'User-Agent': 'GigaInvestors research hello@gigainvestors.com'})
    with urllib.request.urlopen(req, timeout=40) as response:
        data = json.load(response)
    file.write_text(json.dumps(data) + '\n')
    return data

prices = {}
for directory in ['prices', 'publish-repo/prices']:
    for file in (root / directory).glob('*.json'):
        if len(file.stem) == 2:
            prices.update(json.loads(file.read_text()))

def check(id):
    result = {'id': id, 'checks': [], 'errors': []}
    f = json.loads((root / f'fundamentals/{id}.json').read_text())
    c = json.loads((root / f'companies/{id}.json').read_text())
    year = f['years'][-1] if f['years'] else None
    cik = c.get('cik')
    if cik and year:
        url = f'https://data.sec.gov/api/xbrl/companyfacts/CIK{int(cik):010d}.json'
        result['filingSource'] = url
        try:
            raw = get(url, out / f'raw/{id}-sec.json')
            # Total revenues include rents/interest that the contracts-only tag omits.
            revenue_tags = ['RevenuesExcludingInterestAndDividends', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'Revenues', 'SalesRevenueNet', 'Revenue']
            if id == 'CBL.US':
                # CBL's contracts tag is only the non-rental revenue component.
                revenue_tags = ['Revenues', *revenue_tags]
            for field, tags, unit in [('revenue', revenue_tags, year.get('currency', f.get('currency', 'USD'))),
                                      ('dilutedShares', ['WeightedAverageNumberOfDilutedSharesOutstanding', 'AdjustedWeightedAverageShares', 'WeightedAverageNumberOfSharesOutstandingBasic'], 'shares')]:
                candidates = []
                for tag in tags:
                    candidates = [(tag, x) for ns, namespace in raw['facts'].items() if ns in ['us-gaap', 'ifrs-full']
                                  for x in namespace.get(tag, {}).get('units', {}).get(unit, [])
                                  if x.get('form') in ['10-K', '10-K/A', '20-F', '40-F'] and x.get('start')
                                  and 330 <= (dt.date.fromisoformat(x['end']) - dt.date.fromisoformat(x['start'])).days <= 400
                                  and abs((dt.date.fromisoformat(x['end']) - dt.date.fromisoformat(year['end'])).days) <= 7]
                    if candidates:
                        break
                observation = sorted(candidates, key=lambda x: x[1].get('filed', ''), reverse=True)[0] if candidates else None
                value = year.get(field)
                reference = observation[1]['val'] if observation else None
                split_factor = 1
                if field == 'dilutedShares':
                    for split in f.get('splits', []):
                        if split['date'] > year['end']:
                            split_factor *= split['factor']
                    if reference is not None:
                        reference *= split_factor
                result['checks'].append({'field': field, 'period': year['end'], 'value': value, 'reference': reference,
                                         'splitFactor': split_factor, 'inputProvenance': year.get('provenance', {}).get(field),
                                         'source': url, 'fact': observation,
                                         'match': value is not None and reference is not None and abs(value-reference) <= max(1, abs(reference)*.005)})
        except Exception as error:
            result['errors'].append(f'SEC: {type(error).__name__}')
    else:
        result['errors'].append('No CIK or annual period; independent filing evidence pending')
    quote = prices.get(id)
    if quote and (len(quote) < 3 or quote[2] != 'seed'):
        day = dt.datetime.fromisoformat(quote[1][:10]).replace(tzinfo=dt.timezone.utc)
        start, end = int((day-dt.timedelta(days=3)).timestamp()), int((day+dt.timedelta(days=2)).timestamp())
        url = f'https://query1.finance.yahoo.com/v8/finance/chart/{id[:-3]}?period1={start}&period2={end}&interval=1d'
        try:
            chart = get(url, out / f'raw/{id}-yahoo.json')['chart']['result'][0]
            points = {dt.datetime.fromtimestamp(t, dt.timezone.utc).date().isoformat(): v
                      for t, v in zip(chart['timestamp'], chart['indicators']['quote'][0]['close']) if v is not None}
            reference = points.get(quote[1][:10])
            result['checks'].append({'field': 'price', 'date': quote[1], 'value': quote[0], 'reference': reference,
                                     'currency': chart['meta'].get('currency'), 'source': url,
                                     'match': reference is not None and abs(quote[0]-reference) <= max(.01, abs(reference)*.001)})
        except Exception as error:
            result['errors'].append(f'Yahoo: {type(error).__name__}')
    else:
        result['errors'].append('No cached real close; EODHD price request pending')
    result['passed'] = len(result['checks']) == 3 and all(c['match'] for c in result['checks']) and not result['errors']
    (out / f'{id}.json').write_text(json.dumps(result, indent=2) + '\n')
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(check, sample))
(out / 'second-source.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps({'sample': len(sample), 'passed': sum(r['passed'] for r in results),
                  'unexplainedChecks': sum(not c['match'] for r in results for c in r['checks']),
                  'sourceFailures': sum(bool(r['errors']) for r in results)}))
