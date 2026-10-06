"""Read-only integrity verification; does not authorize or install the bundle."""
import json,hashlib,tarfile
from pathlib import Path
r=Path.home()/'data/regress';b=r/'release-bundle';m=json.loads((b/'manifest.json').read_text())
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
assert m['status']=='NOT'
for name,want in m['artifacts'].items():assert digest(b/name)==want,name
seen=set()
with tarfile.open(b/'corpus-overlay.tar.gz','r|gz')as archive:
 for member in archive:
  assert member.isfile()and member.name in m['overlayFiles']and member.name not in seen
  assert not Path(member.name).is_absolute()and '..'not in Path(member.name).parts
  seen.add(member.name);h=hashlib.sha256();f=archive.extractfile(member)
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
  assert h.hexdigest()==m['overlayFiles'][member.name],member.name
assert seen==set(m['overlayFiles'])
sources=json.loads((b/'analyzed-source-hashes.json').read_text())
assert all(sources[p]==h for p,h in m['overlayFiles'].items()if p in sources)
assert 'prices/US.json'in seen
assert all(f'analysis/{id}.json'not in seen for id in m['failedCacheIds'])
result={'status':'NOT','artifactsChecked':len(m['artifacts']),'overlayEntriesChecked':len(seen),'sourceBindings':len(sources),'failedCacheAnalysesExcluded':len(m['failedCacheIds']),'passed':True}
(r/'evidence/bundle-integrity.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
