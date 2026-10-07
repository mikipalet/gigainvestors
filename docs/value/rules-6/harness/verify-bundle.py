import hashlib,json,tarfile
from pathlib import Path
b=Path('/Users/miki/data/value-rules/release-bundle-rules-6');r=Path('/Users/miki/data/value-rules/.audit/rules-6');m=json.loads((b/'manifest.json').read_text())
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for x in iter(lambda:f.read(1024*1024),b''):h.update(x)
 return h.hexdigest()
for name,want in m['artifacts'].items():assert digest(b/name)==want,name
seen=set()
with tarfile.open(b/'corpus-overlay.tar.gz','r|gz')as archive:
 for f in archive:
  assert f.isfile()and f.name in m['overlayFiles']and f.name not in seen
  assert not Path(f.name).is_absolute()and '..'not in Path(f.name).parts
  seen.add(f.name);h=hashlib.sha256();stream=archive.extractfile(f)
  for block in iter(lambda:stream.read(1024*1024),b''):h.update(block)
  assert h.hexdigest()==m['overlayFiles'][f.name]
assert seen==set(m['overlayFiles'])
sources=json.loads((b/'analyzed-source-hashes.json').read_text())
assert all(sources[p]==v for p,v in m['overlayFiles'].items())
assert all(f'analysis/{id}.json'not in seen for id in m['failedCacheIds'])
proposals=json.loads((b/'proposed-buy-approvals.json').read_text());expected={x['path']:x['sha256']for row in proposals for x in row['sourceEvidence']['files']}
approval_seen=set()
with tarfile.open(b/'approval-source-evidence.tar.gz','r|gz')as archive:
 for f in archive:
  assert f.isfile()and f.name in expected and f.name not in approval_seen
  assert not Path(f.name).is_absolute()and '..'not in Path(f.name).parts
  assert hashlib.sha256(archive.extractfile(f).read()).hexdigest()==expected[f.name]
  approval_seen.add(f.name)
assert approval_seen==set(expected)
out={'approvalSourceFiles':len(approval_seen),'passed':True,'artifacts':len(m['artifacts']),'overlayFiles':len(seen),'sourceBindings':len(sources),'failedCacheIdsExcluded':len(m['failedCacheIds'])}
(r/'evidence/bundle-integrity.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
