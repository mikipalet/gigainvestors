from pathlib import Path
import tarfile,json,hashlib
b=Path('/Users/miki/data/value-rules/release-bundle-rules-5');r=Path('/Users/miki/data/value-rules/.audit/rules-5');e=r/'evidence';m=json.loads((b/'manifest.json').read_text())
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
for n,h in m['artifacts'].items():assert digest(b/n)==h,n
seen=set()
with tarfile.open(b/'corpus-overlay.tar.gz')as t:
 for member in t:
  assert member.isfile()and member.name in m['overlayFiles']
  h=hashlib.sha256(t.extractfile(member).read()).hexdigest();assert h==m['overlayFiles'][member.name];seen.add(member.name)
assert seen==set(m['overlayFiles']);assert json.loads((b/'approved-verdict-changes.json').read_text())==[]
assert m['approvalManifestSha256']==digest(b/'approved-verdict-changes.json')
receipt={'passed':True,'artifacts':len(m['artifacts']),'overlayMembers':len(seen),'approvedBuyChanges':0}
(e/'bundle-integrity.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
