"""Every overlay member matches its manifest hash and the analysed corpus bytes; no failed-cache analysis is installed."""
import hashlib,json,tarfile
from pathlib import Path
b=Path('/Users/miki/data/value-evolve/release-bundle-evolve-1');c=Path('/Users/miki/data/value-evolve/.audit/evolve-1/corpus');e=c.parent/'evidence'
m=json.loads((b/'manifest.json').read_text());seen=set()
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for name,want in m['artifacts'].items():assert digest(b/name)==want,name
with tarfile.open(b/'corpus-overlay.tar.gz')as t:
 for x in t:
  data=t.extractfile(x).read();h=hashlib.sha256(data).hexdigest()
  assert x.isfile() and m['overlayFiles'][x.name]==h==digest(c/x.name),x.name;seen.add(x.name)
assert seen==set(m['overlayFiles'])
failed=set(m['failedCacheIds']);assert not any(n.startswith('analysis/') and Path(n).stem in failed for n in seen)
res={'passed':True,'overlayMembers':len(seen),'artifacts':len(m['artifacts']),'failedCacheIdsExcluded':len(failed)}
(e/'bundle-integrity.json').write_text(json.dumps(res,indent=2)+'\n');print(res)
