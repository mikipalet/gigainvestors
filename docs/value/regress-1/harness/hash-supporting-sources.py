"""Bind supporting identities, share checks, reviews and publication inputs too."""
import json,hashlib
from pathlib import Path
r=Path.home()/'data/regress';c=r/'corpus'
prefixes=['companies','enrichment-v7','flags','business-fit','index-membership','held-membership','prices','price-story','thesis','raw/market-caps','raw/buffett-check','raw/esef','raw/india','raw/yahoo-fundamentals','raw/sec-submissions','raw/prices']
sources={}
for prefix in prefixes:
 for p in(c/prefix).rglob('*'):
  if p.is_file():
   h=hashlib.sha256()
   with p.open('rb')as f:
    for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
   sources[str(p.relative_to(c))]=h.hexdigest()
for name in ['universe.jsonl','verdict-freeze.json']:
 p=c/name;sources[name]=hashlib.sha256(p.read_bytes()).hexdigest()
(r/'evidence/supporting-source-hashes.json').write_text(json.dumps(sources,separators=(',',':'))+'\n');print('Supporting inputs:',len(sources))
