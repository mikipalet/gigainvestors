import json,hashlib,shutil
from pathlib import Path
root=Path.home()/'data/value-holds';out=root/'evidence/holds-2/second-source';(out/'raw').mkdir(parents=True,exist_ok=True)
urls=json.loads(Path('docs/value/holds-1/pdf-sources.json').read_text());bases=json.loads(Path('docs/value/holds-1/source-bases.json').read_text())
adr='https://www.heinekenholding.com/investors/share-information/american-depository-receipts'
rows=[('CFRUY.US','CFRHF','2026-03-31','EUR',22420e6,5896e6,['22 420'],['589.6'],'Annual A-share equivalent diluted shares / 0.1 ordinary shares per ADR; depositary https://citiadr.factsetdigitalsolutions.com/stocks/profile.idms?cusip=204319107'),('CNSWF.US','CNSWF','2025-12-31','USD',11623e6,21191530,['11,623'],['Basic and diluted shares outstanding','21,191,530'],'Annual basic and diluted shares; no adjustment for separate Lumine distribution'),('HEINY.US','HEINY','2025-12-31','EUR',28753e6,557024742*2,['28,753'],['557,024,742'],'Annual diluted ordinary shares × 2 ADRs per ordinary; '+adr),('HKHHF.US','HKHHF','2025-12-31','EUR',28753e6,281111034,['28,753'],['281,111,034'],'Annual diluted ordinary shares'),('HKHHY.US','HKHHF','2025-12-31','EUR',28753e6,281111034*2,['28,753'],['281,111,034'],'Annual diluted ordinary shares × 2 ADRs per ordinary; '+adr),('OGC.US','OGC','2025-12-31','USD',1893.2e6,233.5e6,['1,893.2'],['233.5'],'Annual weighted diluted shares; 2025 one-for-three consolidation already reflected'),('PIFYF.US','PIFYF','2025-12-31','CAD',(158182+5624)*1000,358581e3,['158,182','5,624'],['358,581'],'Annual weighted diluted shares; loss-year anti-dilution')]
for id,doc,period,currency,revenue,shares,ra,sa,basis in rows:
 body=(root/'downloads'/f'{doc}.txt').read_bytes();shutil.copyfile(root/'downloads'/f'{doc}.txt',out/'raw'/f'{doc}.txt');sha=hashlib.sha256(body).hexdigest();proofs={}
 for field,value,anchors,unit,definition in [('revenue',revenue,ra,currency, 'Net revenue excluding excise duties' if doc in ['HEINY','HKHHF'] else 'Commodity sales net of royalties plus processing; excludes separately disclosed commodity-contract gains' if doc=='PIFYF' else 'Annual consolidated revenue'),('dilutedShares',shares,sa,'shares',basis)]:
  assert all(' '.join(a.split()) in ' '.join(body.decode().split()) for a in anchors)
  proofs[field]=dict(period=period,currency=unit,value=value,source=urls[doc],file=f'{doc}.txt',sha256=sha,anchors=anchors,referenceBasis=definition)
 bases[id]=dict(reviewedFields=proofs)
for id,base in bases.items():
 for proof in base['reviewedFields'].values():
  p=root/'downloads'/proof['file']
  if p.exists():shutil.copyfile(p,out/'raw'/proof['file'])
for id in set(json.loads(Path('docs/value/holds-2/source-sample.json').read_text())['ids']+json.loads(Path('docs/value/holds-1/source-sample.json').read_text())['ids']):
 p=root/'evidence/prices'/f'{id}.json'
 if p.exists():shutil.copyfile(p,out/'raw'/f'{id}-yahoo.json')
 # Cached original SEC/inline evidence for TOST remains independent.
 for suffix in ['sec.json','annual.html']:
  p=root/'evidence/second-source/raw'/f'{id}-{suffix}'
  if p.exists():shutil.copyfile(p,out/'raw'/p.name)
Path('docs/value/holds-2/source-bases.json').write_text(json.dumps(bases,indent=2)+'\n')
print('New seeded sample primary table proofs prepared')
