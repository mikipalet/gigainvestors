"""Verify immutable source bindings and live publication bytes, excluding locks/hold."""
import hashlib,json,time
from pathlib import Path
r=Path('/Users/miki/data/regress/run2');b=Path('/Users/miki/data/regress/release-bundle');c=r/'corpus';live=Path('/Users/miki/value-corpus')
def digest(p):
 h=hashlib.sha256()
 with p.open('rb')as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
started=time.time();sources=json.loads((b/'analyzed-source-hashes.json').read_text());bad=[]
for rel,want in sources.items():
 if not(c/rel).is_file()or digest(c/rel)!=want:bad.append(rel)
base=json.loads((b/'archive-baseline.json').read_text());changed=[]
for rel,want in base['files'].items():
 if not(live/'publish-repo'/rel).is_file()or digest(live/'publish-repo'/rel)!=want:changed.append(rel)
result={'sourceBindings':len(sources),'sourceMismatches':bad,'liveArchiveFiles':len(base['files']),'liveArchiveMismatches':changed,'seconds':time.time()-started,'holdAndRunnerLock':'not opened or modified'}
(r/'evidence/input-integrity.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result));assert not bad and not changed
