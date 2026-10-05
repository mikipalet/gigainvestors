import json,pathlib,collections
out=pathlib.Path('docs/value/dedupe-2');p=pathlib.Path('/Users/miki/data/value-dedupe-2/audit');r=json.load(open('lib/value/issuer-registry.json')); a=json.load(open(p/'audit-coverage.json'));raw=json.load(open(p/'identity-records.json'));figi=json.load(open('/Users/miki/data/value-dedupe/audit/figi-gaps.json'))
manual={
'CFG-PH.US':{'cik':'759944','source':'https://www.sec.gov/Archives/edgar/data/759944/000075994426000028/cfg-20251231.htm','detail':'Series H preferred and CFG common registered by same issuer; only preferred dossier present.'},
'ORBIA.MX':{'isin':'MX01OR010004','source':'https://www.orbia.com/investor-relations/new-ticker/'},
'0H2Z.LSE':{'isin':'SE0017832488','source':'https://www.balder.se/en/about-balder/press/05192022-0800/balder-performs-share-split--6-1--and-resolves-record-date','listingSource':'https://www.londonstockexchange.com/market-stock/0H2Z/fastighets-ab-balder/trade-recap'},
'TTST.LSE':{'isin':'US87656Y4061','underlying':'INE081A01020','source':'https://citiadr.factsetdigitalsolutions.com/stocks/profile.idms?cusip=87656Y406&pageId=15&subpageID=151'}}
accepted={id:g['canonical'] for g in r['groups'] for id in g['ids']}; rejected={tuple(sorted((accepted.get(x,x),accepted.get(y,y)))) for g in r['rejected'] for x in g['ids'] for y in g['ids'] if x!=y}
for c in a['candidateSignals']:
 c['unresolved']=[(x,y) for x,y in c['unresolved'] if tuple(sorted((accepted.get(x,x),accepted.get(y,y)))) not in rejected]
keys=collections.defaultdict(set)
for id,c in a['coverage'].items():
 c['figi']=raw.get(id,{}).get('OpenFigi')
 if id in figi and figi[id].get('data'):c['openFigiMapping']=figi[id]['data'];c['source']='https://api.openfigi.com/v3/mapping'
 if id in manual:c.update(manual[id])
 for k in ['isin','lei','cik','figi']:
  if c.get(k):keys[(k,str(c[k]).lstrip('0') if k=='cik' else c[k])].add(id)
 for m in c.get('openFigiMapping',[]):
  for k in ['figi','compositeFIGI','shareClassFIGI']:
   if m.get(k):keys[('figi',m[k])].add(id)
a['missingIdentity']=[id for id,c in a['coverage'].items() if not any(c.get(k) for k in ['isin','lei','cik','figi','edinet','reviewedIssuer','openFigiMapping'])]
a['unresolvedSignals']=[c for c in a['candidateSignals'] if c['unresolved']]
a['newFigiCollisions']=[{'key':key,'ids':sorted(ids)} for key,ids in keys.items() if len(ids)>1 and any(id in figi or id in manual for id in ids) and len({accepted.get(id,id) for id in ids})>1]
(out/'audit-coverage.json').write_text(json.dumps(a,indent=2)+'\n');(out/'identity-gap-sources.json').write_text(json.dumps({'openFigi':figi,'issuerSources':manual},indent=2)+'\n')
print('missing',a['missingIdentity'],'unresolved',len(a['unresolvedSignals']),'new collisions',a['newFigiCollisions'])
assert not a['missingIdentity'] and not a['unresolvedSignals'] and not a['newFigiCollisions']
