"""Reproducible second-source sample; missing evidence is never a passing check."""
import concurrent.futures
import datetime as dt
import json
import os
from pathlib import Path
import random
import urllib.request

root = Path(os.environ.get('VALUE_CORPUS_DIR', str(Path.home() / 'data/value-cover')))
out = Path(os.environ.get('VALUE_SOURCE_EVIDENCE_DIR', str(root / 'held-validation')))
(out / 'raw').mkdir(parents=True, exist_ok=True)
manifest = json.loads(Path(os.environ.get('VALUE_SOURCE_SAMPLE', str(out / 'cover-2-sample.json'))).read_text())
sample = manifest['ids'] if 'ids' in manifest else manifest['old'] + manifest['new']
if len(sample) != len(set(sample)):
    raise SystemExit('Second-source sample contains duplicate IDs')
bases = json.loads(Path(os.environ.get('VALUE_SOURCE_BASES', 'docs/value/held-coverage-evidence/cover-2/source-bases.json')).read_text())

# Independent HTML reader: original SEC inline facts, not pipeline-normalized
# evidence. Explicit dimensions come from reviewed listing/share-class identity.
from html.parser import HTMLParser
class Inline(HTMLParser):
    def __init__(self):
        super().__init__(); self.active=[]; self.items=[]
    def handle_starttag(self, tag, attrs):
        if tag in ['br','hr','img','meta','link','input','wbr']:return
        for item in self.active:
            item['depth']+=1; item['nested'].append((tag,dict(attrs)))
        # A single displayed EPS amount can carry nested basic and diluted tags.
        if tag in ['xbrli:context','xbrli:unit','ix:nonfraction']:
            self.active.append({'tag':tag,'attrs':dict(attrs),'nested':[],'parts':[],'depth':1})
    def handle_endtag(self, tag):
        for item in self.active:item['depth']-=1
        self.items.extend(item for item in self.active if item['depth']==0)
        self.active=[item for item in self.active if item['depth']>0]
    def handle_data(self, text):
        for item in self.active:item['parts'].append(text)

def filing_facts(id, meta):
    path=out/f'raw/{id}-annual.html'
    if not path.exists():return None
    parser=Inline(); parser.feed(path.read_text()); contexts={}; units={}; facts={}
    for item in parser.items:
        a=item['attrs']; parts=[p.strip() for p in item['parts'] if p.strip()]
        if item['tag']=='xbrli:context':
            dates=[p for p in parts if __import__('re').fullmatch(r'\d{4}-\d{2}-\d{2}',p)]
            members=[(t,v) for t,v in item['nested'] if t.endswith(':explicitmember')]
            dimension_sets=bases.get(id,{}).get('shareDimensionSets') or [bases.get(id,{}).get('shareDimensions',{})]
            dimensioned=bool(members)
            group=next((i for i,allowed in enumerate(dimension_sets) if dimensioned and len(members)==len(allowed) and all(v.get('dimension') in allowed for t,v in members) and set(allowed.values()).issubset(parts)),None)
            if dates:contexts[a['id']]={'start':dates[0] if len(dates)==2 else None,'end':dates[-1],'dimensioned':dimensioned,'valid':group is not None,'group':group}
        elif item['tag']=='xbrli:unit':
            names=[p.split(':')[-1] for p in parts]
            if len(names)==1:units[a['id']]=names[0]
            elif len(names)==2:units[a['id']]='/'.join(names)
    for item in parser.items:
        if item['tag']!='ix:nonfraction':continue
        a=item['attrs']; ctx=contexts.get(a.get('contextref'));unit=units.get(a.get('unitref'));name=a.get('name','').split(':')
        if not ctx or not unit or len(name)!=2 or name[0] not in ['us-gaap','ifrs-full'] or a.get('xsi:nil')=='true':continue
        if ctx['dimensioned'] and (not ctx['valid'] or 'WeightedAverage' not in name[1]):continue
        try:val=float(''.join(item['parts']).replace(',','').strip())*10**int(a.get('scale','0'))*(-1 if a.get('sign')=='-' else 1)
        except ValueError:continue
        if unit.lower().endswith('commonunits'):unit='shares'
        facts.setdefault(name[0],{}).setdefault(name[1],{'units':{}})['units'].setdefault(unit,[]).append({'val':val,'start':ctx['start'],'end':ctx['end'],'form':meta['kind'],'filed':meta['filed'],'accn':meta['url'].split('/')[-2],**({'shareGroup':ctx['group']} if ctx['dimensioned'] else {})})
    # Sum only explicitly reviewed, disjoint share classes. Duplicate appearances
    # of a fact must agree; every specified class must be present for the period.
    sets=bases.get(id,{}).get('shareDimensionSets',[])
    if sets:
        for tags in facts.values():
            for tag,data in tags.items():
                for unit,rows in data['units'].items():
                    groups={}
                    for row in rows:
                        if 'shareGroup' in row:groups.setdefault((row['start'],row['end']),{}).setdefault(row['shareGroup'],[]).append(row)
                    kept=[row for row in rows if 'shareGroup' not in row]
                    for classes in groups.values():
                        if set(classes)!=set(range(len(sets))) or any(len({r['val'] for r in xs})!=1 for xs in classes.values()):continue
                        parts=[classes[i][0] for i in range(len(sets))]
                        total={k:v for k,v in parts[0].items() if k!='shareGroup'}
                        total.update(val=sum(r['val'] for r in parts),components=[{'dimensions':sets[i],'value':r['val']} for i,r in enumerate(parts)])
                        kept.append(total)
                    data['units'][unit]=kept
    return {'facts':facts}

def get(url, file):
    if file.exists():
        return json.loads(file.read_text())
    req = urllib.request.Request(url, headers={'User-Agent': 'GigaInvestors research hello@gigainvestors.com'})
    with urllib.request.urlopen(req, timeout=40) as response:
        data = json.load(response)
    file.write_text(json.dumps(data) + '\n')
    return data

def reviewed_field(id, field, year):
    """Explicitly reviewed annual table/narrative evidence, never a missing-fact pass."""
    proof = bases.get(id, {}).get('reviewedFields', {}).get(field)
    if not proof or proof.get('period') != year['end']:
        return None
    unit = 'shares' if field == 'dilutedShares' else year.get('currency')
    file = out / 'raw' / proof.get('file', '')
    if (proof.get('currency') != unit or not file.is_file()
            or file.resolve().parent != (out / 'raw').resolve()
            or not isinstance(proof.get('value'), (int, float))
            or not __import__('math').isfinite(proof['value'])
            or not proof.get('source', '').startswith('https://') or not proof.get('anchors')):
        return None
    body = file.read_bytes()
    if __import__('hashlib').sha256(body).hexdigest() != proof.get('sha256'):
        return None
    normalize = lambda text: ' '.join(text.split())
    text = normalize(body.decode())
    if any(not anchor or normalize(anchor) not in text for anchor in proof['anchors']):
        return None
    return {'reference': proof['value'], 'source': proof['source'],
            'referenceBasis': proof['referenceBasis'], 'reviewedEvidence': proof}

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
    meta=json.loads((root/f'reports/{id}/meta.json').read_text())
    cik = c.get('cik') or (__import__('re').search(r'/data/(\d+)/',meta.get('url') or '') or [None,None])[1]
    # A complete, independently hash-bound original annual table is a primary
    # source path, not a fallback that requires an unrelated SEC transport.
    reviewed_complete = year and all(reviewed_field(id, field, year) for field in ['revenue', 'dilutedShares'])
    result['sourceStrategy'] = 'hash-bound original annual tables' if reviewed_complete else 'SEC facts with optional reviewed fields'
    if cik and year and meta['kind'] != 'ESEF' and not reviewed_complete:
        url = f'https://data.sec.gov/api/xbrl/companyfacts/CIK{int(cik):010d}.json'
        result['filingSource'] = url
        try:
            raw = get(url, out / f'raw/{id}-sec.json')
            # Total revenues include rents/interest that the contracts-only tag omits.
            revenue_tags = ['Revenues','RevenuesNetOfInterestExpense','RevenuesExcludingInterestAndDividends', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'SalesRevenueNet', 'Revenue','RevenueFromContractsWithCustomers']
            if bases.get(id,{}).get('revenueConcept'):revenue_tags=[bases[id]['revenueConcept']]
            inline=filing_facts(id,meta)
            if inline:
                for ns, tags in inline['facts'].items():
                    raw['facts'].setdefault(ns,{})
                    for tag, data in tags.items():
                        for unit,rows in data['units'].items():
                            raw['facts'][ns].setdefault(tag,{'units':{}})['units'].setdefault(unit,[]).extend(rows)
            for field, tags, unit in [('revenue', revenue_tags, year.get('currency', f.get('currency', 'USD'))),
                                      ('dilutedShares', ['WeightedAverageNumberOfDilutedSharesOutstanding', 'AdjustedWeightedAverageShares', 'WeightedAverageLimitedPartnershipUnitsOutstandingDiluted', 'WeightedAverageShares', 'WeightedAverageNumberOfShareOutstandingBasicAndDiluted', 'WeightedAverageNumberOfSharesOutstandingBasic'], 'shares')]:
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
                referenceBasis='annual consolidated revenue' if field=='revenue' else 'annual weighted average diluted shares'
                if field=='dilutedShares' and observation and observation[0]=='WeightedAverageShares':
                    def annual_eps(tag):
                        xs=[x for x in raw['facts'].get('ifrs-full',{}).get(tag,{}).get('units',{}).get(f"{year['currency']}/shares",[]) if x.get('start')==observation[1]['start'] and x.get('end')==observation[1]['end']]
                        return sorted(xs,key=lambda x:x.get('filed',''),reverse=True)[0]['val'] if xs else None
                    basic,diluted=annual_eps('BasicEarningsLossPerShare'),annual_eps('DilutedEarningsLossPerShare')
                    if basic is None or basic!=diluted:reference=None
                    else:referenceBasis+='; reported basic and diluted EPS equal'
                if field=='dilutedShares' and observation and observation[0]=='WeightedAverageNumberOfSharesOutstandingBasic' and not (year.get('netIncome') is not None and year['netIncome']<0):
                    reference=None
                if field=='revenue' and c.get('sector')=='Financial Services':
                    def annual(tag):
                        return [x for x in raw['facts'].get('us-gaap',{}).get(tag,{}).get('units',{}).get(year['currency'],[]) if x.get('end')==year['end'] and x.get('start') and 330<=(dt.date.fromisoformat(x['end'])-dt.date.fromisoformat(x['start'])).days<=400 and x.get('form') in ['10-K','20-F','40-F']]
                    interest,other=annual('InterestIncomeExpenseNet'),annual('NoninterestIncome')
                    if interest and other:
                        pair=[sorted(xs,key=lambda x:x.get('filed',''),reverse=True)[0] for xs in [interest,other]]
                        reference=sum(x['val'] for x in pair);observation=['InterestIncomeExpenseNet + NoninterestIncome',pair];referenceBasis='annual net interest plus noninterest revenue'
                if field=='dilutedShares' and bases.get(id,{}).get('ordinaryPerAds'):
                    if reference is not None:reference/=bases[id]['ordinaryPerAds']
                    referenceBasis+=f" / {bases[id]['ordinaryPerAds']} ordinary shares per ADS"
                split_factor = 1
                if field == 'dilutedShares':
                    for split in f.get('splits', []):
                        if split['date'] > year['end']:
                            split_factor *= split['factor']
                    if reference is not None:
                        reference *= split_factor
                result['checks'].append({'field': field, 'period': year['end'], 'value': value, 'reference': reference,
                                         'splitFactor': split_factor, 'inputProvenance': year.get('provenance', {}).get(field),
                                         'source': meta['url'] if inline else url, 'fact': observation, 'referenceBasis':referenceBasis,
                                         'match': value is not None and reference is not None and abs(value-reference) <= max(1, abs(reference)*.005)})
        except Exception as error:
            result['errors'].append(f'SEC: {type(error).__name__}')
    elif not bases.get(id, {}).get('reviewedFields'):
        result['errors'].append('No CIK or annual period; independent filing evidence pending')
    if year:
        for field in ['revenue', 'dilutedShares']:
            if field not in bases.get(id, {}).get('reviewedFields', {}):
                continue
            reviewed = reviewed_field(id, field, year)
            if reviewed is None:
                result['errors'].append(f'{field}: reviewed source proof invalid')
                continue
            value, reference = year.get(field), reviewed['reference']
            result['checks'] = [c for c in result['checks'] if c['field'] != field]
            result['checks'].append({'field': field, 'period': year['end'], 'value': value,
                                    **reviewed, 'inputProvenance': year.get('provenance', {}).get(field),
                                    'match': value is not None and abs(value-reference) <= max(1, abs(reference)*.005)})
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
                                     'inputCurrency':c.get('currency'),'currencyMatch':chart['meta'].get('currency')==c.get('currency'),
                                     'match': reference is not None and chart['meta'].get('currency')==c.get('currency') and abs(quote[0]-reference) <= max(.01, abs(reference)*.001)})
        except Exception as error:
            result['errors'].append(f'Yahoo: {type(error).__name__}')
    else:
        result['errors'].append('No cached real close; EODHD price request pending')
    result['passed'] = len(result['checks']) == 3 and all(c['match'] for c in result['checks']) and not result['errors']
    (out / f'{id}.json').write_text(json.dumps(result, indent=2) + '\n')
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(check, sample))
(out / ('second-source.json' if 'VALUE_SOURCE_SAMPLE' in os.environ else 'cover-2-second-source.json')).write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps({'sample': len(sample), 'passed': sum(r['passed'] for r in results),
                  'unexplainedChecks': sum(not c['match'] for r in results for c in r['checks']),
                  'sourceFailures': sum(bool(r['errors']) for r in results)}))
if not results or any(not r['passed'] for r in results):
    raise SystemExit(1)
